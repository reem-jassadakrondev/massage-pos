// Therapist pay, worked out per therapist per day ("cell") so every shop rule composes:
//   pay = commission + guarantee top-up + tips − advances
// Each cell is a small ledger: due = what the day is worth now − what was paid against it.
// Work done after a payout is still owed, a bill voided after a payout becomes a debt,
// and daily, weekly and monthly pay cycles all read the same cells and never pay twice.

import { DAY, dateShort, startOfDay } from './format'

export const DEFAULT_PAY = {
  cycle: 'daily', // 'daily' | 'weekly' | 'monthly'
  guaranteeEnabled: true,
  guaranteeAmount: 600,
  tipMode: 'personal', // 'personal' | 'pooled'
  tipSplit: 'equal', // 'equal' | 'by_jobs' (pooled only)
  cashierSeesPay: false,
}

export const paySettings = (settings) => ({ ...DEFAULT_PAY, ...settings?.pay })

const pad = (value) => String(value).padStart(2, '0')
export const dayKey = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
export const dayFromKey = (key) => new Date(`${key}T00:00`)

const PAY_RULE_FIELDS = ['guaranteeEnabled', 'guaranteeAmount', 'tipMode', 'tipSplit']
const payRuleOf = (pay) => Object.fromEntries(PAY_RULE_FIELDS.map((field) => [field, pay[field]]))

/** The rules in force on a day. A day keeps the rules it was worked under, whatever changes later. */
export const payRuleFor = (db, day) =>
  (db.payRules ?? []).filter((rule) => rule.from <= day).reduce(
    (latest, rule) => (!latest || rule.from >= latest.from ? rule : latest),
    null,
  ) ?? paySettings(db.settings)

/**
 * The rule history after saving `pay`. New rules start today, or tomorrow once today's shift is
 * closed, so a closed day's figures never move. Returns the same history when no rule changed.
 */
export function withPayRule(db, pay, now = new Date()) {
  const today = dayKey(now)
  const closedToday = (db.shifts ?? []).some((shift) => shift.status === 'closed' && dayKey(shift.closedAt) === today)
  const from = closedToday ? dayKey(new Date(startOfDay(now).getTime() + DAY)) : today
  const history = db.payRules?.length ? db.payRules : [{ from: '', ...payRuleOf(paySettings(db.settings)) }]
  const current = payRuleFor({ ...db, payRules: history }, from)
  if (PAY_RULE_FIELDS.every((field) => current[field] === pay[field])) return history
  return [...history.filter((rule) => rule.from !== from), { from, ...payRuleOf(pay) }]
}

const paidByCell = (payouts = []) => {
  const paid = new Map()
  payouts.forEach((payout) => {
    payout.days.forEach(({ day, amount }) => {
      const key = `${payout.therapistId}|${day}`
      paid.set(key, (paid.get(key) ?? 0) + amount)
    })
  })
  return paid
}

/** Pay cells for [from, to). Includes every day a therapist worked, earned, or took an advance. */
export function payCells(db, from, to) {
  const inside = (value) => {
    const time = new Date(value).getTime()
    return time >= from.getTime() && time < to.getTime()
  }
  const paid = paidByCell(db.payouts)
  const cells = new Map()
  const cell = (therapistId, day) => {
    const key = `${therapistId}|${day}`
    if (!cells.has(key)) {
      cells.set(key, { key, therapistId, day, worked: false, jobs: 0, minutes: 0, revenue: 0, commission: 0, ownTips: 0, advance: 0 })
    }
    return cells.get(key)
  }

  db.attendance.filter((a) => inside(a.inAt)).forEach((a) => {
    cell(a.therapistId, dayKey(a.inAt)).worked = true
  })
  db.bookings
    .filter((b) => b.status === 'completed' && inside(b.start))
    .forEach((b) => {
      const c = cell(b.therapistId, dayKey(b.start))
      c.worked = true
      c.jobs += 1
      c.minutes += b.minutes
      c.revenue += b.net
      c.commission += b.commission
      c.ownTips += b.tip
    })
  db.advances.filter((a) => inside(a.time)).forEach((a) => {
    cell(a.therapistId, dayKey(a.time)).advance += a.amount
  })

  // A payment stands even if everything behind it was later voided.
  ;(db.payouts ?? []).forEach((payout) => {
    payout.days.filter(({ day }) => inside(dayFromKey(day))).forEach(({ day }) => cell(payout.therapistId, day))
  })

  const list = [...cells.values()]

  new Set(list.map((c) => c.day)).forEach((day) => {
    const rule = payRuleFor(db, day)
    const dayCells = list.filter((c) => c.day === day)

    if (rule.tipMode === 'pooled') {
      const pool = dayCells.reduce((total, c) => total + c.ownTips, 0)
      const workers = dayCells.filter((c) => c.worked)
      const totalJobs = workers.reduce((total, c) => total + c.jobs, 0)
      const weight = (c) => (rule.tipSplit === 'by_jobs' && totalJobs ? c.jobs : 1)
      const totalWeight = workers.reduce((total, c) => total + weight(c), 0)
      let given = 0
      dayCells.forEach((c) => {
        c.tips = c.worked && totalWeight ? Math.floor((pool * weight(c)) / totalWeight) : 0
        given += c.tips
      })
      // Rounding leftovers go to whoever carries the most weight, so the pool always balances.
      if (workers.length) workers.reduce((top, c) => (weight(c) > weight(top) ? c : top)).tips += pool - given
      dayCells.forEach((c) => (c.tipPool = pool))
    } else {
      dayCells.forEach((c) => (c.tips = c.ownTips))
    }

    dayCells.forEach((c) => {
      c.topUp = rule.guaranteeEnabled && c.worked ? Math.max(0, Number(rule.guaranteeAmount) - c.commission) : 0
      c.earned = c.commission + c.topUp + c.tips
      c.net = c.earned - c.advance
      c.paidAmount = paid.get(c.key) ?? 0
      c.due = c.net - c.paidAmount
    })
  })

  return list.sort((a, b) => a.day.localeCompare(b.day))
}

const rowFor = (therapist, cells) => {
  const mine = cells.filter((c) => c.therapistId === therapist.id)
  const sum = (pick) => mine.reduce((total, c) => total + pick(c), 0)
  const dues = mine.filter((c) => c.due !== 0).map((c) => ({ day: c.day, amount: c.due }))
  return {
    therapistId: therapist.id,
    name: therapist.name,
    days: mine.filter((c) => c.worked).length,
    jobs: sum((c) => c.jobs),
    minutes: sum((c) => c.minutes),
    revenue: sum((c) => c.revenue),
    commission: sum((c) => c.commission),
    topUp: sum((c) => c.topUp),
    tips: sum((c) => c.tips),
    advance: sum((c) => c.advance),
    earned: sum((c) => c.earned),
    net: sum((c) => c.net),
    unpaid: sum((c) => c.due),
    dues,
    paidTotal: sum((c) => c.paidAmount),
    cells: mine,
  }
}

/** Roll cells up to one row per therapist (in the therapists' own order). */
export const payRows = (cells, therapists) =>
  therapists.map((therapist) => rowFor(therapist, cells)).filter((row) => row.cells.length)

/** A pay period's rows, plus whatever is still unsettled from before it (`carry`). */
export function periodRows(db, therapists, from, to) {
  const period = payCells(db, from, to)
  const earlier = payCells(db, new Date(0), from).filter((c) => c.due !== 0)
  return therapists
    .map((therapist) => {
      const row = rowFor(therapist, period)
      const before = rowFor(therapist, earlier)
      return {
        ...row,
        carry: before.unpaid,
        unpaid: before.unpaid + row.unpaid,
        dues: [...before.dues, ...row.dues],
        hasEarlier: before.cells.length > 0,
      }
    })
    .filter((row) => row.cells.length || row.hasEarlier)
}

/** A row without its per-day cells — what a closed shift keeps as its snapshot. */
export const withoutCells = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'cells'))

export const sumRows = (rows, pick) => rows.reduce((total, row) => total + pick(row), 0)

/** The pay period that contains `anchor` for a given cycle. Weeks start on Monday. */
export function payPeriod(cycle, anchor = new Date()) {
  const day = startOfDay(anchor)
  if (cycle === 'monthly') {
    const from = new Date(day.getFullYear(), day.getMonth(), 1)
    const to = new Date(day.getFullYear(), day.getMonth() + 1, 1)
    return { from, to, label: from.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) }
  }
  if (cycle === 'weekly') {
    const from = new Date(day.getTime() - ((day.getDay() + 6) % 7) * DAY)
    const to = new Date(from.getTime() + 7 * DAY)
    return { from, to, label: `${dateShort(from)} – ${dateShort(new Date(to.getTime() - DAY))}` }
  }
  return { from: day, to: new Date(day.getTime() + DAY), label: day.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' }) }
}

export const shiftPayPeriod = (cycle, anchor, steps) => {
  const { from } = payPeriod(cycle, anchor)
  if (cycle === 'monthly') return new Date(from.getFullYear(), from.getMonth() + steps, 1)
  return new Date(from.getTime() + steps * (cycle === 'weekly' ? 7 : 1) * DAY)
}

export const CYCLE_LABEL = { daily: 'รายวัน', weekly: 'รายสัปดาห์', monthly: 'รายเดือน' }

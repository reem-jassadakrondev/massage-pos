// Therapist pay, worked out per therapist per day ("cell") so every shop rule composes:
//   pay = commission + guarantee top-up + tips − advances
// A cell is paid once a payout record lists that day for that therapist, so daily,
// weekly and monthly pay cycles all read from the same cells and never pay twice.

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

const paidSet = (payouts = []) => new Set(payouts.flatMap((p) => p.days.map((day) => `${p.therapistId}|${day}`)))

/** Pay cells for [from, to). Includes every day a therapist worked, earned, or took an advance. */
export function payCells(db, from, to) {
  const pay = paySettings(db.settings)
  const inside = (value) => {
    const time = new Date(value).getTime()
    return time >= from.getTime() && time < to.getTime()
  }
  const paid = paidSet(db.payouts)
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

  const list = [...cells.values()]

  if (pay.tipMode === 'pooled') {
    const days = [...new Set(list.map((c) => c.day))]
    days.forEach((day) => {
      const dayCells = list.filter((c) => c.day === day)
      const pool = dayCells.reduce((total, c) => total + c.ownTips, 0)
      const workers = dayCells.filter((c) => c.worked)
      const totalJobs = workers.reduce((total, c) => total + c.jobs, 0)
      const weight = (c) => (pay.tipSplit === 'by_jobs' && totalJobs ? c.jobs : 1)
      const totalWeight = workers.reduce((total, c) => total + weight(c), 0)
      let given = 0
      dayCells.forEach((c) => {
        c.tips = c.worked && totalWeight ? Math.floor((pool * weight(c)) / totalWeight) : 0
        given += c.tips
      })
      // Hand the leftover satang-rounding baht to the first worker so the pool always balances.
      if (workers.length) workers[0].tips += pool - given
      dayCells.forEach((c) => (c.tipPool = pool))
    })
  } else {
    list.forEach((c) => (c.tips = c.ownTips))
  }

  list.forEach((c) => {
    c.topUp = pay.guaranteeEnabled && c.worked ? Math.max(0, Number(pay.guaranteeAmount) - c.commission) : 0
    c.earned = c.commission + c.topUp + c.tips
    c.net = c.earned - c.advance
    c.paid = paid.has(c.key)
  })

  return list.sort((a, b) => a.day.localeCompare(b.day))
}

/** Roll cells up to one row per therapist (in the therapists' own order). */
export function payRows(cells, therapists) {
  return therapists
    .map((therapist) => {
      const mine = cells.filter((c) => c.therapistId === therapist.id)
      const sum = (pick, only = mine) => only.reduce((total, c) => total + pick(c), 0)
      const unpaidCells = mine.filter((c) => !c.paid)
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
        unpaid: sum((c) => c.net, unpaidCells),
        unpaidDays: unpaidCells.map((c) => c.day),
        paidTotal: sum((c) => c.net, mine.filter((c) => c.paid)),
        cells: mine,
      }
    })
    .filter((row) => row.cells.length)
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

import { describe, expect, it } from 'vitest'
import { DEFAULT_PAY, dayKey, payCells, payPeriod, periodRows, payRows, withPayRule } from '../payroll'

const DAY_ONE = new Date('2026-10-12T00:00')
const DAY_TWO = new Date('2026-10-13T00:00')
const END = new Date('2026-10-20T00:00')
const at = (day, hour) => new Date(day.getTime() + hour * 3600000).toISOString()
const therapists = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]

const job = (id, therapistId, day, hour, commission, extra = {}) => ({
  id, therapistId, status: 'completed', start: at(day, hour), minutes: 60, net: 300, commission, tip: 0, ...extra,
})
const shop = (pay = {}, extra = {}) => ({
  settings: { pay: { ...DEFAULT_PAY, ...pay } },
  bookings: [],
  attendance: [],
  advances: [],
  payouts: [],
  shifts: [],
  ...extra,
})
const rowOf = (db, id = 'a') => payRows(payCells(db, new Date(0), END), therapists).find((r) => r.therapistId === id)
const pay = (db, id, row) => db.payouts.push({ therapistId: id, days: row.dues, amount: row.unpaid })

describe('guarantee', () => {
  const db = shop({}, {
    attendance: [{ therapistId: 'a', inAt: at(DAY_ONE, 9) }, { therapistId: 'b', inAt: at(DAY_ONE, 9) }, { therapistId: 'c', inAt: at(DAY_ONE, 9) }],
    bookings: [job('1', 'a', DAY_ONE, 10, 240), job('2', 'b', DAY_ONE, 11, 920)],
  })

  it('tops up a slow day to the guaranteed amount', () => {
    expect(rowOf(db, 'a')).toMatchObject({ commission: 240, topUp: 360, earned: 600 })
  })
  it('pays normal commission when the day beats the guarantee', () => {
    expect(rowOf(db, 'b')).toMatchObject({ commission: 920, topUp: 0, earned: 920 })
  })
  it('still guarantees a therapist who came in and got no customers', () => {
    expect(rowOf(db, 'c')).toMatchObject({ jobs: 0, topUp: 600 })
  })
  it('does not count tips toward the guarantee', () => {
    const tipped = shop({}, { bookings: [job('1', 'a', DAY_ONE, 10, 240, { tip: 100 })] })
    expect(rowOf(tipped)).toMatchObject({ topUp: 360, earned: 700 })
  })
})

describe('paying during the day', () => {
  it('still owes work done after a mid-day payout', () => {
    const db = shop({ guaranteeEnabled: false }, { bookings: [job('1', 'a', DAY_ONE, 10, 200)] })
    pay(db, 'a', rowOf(db))
    db.bookings.push(job('2', 'a', DAY_ONE, 18, 300))
    expect(rowOf(db)).toMatchObject({ net: 500, paidTotal: 200, unpaid: 300 })
  })

  it('counts a later job against the guarantee already paid', () => {
    const db = shop({}, { bookings: [job('1', 'a', DAY_ONE, 10, 240)] })
    pay(db, 'a', rowOf(db)) // paid 600
    db.bookings.push(job('2', 'a', DAY_ONE, 15, 120))
    expect(rowOf(db).unpaid).toBe(0) // 360 commission is still under the 600 already paid
    db.bookings.push(job('3', 'a', DAY_ONE, 18, 540))
    expect(rowOf(db).unpaid).toBe(300) // 900 commission − 600 paid
  })

  it('never pays the same money twice', () => {
    const db = shop({ guaranteeEnabled: false }, { bookings: [job('1', 'a', DAY_ONE, 10, 200)] })
    pay(db, 'a', rowOf(db))
    expect(rowOf(db)).toMatchObject({ unpaid: 0, dues: [] })
  })

  it('shows money owed to the shop when a paid bill is voided', () => {
    const db = shop({ guaranteeEnabled: false }, { bookings: [job('1', 'a', DAY_ONE, 10, 200)] })
    pay(db, 'a', rowOf(db))
    db.bookings[0].status = 'void'
    expect(rowOf(db).unpaid).toBe(-200)
  })

  it('takes that debt off the next payment', () => {
    const db = shop({ guaranteeEnabled: false }, { bookings: [job('1', 'a', DAY_ONE, 10, 200)] })
    pay(db, 'a', rowOf(db))
    db.bookings[0].status = 'void'
    db.bookings.push(job('2', 'a', DAY_TWO, 10, 500))
    const row = rowOf(db)
    expect(row.unpaid).toBe(300)
    pay(db, 'a', row)
    expect(rowOf(db)).toMatchObject({ unpaid: 0, dues: [] })
  })
})

describe('tips', () => {
  const bookings = [
    job('1', 'a', DAY_ONE, 10, 120, { tip: 100 }),
    job('2', 'a', DAY_ONE, 12, 120),
    job('3', 'b', DAY_ONE, 11, 120, { tip: 21 }),
    job('4', 'b', DAY_ONE, 13, 400),
    job('5', 'b', DAY_ONE, 15, 400),
  ]
  const attendance = [{ therapistId: 'c', inAt: at(DAY_ONE, 9) }]

  it('keeps tips with the therapist by default', () => {
    expect(rowOf(shop({}, { bookings, attendance }), 'b').tips).toBe(21)
  })
  it('splits a pool evenly among everyone who worked, losing no baht', () => {
    const db = shop({ tipMode: 'pooled', tipSplit: 'equal' }, { bookings, attendance })
    const tips = ['a', 'b', 'c'].map((id) => rowOf(db, id).tips)
    expect(tips.reduce((total, tip) => total + tip, 0)).toBe(121)
    expect(Math.max(...tips) - Math.min(...tips)).toBeLessThanOrEqual(1)
  })
  it('can split a pool by jobs done', () => {
    const db = shop({ tipMode: 'pooled', tipSplit: 'by_jobs' }, { bookings, attendance })
    expect(rowOf(db, 'c').tips).toBe(0)
    expect(rowOf(db, 'a').tips + rowOf(db, 'b').tips).toBe(121)
  })
})

describe('changing the rules', () => {
  const before = shop({}, { bookings: [job('1', 'a', DAY_ONE, 10, 240)] })

  it('does not rewrite days that already happened', () => {
    const payRules = withPayRule(before, { ...DEFAULT_PAY, guaranteeAmount: 1000 }, DAY_TWO)
    const db = { ...before, payRules, settings: { pay: { ...DEFAULT_PAY, guaranteeAmount: 1000 } } }
    expect(rowOf(db).topUp).toBe(360)
  })
  it('applies to the day it was changed', () => {
    const payRules = withPayRule(before, { ...DEFAULT_PAY, guaranteeAmount: 1000 }, DAY_ONE)
    const db = { ...before, payRules, settings: { pay: { ...DEFAULT_PAY, guaranteeAmount: 1000 } } }
    expect(rowOf(db).topUp).toBe(760)
  })
  it('waits for tomorrow once today is closed', () => {
    const closed = { ...before, shifts: [{ status: 'closed', closedAt: at(DAY_ONE, 23) }] }
    const payRules = withPayRule(closed, { ...DEFAULT_PAY, guaranteeAmount: 1000 }, new Date(at(DAY_ONE, 23.5)))
    expect(payRules.at(-1).from).toBe(dayKey(DAY_TWO))
    expect(rowOf({ ...closed, payRules }).topUp).toBe(360)
  })
  it('ignores a save that changes no pay rule', () => {
    const payRules = withPayRule(before, { ...DEFAULT_PAY, cycle: 'weekly', cashierSeesPay: true }, DAY_TWO)
    expect(payRules).toHaveLength(1)
  })
})

describe('pay periods', () => {
  it('starts weeks on Monday and months on the 1st', () => {
    expect(payPeriod('weekly', new Date('2026-10-15T12:00')).from.getDay()).toBe(1)
    expect(payPeriod('monthly', new Date('2026-10-15T12:00')).from.getDate()).toBe(1)
  })
  it('carries an unsettled balance into the next period', () => {
    const db = shop({ guaranteeEnabled: false, cycle: 'weekly' }, {
      bookings: [job('1', 'a', new Date('2026-10-05T00:00'), 10, 200), job('2', 'a', DAY_ONE, 10, 500)],
    })
    const { from, to } = payPeriod('weekly', DAY_ONE)
    const [row] = periodRows(db, therapists, from, to)
    expect(row).toMatchObject({ commission: 500, carry: 200, unpaid: 700 })
    expect(row.dues).toHaveLength(2)
  })
  it('lists a therapist who only has a balance from before', () => {
    const db = shop({ guaranteeEnabled: false }, { bookings: [job('1', 'b', new Date('2026-10-05T00:00'), 10, 200)] })
    const { from, to } = payPeriod('weekly', DAY_ONE)
    expect(periodRows(db, therapists, from, to)[0]).toMatchObject({ therapistId: 'b', jobs: 0, carry: 200, unpaid: 200 })
  })
})

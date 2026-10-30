import { describe, expect, it } from 'vitest'
import { createSeed } from '../../data/seed'
import { billTotals, commissionFor, priceFor } from '../pricing'
import { payCells, payRows } from '../payroll'
import { promptPayPayload } from '../promptpay'
import { expectedCash, summarize, therapistQueue } from '../selectors'

const crc = (text) => {
  let value = 0xffff
  for (const char of text) {
    value ^= char.charCodeAt(0) << 8
    for (let bit = 0; bit < 8; bit += 1) value = (value & 0x8000 ? (value << 1) ^ 0x1021 : value << 1) & 0xffff
  }
  return value.toString(16).toUpperCase().padStart(4, '0')
}

describe('pricing', () => {
  const twoHours = { price: 550, duration_minutes: 120, therapist_commission: 230 }

  it('charges the package price for the package time', () => {
    expect(priceFor(twoHours, 120)).toBe(550)
  })
  it('rounds extensions to whole baht', () => {
    expect(priceFor(twoHours, 150)).toBe(688)
  })
  it('scales commission with time massaged', () => {
    expect(commissionFor(twoHours, 60)).toBe(115)
  })
  it('adds discount and tip into the bill', () => {
    expect(billTotals(300, { type: 'percent', value: 10 }, 50)).toMatchObject({ discount: 30, net: 270, total: 320 })
  })
  it('never discounts below zero', () => {
    expect(billTotals(300, { type: 'baht', value: 500 }, 0).net).toBe(0)
  })
})

describe('drawer and profit', () => {
  const bookings = [
    { status: 'completed', net: 300, commission: 120, payCash: 350, payQr: 0, tip: 50, discountBaht: 0, minutes: 60 },
    { status: 'completed', net: 500, commission: 200, payCash: 0, payQr: 500, tip: 0, discountBaht: 0, minutes: 60 },
    { status: 'void', net: 900, commission: 300, payCash: 900, payQr: 0, tip: 0, discountBaht: 0, minutes: 60 },
  ]
  const summary = summarize({
    bookings,
    expenses: [{ amount: 40 }],
    advances: [{ amount: 200 }],
    payouts: [{ amount: 100 }],
    topUp: 60,
  })

  it('ignores voided bills', () => {
    expect(summary).toMatchObject({ bills: 2, voided: 1, revenue: 800, cash: 350 })
  })
  it('takes the guarantee top-up out of profit, but not tips', () => {
    expect(summary.profit).toBe(800 - 320 - 60 - 40)
  })
  it('works out the cash that should be in the drawer', () => {
    expect(expectedCash(1000, summary, 250)).toBe(1000 + 350 - 40 - 200 - 100 - 250)
  })
})

describe('PromptPay QR', () => {
  const payload = promptPayPayload('0812345678', 350)

  it('embeds the phone number and amount', () => {
    expect(payload).toContain('01130066812345678')
    expect(payload).toContain('5406350.00')
  })
  it('ends with a valid checksum', () => {
    expect(payload.slice(-4)).toBe(crc(payload.slice(0, -4)))
  })
})

describe('demo data', () => {
  const db = createSeed(new Date('2026-10-19T15:20'))

  it('starts with the expected queue', () => {
    expect(therapistQueue(db.therapists, db.bookings).map((t) => t.id)).toEqual(['t3', 't5'])
  })
  it('keeps every closed drawer consistent', () => {
    const closed = db.shifts.filter((s) => s.status === 'closed')
    expect(closed).toHaveLength(29)
    closed.forEach((s) => expect(s.countedCash - s.expectedCash).toBe(s.difference))
  })
  it('allocates each payout exactly to its days', () => {
    db.payouts.forEach((p) => {
      expect(p.days.reduce((total, d) => total + d.amount, 0)).toBe(p.amount)
    })
  })
  it('leaves past days settled unless the therapist owes the shop', () => {
    const rows = payRows(payCells(db, new Date(0), new Date('2026-10-19T00:00')), db.therapists)
    rows.forEach((r) => expect(r.unpaid).toBeLessThanOrEqual(0))
  })
})

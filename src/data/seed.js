// Demo data, built relative to "now" so every demo opens on a believable, busy shop:
// an open shift for today, two rooms in use (one about to finish), upcoming reservations,
// and 30 days of closed shifts behind it for reports and charts.

import { DAY, addMinutes, startOfDay } from '../lib/format'
import { billTotals, commissionFor, priceFor } from '../lib/pricing'
import { DEFAULT_PAY, payCells, payRows, withoutCells } from '../lib/payroll'
import { expectedCash, summarize } from '../lib/selectors'

export const STORAGE_KEY = 'massage-pos-demo'
export const DATA_VERSION = 4

const services = [
  { id: 's1', title: 'นวดแผนไทย', duration_minutes: 60, price: 300, therapist_commission: 120 },
  { id: 's2', title: 'นวดแผนไทย (2 ชม.)', duration_minutes: 120, price: 550, therapist_commission: 230 },
  { id: 's3', title: 'นวดฝ่าเท้า', duration_minutes: 60, price: 300, therapist_commission: 120 },
  { id: 's4', title: 'นวดน้ำมันอโรม่า', duration_minutes: 90, price: 650, therapist_commission: 260 },
  { id: 's5', title: 'นวดคอ บ่า ไหล่', duration_minutes: 30, price: 200, therapist_commission: 80 },
  { id: 's6', title: 'นวดประคบสมุนไพร', duration_minutes: 90, price: 600, therapist_commission: 240 },
]

const rooms = [
  { id: 'r1', room_name: 'เตียงเท้า 1', type: 'foot' },
  { id: 'r2', room_name: 'เตียงเท้า 2', type: 'foot' },
  { id: 'r3', room_name: 'ห้องนวดไทย 1', type: 'body' },
  { id: 'r4', room_name: 'ห้องนวดไทย 2', type: 'body' },
  { id: 'r5', room_name: 'ห้องนวดไทย 3', type: 'body' },
  { id: 'r6', room_name: 'ห้อง VIP', type: 'vip' },
]

const baseTherapists = [
  { id: 't1', name: 'ป้าพร', nickname: 'พร', color: 'rose' },
  { id: 't2', name: 'พี่น้อย', nickname: 'น้อย', color: 'sky' },
  { id: 't3', name: 'หมอแดง', nickname: 'แดง', color: 'amber' },
  { id: 't4', name: 'หมอนก', nickname: 'นก', color: 'violet' },
  { id: 't5', name: 'หมอเอ๋', nickname: 'เอ๋', color: 'teal' },
]

const customers = [
  ['c1', 'คุณสมศรี', '0812345671'], ['c2', 'คุณวิภา', '0898765432'], ['c3', 'คุณมานพ', '0861112233'],
  ['c4', 'คุณเกศินี', '0854443322'], ['c5', 'คุณสมชาย', '0827778899'], ['c6', 'คุณดวงใจ', '0835556677'],
  ['c7', 'คุณลัดดา', '0841239876'], ['c8', 'คุณประเสริฐ', '0873334455'], ['c9', 'คุณจันทร์เพ็ญ', '0919998877'],
  ['c10', 'คุณบุญมี', '0926665544'], ['c11', 'คุณอรุณี', '0932221100'], ['c12', 'คุณวีระ', '0947773311'],
].map(([id, name, phone]) => ({ id, name, phone }))

const expensePool = [
  ['ซื้อน้ำแข็ง', 40, 'วัสดุ-อุปกรณ์'], ['น้ำดื่มลูกค้า', 120, 'วัสดุ-อุปกรณ์'], ['น้ำยาทำความสะอาด', 95, 'ทำความสะอาด'],
  ['ซักผ้าขนหนู', 180, 'ทำความสะอาด'], ['ซื้อน้ำมันนวด', 350, 'วัสดุ-อุปกรณ์'], ['ข้าวกลางวันพนักงาน', 250, 'สวัสดิการ'],
  ['ลูกประคบสมุนไพร', 300, 'วัสดุ-อุปกรณ์'], ['ค่าน้ำแข็ง+ถุง', 60, 'วัสดุ-อุปกรณ์'],
]

// Small seeded random so a reset always produces the same demo story.
const createRandom = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const roundTo = (date, minutes) => {
  const step = minutes * 60000
  return new Date(Math.round(date.getTime() / step) * step)
}

const iso = (date) => new Date(date).toISOString()

const makeBooking = ({ id, start, service, minutes, therapistId, roomId, customer, shiftId, requested = false }) => ({
  id,
  customerId: customer?.id ?? null,
  customerName: customer?.name ?? 'ลูกค้าทั่วไป',
  customerPhone: customer?.phone ?? '',
  therapistId,
  serviceId: service.id,
  roomId,
  status: 'active',
  requested,
  start: iso(start),
  end: iso(addMinutes(start, minutes)),
  minutes,
  price: priceFor(service, minutes),
  commission: commissionFor(service, minutes),
  shiftId,
  reservationId: null,
})

const pay = (booking, { method, discount = { type: 'none', value: 0 }, tip = 0, paidAt }) => {
  const totals = billTotals(booking.price, discount, tip)
  const received = method === 'cash' ? Math.ceil(totals.total / 100) * 100 : 0
  return {
    ...booking,
    status: 'completed',
    discount,
    discountBaht: totals.discount,
    tip: totals.tip,
    net: totals.net,
    total: totals.total,
    payCash: method === 'cash' ? totals.total : 0,
    payQr: method === 'qr' ? totals.total : 0,
    received,
    paidAt: iso(paidAt),
  }
}

export const createSeed = (now = new Date()) => {
  const random = createRandom(20261019)
  const pick = (items) => items[Math.floor(random() * items.length)]
  const today = startOfDay(now)

  const bookings = []
  const expenses = []
  const advances = []
  const shifts = []
  const attendance = []
  const payouts = []
  const settings = {
    shopName: 'สบายดี นวดแผนไทย',
    promptPayId: '0812345678',
    ownerPin: '1234',
    openHour: 10,
    closeHour: 24,
    pay: { ...DEFAULT_PAY },
  }

  const randomBill = () => ({
    method: random() < 0.6 ? 'cash' : 'qr',
    discount: random() < 0.1 ? pick([{ type: 'percent', value: 10 }, { type: 'baht', value: 50 }]) : { type: 'none', value: 0 },
    tip: random() < 0.3 ? pick([20, 50, 100]) : 0,
  })

  // --- 29 past days, each one a closed shift ------------------------------------------
  for (let daysAgo = 29; daysAgo >= 1; daysAgo -= 1) {
    const day = new Date(today.getTime() - daysAgo * DAY)
    const shiftId = `sh${daysAgo}`
    const openedAt = addMinutes(day, 10 * 60 - Math.floor(random() * 20))
    const closedAt = addMinutes(day, 22 * 60 + 30 + Math.floor(random() * 30))
    const weekend = [0, 6].includes(day.getDay())
    const count = (weekend ? 13 : 8) + Math.floor(random() * 6)

    for (let i = 0; i < count; i += 1) {
      const service = random() < 0.35 ? services[0] : pick(services)
      const minutes = service.duration_minutes + (random() < 0.15 ? 30 : 0)
      // Busier in the evening: bias start times toward 17:00–20:00.
      const hour = random() < 0.55 ? 17 + Math.floor(random() * 4) : 10 + Math.floor(random() * 7)
      const start = addMinutes(day, hour * 60 + Math.floor(random() * 4) * 15)
      const booking = makeBooking({
        id: `h${daysAgo}-${i}`,
        start,
        service,
        minutes,
        therapistId: pick(['t1', 't2', 't3', 't3', 't4', 't5', 't5']),
        roomId: pick(rooms).id,
        customer: random() < 0.45 ? pick(customers) : null,
        shiftId,
        requested: random() < 0.25,
      })
      bookings.push(pay(booking, { ...randomBill(), paidAt: addMinutes(start, minutes) }))
    }

    if (random() < 0.2) {
      const target = bookings[bookings.length - 1]
      Object.assign(target, {
        status: 'void',
        voidReason: pick(['ลูกค้ายกเลิก', 'เปิดผิดห้อง/ผิดคน']),
        voidedAt: target.paidAt,
        voidedBy: 'เจ้าของร้าน',
      })
    }

    const expenseCount = 1 + Math.floor(random() * 3)
    for (let i = 0; i < expenseCount; i += 1) {
      const [title, amount, category] = pick(expensePool)
      expenses.push({ id: `he${daysAgo}-${i}`, title, amount, category, time: iso(addMinutes(openedAt, 60 + i * 120)), shiftId })
    }

    if (random() < 0.25) {
      advances.push({
        id: `ha${daysAgo}`,
        therapistId: pick(['t1', 't2', 't3', 't5']),
        amount: pick([100, 200, 300]),
        note: 'เบิกล่วงหน้า',
        time: iso(addMinutes(openedAt, 180)),
        shiftId,
        by: 'แคชเชียร์',
      })
    }

    // Everyone with customers clocked in; หมอนก sometimes came in and got none (guarantee day).
    const worked = new Set(bookings.filter((b) => b.shiftId === shiftId).map((b) => b.therapistId))
    if (random() < 0.5) worked.add('t4')
    worked.forEach((therapistId) => {
      attendance.push({ id: `at${daysAgo}-${therapistId}`, therapistId, inAt: iso(addMinutes(openedAt, 5)), outAt: iso(closedAt) })
    })

    // Daily pay cycle: at close, pay everyone what they are owed up to today.
    const sheet = { settings, bookings, attendance, advances, payouts }
    const dayEnd = new Date(day.getTime() + DAY)
    const rows = payRows(payCells(sheet, new Date(0), dayEnd).filter((c) => !c.paid), baseTherapists)
    const topUp = payCells(sheet, day, dayEnd).reduce((total, c) => total + c.topUp, 0)
    const paying = rows.filter((r) => r.unpaid > 0)
    const payoutsPaid = paying.reduce((total, r) => total + r.unpaid, 0)
    paying.forEach((r) => {
      payouts.push({ id: `hp${daysAgo}-${r.therapistId}`, therapistId: r.therapistId, days: r.unpaidDays, amount: r.unpaid, paidAt: iso(closedAt), shiftId, by: 'แคชเชียร์ (ปิดรอบ)' })
    })

    const summary = summarize({
      bookings: bookings.filter((b) => b.shiftId === shiftId),
      expenses: expenses.filter((e) => e.shiftId === shiftId),
      advances: advances.filter((a) => a.shiftId === shiftId),
      topUp,
    })
    const expected = expectedCash(1000, summary, payoutsPaid)
    const difference = random() < 0.15 ? pick([-20, -50, 10]) : 0

    shifts.push({
      id: shiftId,
      status: 'closed',
      openedAt: iso(openedAt),
      closedAt: iso(closedAt),
      openingCash: 1000,
      summary,
      payouts: rows.map((row) => ({ ...withoutCells(row), paid: row.unpaid > 0 })),
      payoutsPaid,
      expectedCash: expected,
      countedCash: expected + difference,
      difference,
      note: difference ? 'นับเงินทอนผิด' : '',
    })
  }

  // --- Today: shift opened ~5 hours ago -------------------------------------------------
  const shiftId = 'sh-today'
  const openedAt = new Date(Math.max(today.getTime(), now.getTime() - 5 * 3600000))
  shifts.push({ id: shiftId, status: 'open', openedAt: iso(openedAt), openingCash: 1000 })

  const onDuty = ['t1', 't2', 't3', 't5']
  onDuty.forEach((therapistId, index) => {
    attendance.push({
      id: `at-${therapistId}`,
      therapistId,
      inAt: iso(addMinutes(openedAt, [0, 5, 10, 15][index])),
      outAt: null,
    })
  })

  const todayJobs = [
    ['t3', 's1', 'r5', 'c7', 'cash', 0],
    ['t5', 's3', 'r1', null, 'qr', 50],
    ['t2', 's4', 'r6', 'c2', 'qr', 100],
    ['t1', 's1', 'r4', null, 'cash', 0],
    ['t3', 's5', 'r2', 'c10', 'cash', 20],
    ['t5', 's1', 'r5', null, 'cash', 0],
  ]
  todayJobs.forEach(([therapistId, serviceId, roomId, customerId, method, tip], index) => {
    const service = services.find((s) => s.id === serviceId)
    const start = roundTo(new Date(now.getTime() - (75 + index * 40) * 60000), 5)
    if (start < openedAt) return
    const booking = makeBooking({
      id: `bt${index}`,
      start,
      service,
      minutes: service.duration_minutes,
      therapistId,
      roomId,
      customer: customers.find((c) => c.id === customerId),
      shiftId,
      requested: index === 2,
    })
    const paidAt = new Date(Math.min(addMinutes(start, service.duration_minutes).getTime(), now.getTime() - 5 * 60000))
    bookings.push(pay(booking, { method, tip, paidAt }))
  })

  // Two rooms in use right now — one is nearly done to show the red warning.
  bookings.push(
    makeBooking({
      id: 'ba1',
      start: roundTo(new Date(now.getTime() - 110 * 60000), 1),
      service: services[1],
      minutes: 120,
      therapistId: 't1',
      roomId: 'r3',
      customer: customers[6],
      shiftId,
    }),
    makeBooking({
      id: 'ba2',
      start: roundTo(new Date(now.getTime() - 30 * 60000), 1),
      service: services[3],
      minutes: 90,
      therapistId: 't2',
      roomId: 'r4',
      customer: null,
      shiftId,
    }),
  )

  expenses.push(
    { id: 'et1', title: 'ซื้อน้ำแข็ง', amount: 40, category: 'วัสดุ-อุปกรณ์', time: iso(addMinutes(openedAt, 30)), shiftId },
    { id: 'et2', title: 'น้ำยาทำความสะอาด', amount: 120, category: 'ทำความสะอาด', time: iso(addMinutes(openedAt, 95)), shiftId },
  )
  advances.push({ id: 'at1', therapistId: 't5', amount: 200, note: 'ค่ารถ', time: iso(addMinutes(openedAt, 60)), shiftId, by: 'แคชเชียร์' })

  const therapists = baseTherapists.map((t) => ({
    ...t,
    onDuty: onDuty.includes(t.id),
    queueOrder: { t3: 1, t5: 2, t1: 3, t2: 4, t4: 5 }[t.id],
  }))

  const soon = roundTo(new Date(now.getTime() + 20 * 60000), 5)
  const tomorrow = new Date(today.getTime() + DAY)
  const reservation = (id, customer, start, therapistId, serviceId, extra = {}) => {
    const service = services.find((s) => s.id === serviceId)
    return {
      id,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      start: iso(start),
      minutes: service.duration_minutes,
      serviceId,
      therapistId,
      roomId: null,
      note: '',
      status: 'booked',
      createdAt: iso(addMinutes(now, -600)),
      ...extra,
    }
  }

  const reservations = [
    reservation('rv1', customers[0], soon, 't3', 's1', { note: 'ขอนวดเบาๆ ปวดหลัง' }),
    reservation('rv2', customers[1], roundTo(addMinutes(now, 120), 30), null, 's4'),
    reservation('rv3', customers[2], roundTo(addMinutes(now, 210), 30), 't5', 's2', { roomId: 'r6' }),
    reservation('rv4', customers[3], roundTo(addMinutes(now, -90), 30), 't1', 's1', { status: 'no_show' }),
    reservation('rv5', customers[4], addMinutes(tomorrow, 11 * 60), 't1', 's1'),
    reservation('rv6', customers[5], addMinutes(tomorrow, 15 * 60), 't3', 's6', { note: 'มา 2 คน' }),
  ]

  return {
    version: DATA_VERSION,
    seededAt: iso(now),
    settings,
    services,
    rooms,
    therapists,
    customers,
    bookings,
    reservations,
    expenses,
    advances,
    attendance,
    payouts,
    shifts,
  }
}

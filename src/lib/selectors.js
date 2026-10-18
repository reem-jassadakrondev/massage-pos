import { minutesBetween, startOfDay, timeHM } from './format'

const sum = (items, pick) => items.reduce((total, item) => total + (Number(pick(item)) || 0), 0)

export const byId = (items) => Object.fromEntries(items.map((item) => [item.id, item]))

export const activeBookings = (bookings) => bookings.filter((booking) => booking.status === 'active')
export const paidBookings = (bookings) => bookings.filter((booking) => booking.status === 'completed')

export const busyTherapistIds = (bookings) => new Set(activeBookings(bookings).map((booking) => booking.therapistId))

export const therapistStatus = (therapist, bookings) => {
  if (activeBookings(bookings).some((booking) => booking.therapistId === therapist.id)) return 'busy'
  return therapist.onDuty ? 'available' : 'off'
}

/** Rotation queue: on-duty, not busy, ordered by queueOrder (lowest = next). */
export const therapistQueue = (therapists, bookings) => {
  const busy = busyTherapistIds(bookings)
  return therapists
    .filter((therapist) => therapist.onDuty && !busy.has(therapist.id))
    .sort((a, b) => a.queueOrder - b.queueOrder)
}

/**
 * Money summary for any set of bookings / expenses / advances / payouts.
 * Tips pass through to therapists; `topUp` is what the shop added to meet the daily guarantee.
 */
export const summarize = ({ bookings = [], expenses = [], advances = [], payouts = [], topUp = 0 }) => {
  const paid = paidBookings(bookings)
  const revenue = sum(paid, (b) => b.net)
  const commission = sum(paid, (b) => b.commission)
  const expenseTotal = sum(expenses, (e) => e.amount)

  return {
    bills: paid.length,
    voided: bookings.filter((b) => b.status === 'void').length,
    revenue,
    cash: sum(paid, (b) => b.payCash),
    qr: sum(paid, (b) => b.payQr),
    tips: sum(paid, (b) => b.tip),
    discount: sum(paid, (b) => b.discountBaht),
    commission,
    topUp,
    expenseTotal,
    advanceTotal: sum(advances, (a) => a.amount),
    payoutTotal: sum(payouts, (p) => p.amount),
    profit: revenue - commission - topUp - expenseTotal,
    averageBill: paid.length ? revenue / paid.length : 0,
    minutes: sum(paid, (b) => b.minutes),
  }
}

export const shiftRecords = (db, shiftId) => ({
  bookings: db.bookings.filter((b) => b.shiftId === shiftId),
  expenses: db.expenses.filter((e) => e.shiftId === shiftId),
  advances: db.advances.filter((a) => a.shiftId === shiftId),
  payouts: (db.payouts ?? []).filter((p) => p.shiftId === shiftId),
})

/** Cash that should be in the drawer. Expenses, advances and therapist pay all leave from the drawer. */
export const expectedCash = (openingCash, summary, payingNow = 0) =>
  Number(openingCash) + summary.cash - summary.expenseTotal - summary.advanceTotal - summary.payoutTotal - payingNow

export const inRange = (value, from, to) => {
  const time = new Date(value).getTime()
  return time >= from.getTime() && time < to.getTime()
}

export const periodRange = (period, now = new Date()) => {
  const end = new Date(startOfDay(now).getTime() + 24 * 3600000)
  const days = period === 'month' ? 30 : period === 'week' ? 7 : 1
  return { from: new Date(end.getTime() - days * 24 * 3600000), to: end, days }
}

export const overlaps = (aStart, aEnd, bStart, bEnd) =>
  new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd)

export const reservationEnd = (reservation) =>
  new Date(new Date(reservation.start).getTime() + reservation.minutes * 60000)

/**
 * Anything already holding this therapist or room during [start, end).
 * Returns readable Thai messages, empty when the slot is free.
 */
export const findConflicts = (db, { start, end, therapistId, roomId, ignoreReservationId }) => {
  const therapists = byId(db.therapists)
  const rooms = byId(db.rooms)
  const messages = []

  db.reservations
    .filter((r) => r.status === 'booked' && r.id !== ignoreReservationId)
    .forEach((r) => {
      if (!overlaps(start, end, r.start, reservationEnd(r))) return
      const slot = `${timeHM(r.start)}–${timeHM(reservationEnd(r))}`
      if (therapistId && r.therapistId === therapistId) {
        messages.push(`${therapists[therapistId]?.name} มีลูกค้าจองไว้แล้ว ${slot} (${r.customerName})`)
      }
      if (roomId && r.roomId === roomId) {
        messages.push(`${rooms[roomId]?.room_name} ถูกจองไว้แล้ว ${slot}`)
      }
    })

  activeBookings(db.bookings).forEach((b) => {
    if (!overlaps(start, end, b.start, b.end)) return
    if (therapistId && b.therapistId === therapistId) {
      messages.push(`${therapists[therapistId]?.name} กำลังนวดอยู่ ถึง ${timeHM(b.end)}`)
    }
    if (roomId && b.roomId === roomId) {
      messages.push(`${rooms[roomId]?.room_name} มีคนใช้อยู่ ถึง ${timeHM(b.end)}`)
    }
  })

  return messages
}

/** Reservations still waiting whose start is from `pastMinutes` ago up to `aheadMinutes` from now. */
export const upcomingReservations = (reservations, now, aheadMinutes = 30, pastMinutes = 30) =>
  reservations
    .filter((r) => {
      if (r.status !== 'booked') return false
      const diff = minutesBetween(now, r.start)
      return diff <= aheadMinutes && diff >= -pastMinutes
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start))

export const customerStats = (customerId, bookings, therapists) => {
  if (!customerId) return null
  const visits = paidBookings(bookings).filter((b) => b.customerId === customerId)
  if (!visits.length) return { visits: 0 }

  const counts = visits.reduce((acc, b) => ({ ...acc, [b.therapistId]: (acc[b.therapistId] || 0) + 1 }), {})
  const favoriteId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  const last = visits.reduce((latest, b) => (new Date(b.start) > new Date(latest.start) ? b : latest))

  return {
    visits: visits.length,
    lastVisit: last.start,
    favoriteTherapist: therapists.find((t) => t.id === favoriteId) ?? null,
  }
}

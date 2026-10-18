/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DATA_VERSION, STORAGE_KEY, createSeed } from '../data/seed'
import { DAY, addMinutes, digitsOnly, startOfDay, uid } from '../lib/format'
import { payCells, payRows, paySettings, withoutCells } from '../lib/payroll'
import { billTotals, commissionFor, priceFor } from '../lib/pricing'
import {
  activeBookings,
  byId,
  expectedCash,
  findConflicts,
  shiftRecords,
  summarize,
} from '../lib/selectors'

const AppContext = createContext(null)

const THERAPIST_COLORS = ['rose', 'sky', 'amber', 'violet', 'teal', 'lime', 'orange', 'indigo']

const loadDb = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.version === DATA_VERSION) return parsed
    }
  } catch {
    // Storage blocked or corrupt — fall back to fresh demo data.
  }
  return createSeed()
}

const nowIso = () => new Date().toISOString()

export const AppProvider = ({ children }) => {
  const [db, setDb] = useState(loadDb)
  const [toast, setToast] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const toastTimer = useRef(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      // Demo still works without persistence.
    }
  }, [db])

  const notify = (title, message = '', tone = 'success') => {
    setToast({ title, message, tone, key: Date.now() })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), tone === 'error' ? 4500 : 3000)
  }

  const fail = (title, message) => {
    notify(title, message, 'error')
    return false
  }

  const update = (patch) => setDb((current) => ({ ...current, ...patch(current) }))

  const maps = useMemo(
    () => ({
      services: byId(db.services),
      rooms: byId(db.rooms),
      therapists: byId(db.therapists),
    }),
    [db.services, db.rooms, db.therapists],
  )

  const currentShift = db.shifts.find((shift) => shift.status === 'open') ?? null
  const nextQueueOrder = () => Math.max(0, ...db.therapists.map((t) => t.queueOrder || 0)) + 1

  // ---------- Owner mode ----------
  const unlockOwner = (pin) => {
    if (pin !== db.settings.ownerPin) return false
    setIsOwner(true)
    return true
  }
  const lockOwner = () => setIsOwner(false)
  const checkPin = (pin) => pin === db.settings.ownerPin

  // ---------- Shift (open / close the day) ----------
  const openShift = (openingCash) => {
    if (currentShift) return fail('เปิดรอบอยู่แล้ว', 'วันนี้เปิดรอบไว้แล้ว')
    update((d) => ({
      shifts: [...d.shifts, { id: uid('sh'), status: 'open', openedAt: nowIso(), openingCash: Number(openingCash) || 0 }],
    }))
    notify('เปิดรอบแล้ว', 'เริ่มขายได้เลย')
    return true
  }

  const endOfToday = () => new Date(startOfDay().getTime() + DAY)

  const previewClose = (paidTherapistIds = []) => {
    if (!currentShift) return null
    const records = shiftRecords(db, currentShift.id)
    const topUp = payCells(db, startOfDay(currentShift.openedAt), endOfToday()).reduce((total, c) => total + c.topUp, 0)
    const summary = summarize({ ...records, topUp })
    // Daily pay cycle settles at close — everything owed so far, so yesterday's balance carries over.
    const payouts =
      paySettings(db.settings).cycle === 'daily'
        ? payRows(payCells(db, new Date(0), endOfToday()).filter((c) => !c.paid), db.therapists)
        : []
    const paying = payouts.filter((r) => r.unpaid > 0 && paidTherapistIds.includes(r.therapistId))
    const payoutsPaid = paying.reduce((total, r) => total + r.unpaid, 0)
    return {
      records,
      summary,
      payouts,
      paying,
      payoutsPaid,
      expectedCash: expectedCash(currentShift.openingCash, summary, payoutsPaid),
    }
  }

  const closeShift = ({ countedCash, note, paidTherapistIds }) => {
    if (!currentShift) return fail('ยังไม่ได้เปิดรอบ')
    if (activeBookings(db.bookings).length) return fail('ยังมีห้องที่กำลังนวด', 'คิดเงินให้ครบทุกห้องก่อนปิดรอบ')

    const preview = previewClose(paidTherapistIds)
    const closedAt = nowIso()
    const payingIds = preview.paying.map((r) => r.therapistId)
    const closed = {
      ...currentShift,
      status: 'closed',
      closedAt,
      summary: preview.summary,
      payouts: preview.payouts.map((r) => ({ ...withoutCells(r), paid: payingIds.includes(r.therapistId) })),
      payoutsPaid: preview.payoutsPaid,
      expectedCash: preview.expectedCash,
      countedCash: Number(countedCash) || 0,
      difference: (Number(countedCash) || 0) - preview.expectedCash,
      note: note?.trim() ?? '',
    }

    update((d) => ({
      shifts: d.shifts.map((s) => (s.id === closed.id ? closed : s)),
      payouts: [
        ...d.payouts,
        ...preview.paying.map((r) => ({
          id: uid('p'),
          therapistId: r.therapistId,
          days: r.unpaidDays,
          amount: r.unpaid,
          paidAt: closedAt,
          shiftId: currentShift.id,
          by: isOwner ? 'เจ้าของร้าน (ปิดรอบ)' : 'แคชเชียร์ (ปิดรอบ)',
        })),
      ],
      // New day starts clean: everyone clocked out, queue reset.
      therapists: d.therapists.map((t) => ({ ...t, onDuty: false })),
      attendance: d.attendance.map((a) => (a.outAt ? a : { ...a, outAt: closedAt })),
    }))
    notify('ปิดรอบเรียบร้อย', 'บันทึกยอดของวันนี้แล้ว')
    return closed
  }

  /** Pay a therapist for the listed days — in cash from the drawer, or transferred from the shop account. */
  const payTherapist = ({ therapistId, days, amount, fromDrawer }) => {
    if (!days.length) return fail('ไม่มียอดค้างจ่าย')
    if (fromDrawer && !currentShift) return fail('ยังไม่ได้เปิดรอบ', 'จ่ายเงินสดจากลิ้นชักได้เมื่อเปิดรอบแล้ว')
    update((d) => ({
      payouts: [
        ...d.payouts,
        {
          id: uid('p'),
          therapistId,
          days,
          amount,
          paidAt: nowIso(),
          shiftId: fromDrawer ? currentShift.id : null,
          by: fromDrawer ? 'เงินสดจากลิ้นชัก' : 'โอนจากบัญชีร้าน',
        },
      ],
    }))
    notify('จ่ายค่าหมอแล้ว', `${maps.therapists[therapistId]?.name} ${Number(amount).toLocaleString('th-TH')} บาท`)
    return true
  }

  // ---------- Customers ----------
  const findCustomerByPhone = (phone) => {
    const digits = digitsOnly(phone)
    if (digits.length < 9) return null
    return db.customers.find((c) => digitsOnly(c.phone) === digits) ?? null
  }

  /** Returns [customerId, customers] — creates a customer when a new phone number is given. */
  const resolveCustomer = (customers, name, phone) => {
    const digits = digitsOnly(phone)
    if (digits.length < 9) return [null, customers]
    const existing = customers.find((c) => digitsOnly(c.phone) === digits)
    if (existing) {
      if (name && name !== existing.name) {
        return [existing.id, customers.map((c) => (c.id === existing.id ? { ...c, name } : c))]
      }
      return [existing.id, customers]
    }
    const created = { id: uid('c'), name: name || 'ลูกค้า', phone: digits }
    return [created.id, [...customers, created]]
  }

  // ---------- Rooms / bookings ----------
  const openRoom = ({ roomId, therapistId, serviceId, minutes, customerName, customerPhone, requested, reservationId }) => {
    if (!currentShift) return fail('ยังไม่ได้เปิดรอบ', 'กดปุ่ม "เปิดรอบ" ก่อนเริ่มขาย')
    const room = maps.rooms[roomId]
    const therapist = maps.therapists[therapistId]
    const service = maps.services[serviceId]
    if (!room) return fail('ยังไม่ได้เลือกห้อง')
    if (!therapist) return fail('ยังไม่ได้เลือกหมอนวด')
    if (!service) return fail('ยังไม่ได้เลือกบริการ')

    const active = activeBookings(db.bookings)
    if (active.some((b) => b.roomId === roomId)) return fail('ห้องนี้มีคนใช้อยู่', 'เลือกห้องอื่น')
    if (active.some((b) => b.therapistId === therapistId)) return fail(`${therapist.name} กำลังนวดอยู่`, 'เลือกหมอคนอื่น')

    const start = new Date()
    const name = customerName?.trim()
    const autoClockIn = !therapist.onDuty

    const bookingId = uid('b')
    update((d) => {
      const [customerId, customers] = resolveCustomer(d.customers, name, customerPhone)
      const customer = customers.find((c) => c.id === customerId)
      const booking = {
        id: bookingId,
        customerId,
        customerName: name || customer?.name || 'ลูกค้าทั่วไป',
        customerPhone: digitsOnly(customerPhone),
        therapistId,
        serviceId,
        roomId,
        status: 'active',
        requested: !!requested,
        start: start.toISOString(),
        end: addMinutes(start, minutes).toISOString(),
        minutes,
        price: priceFor(service, minutes),
        commission: commissionFor(service, minutes),
        shiftId: currentShift.id,
        reservationId: reservationId ?? null,
      }

      const queueOrder = Math.max(0, ...d.therapists.map((t) => t.queueOrder || 0)) + 1
      return {
        customers,
        bookings: [booking, ...d.bookings],
        therapists: d.therapists.map((t) => {
          if (t.id !== therapistId) return t
          // Rotation: taking a walk-in sends the therapist to the back of the queue.
          // A customer who asked for this therapist does not cost them their place.
          return { ...t, onDuty: true, queueOrder: requested && !autoClockIn ? t.queueOrder : queueOrder }
        }),
        attendance: autoClockIn
          ? [...d.attendance, { id: uid('at'), therapistId, inAt: start.toISOString(), outAt: null }]
          : d.attendance,
        reservations: reservationId
          ? d.reservations.map((r) => (r.id === reservationId ? { ...r, status: 'arrived', bookingId: booking.id } : r))
          : d.reservations,
      }
    })

    notify(`เปิด${room.room_name}แล้ว`, `${therapist.name} เริ่มนวด ${minutes} นาที${autoClockIn ? ' (บันทึกเข้างานให้แล้ว)' : ''}`)
    return bookingId
  }

  const extendBooking = (bookingId, delta) => {
    const booking = db.bookings.find((b) => b.id === bookingId)
    if (!booking || booking.status !== 'active') return false
    const minutes = booking.minutes + delta
    if (minutes < 30) return fail('ลดเวลาไม่ได้', 'ต้องนวดอย่างน้อย 30 นาที')
    const service = maps.services[booking.serviceId]

    update((d) => ({
      bookings: d.bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              minutes,
              end: addMinutes(b.start, minutes).toISOString(),
              price: priceFor(service, minutes),
              commission: commissionFor(service, minutes),
            }
          : b,
      ),
    }))
    notify(delta > 0 ? `ต่อเวลา ${delta} นาทีแล้ว` : `ลดเวลา ${-delta} นาทีแล้ว`, `${maps.rooms[booking.roomId]?.room_name} รวม ${minutes} นาที`)
    return true
  }

  /** payment: { discount, tip, method: 'cash' | 'qr' | 'split', cashPart, received } */
  const checkout = (bookingId, payment) => {
    const booking = db.bookings.find((b) => b.id === bookingId)
    if (!booking || booking.status !== 'active') return fail('ไม่พบรายการนี้')

    const totals = billTotals(booking.price, payment.discount, payment.tip)
    const payCash =
      payment.method === 'cash'
        ? totals.total
        : payment.method === 'split'
          ? Math.min(Math.max(Math.round(Number(payment.cashPart) || 0), 0), totals.total)
          : 0
    const received = Math.max(Number(payment.received) || payCash, payCash)
    const paidAt = nowIso()

    const completed = {
      ...booking,
      status: 'completed',
      discount: payment.discount,
      discountBaht: totals.discount,
      tip: totals.tip,
      net: totals.net,
      total: totals.total,
      payCash,
      payQr: totals.total - payCash,
      received,
      paidAt,
      finishedAt: paidAt,
    }

    update((d) => ({
      bookings: d.bookings.map((b) => (b.id === bookingId ? completed : b)),
      reservations: d.reservations.map((r) => (r.id === booking.reservationId ? { ...r, status: 'done' } : r)),
    }))
    notify('รับเงินเรียบร้อย', `${maps.rooms[booking.roomId]?.room_name} ว่างแล้ว`)
    return completed
  }

  const voidBooking = (bookingId, reason, voidedBy) => {
    const booking = db.bookings.find((b) => b.id === bookingId)
    if (!booking || booking.status === 'void') return fail('ไม่พบรายการนี้')
    if (booking.shiftId !== currentShift?.id) return fail('แก้ไขไม่ได้', 'รอบนี้ปิดไปแล้ว ยอดถูกล็อกไว้')
    if (!reason?.trim()) return fail('กรุณาเลือกเหตุผล')

    update((d) => ({
      bookings: d.bookings.map((b) =>
        b.id === bookingId
          ? { ...b, previousStatus: b.status, status: 'void', voidReason: reason.trim(), voidedAt: nowIso(), voidedBy }
          : b,
      ),
      reservations: d.reservations.map((r) => (r.id === booking.reservationId ? { ...r, status: 'cancelled' } : r)),
    }))
    notify(booking.status === 'active' ? 'ยกเลิกคิวแล้ว' : 'ยกเลิกบิลแล้ว', `เหตุผล: ${reason}`)
    return true
  }

  // ---------- Therapists: attendance, advances ----------
  const clockIn = (therapistId) => {
    const therapist = maps.therapists[therapistId]
    if (!therapist || therapist.onDuty) return false
    update((d) => ({
      therapists: d.therapists.map((t) => (t.id === therapistId ? { ...t, onDuty: true, queueOrder: nextQueueOrder() } : t)),
      attendance: [...d.attendance, { id: uid('at'), therapistId, inAt: nowIso(), outAt: null }],
    }))
    notify(`${therapist.name} เข้างานแล้ว`, 'ต่อท้ายคิว')
    return true
  }

  const clockOut = (therapistId) => {
    const therapist = maps.therapists[therapistId]
    if (!therapist) return false
    if (activeBookings(db.bookings).some((b) => b.therapistId === therapistId)) {
      return fail(`${therapist.name} ยังนวดอยู่`, 'คิดเงินห้องนั้นก่อน แล้วค่อยเลิกงาน')
    }
    update((d) => ({
      therapists: d.therapists.map((t) => (t.id === therapistId ? { ...t, onDuty: false } : t)),
      attendance: d.attendance.map((a) => (a.therapistId === therapistId && !a.outAt ? { ...a, outAt: nowIso() } : a)),
    }))
    notify(`${therapist.name} เลิกงานแล้ว`)
    return true
  }

  const addAdvance = ({ therapistId, amount, note }) => {
    if (!currentShift) return fail('ยังไม่ได้เปิดรอบ')
    if (!(Number(amount) > 0)) return fail('กรุณาใส่จำนวนเงิน')
    update((d) => ({
      advances: [
        {
          id: uid('a'),
          therapistId,
          amount: Number(amount),
          note: note?.trim() || 'เบิกล่วงหน้า',
          time: nowIso(),
          shiftId: currentShift.id,
          by: isOwner ? 'เจ้าของร้าน' : 'แคชเชียร์',
        },
        ...d.advances,
      ],
    }))
    notify('บันทึกเบิกเงินแล้ว', `${maps.therapists[therapistId]?.name} เบิก ${Number(amount).toLocaleString('th-TH')} บาท`)
    return true
  }

  // ---------- Expenses ----------
  const addExpense = ({ title, amount, category, fromDrawer = true }) => {
    if (!title?.trim()) return fail('กรุณาใส่ชื่อรายการ')
    if (!(Number(amount) > 0)) return fail('กรุณาใส่จำนวนเงิน')
    if (fromDrawer && !currentShift) return fail('ยังไม่ได้เปิดรอบ')
    update((d) => ({
      expenses: [
        {
          id: uid('e'),
          title: title.trim(),
          amount: Number(amount),
          category: category || 'อื่นๆ',
          time: nowIso(),
          shiftId: fromDrawer ? currentShift.id : null,
        },
        ...d.expenses,
      ],
    }))
    notify('บันทึกรายจ่ายแล้ว', `${title.trim()} ${Number(amount).toLocaleString('th-TH')} บาท`)
    return true
  }

  const deleteExpense = (expenseId) => {
    const expense = db.expenses.find((e) => e.id === expenseId)
    if (!expense) return false
    if (expense.shiftId && expense.shiftId !== currentShift?.id) return fail('ลบไม่ได้', 'รอบนี้ปิดไปแล้ว')
    update((d) => ({ expenses: d.expenses.filter((e) => e.id !== expenseId) }))
    notify('ลบรายจ่ายแล้ว')
    return true
  }

  // ---------- Reservations ----------
  const saveReservation = (payload, reservationId = null) => {
    const name = payload.customerName?.trim()
    const service = maps.services[payload.serviceId]
    if (!name) return fail('กรุณาใส่ชื่อลูกค้า')
    if (!service) return fail('กรุณาเลือกบริการ')
    if (!payload.start) return fail('กรุณาเลือกเวลา')

    const minutes = Number(payload.minutes) || service.duration_minutes
    const conflicts = findConflicts(db, {
      start: payload.start,
      end: addMinutes(payload.start, minutes),
      therapistId: payload.therapistId,
      roomId: payload.roomId,
      ignoreReservationId: reservationId,
    })
    if (conflicts.length) return fail('เวลานี้ไม่ว่าง', conflicts[0])

    update((d) => {
      const [customerId, customers] = resolveCustomer(d.customers, name, payload.customerPhone)
      const record = {
        customerId,
        customerName: name,
        customerPhone: digitsOnly(payload.customerPhone),
        start: new Date(payload.start).toISOString(),
        minutes,
        serviceId: payload.serviceId,
        therapistId: payload.therapistId || null,
        roomId: payload.roomId || null,
        note: payload.note?.trim() ?? '',
      }
      return {
        customers,
        reservations: reservationId
          ? d.reservations.map((r) => (r.id === reservationId ? { ...r, ...record } : r))
          : [...d.reservations, { id: uid('rv'), status: 'booked', createdAt: nowIso(), ...record }],
      }
    })
    notify(reservationId ? 'แก้ไขการจองแล้ว' : 'จองคิวแล้ว', name)
    return true
  }

  const setReservationStatus = (reservationId, status) => {
    update((d) => ({ reservations: d.reservations.map((r) => (r.id === reservationId ? { ...r, status } : r)) }))
    const labels = { cancelled: 'ยกเลิกการจองแล้ว', no_show: 'บันทึกว่าลูกค้าไม่มา', booked: 'คืนสถานะการจองแล้ว' }
    notify(labels[status] ?? 'อัปเดตแล้ว')
  }

  // ---------- Settings ----------
  const isDuplicate = (items, key, value, ignoreId) =>
    items.some((item) => item.id !== ignoreId && item[key].trim().toLowerCase() === value.trim().toLowerCase())

  const saveService = (payload, serviceId = null) => {
    const title = payload.title?.trim()
    if (!title) return fail('กรุณาใส่ชื่อบริการ')
    if (!(Number(payload.price) > 0)) return fail('กรุณาใส่ราคา')
    if (!(Number(payload.duration_minutes) >= 15)) return fail('กรุณาใส่เวลา (นาที)')
    if (isDuplicate(db.services, 'title', title, serviceId)) return fail('มีบริการชื่อนี้แล้ว')

    const record = {
      title,
      duration_minutes: Number(payload.duration_minutes),
      price: Number(payload.price),
      therapist_commission: Number(payload.therapist_commission) || 0,
    }
    update((d) => ({
      services: serviceId
        ? d.services.map((s) => (s.id === serviceId ? { ...s, ...record } : s))
        : [...d.services, { id: uid('s'), ...record }],
    }))
    notify(serviceId ? 'แก้ไขบริการแล้ว' : 'เพิ่มบริการแล้ว', title)
    return true
  }

  const deleteService = (serviceId) => {
    if (db.bookings.some((b) => b.serviceId === serviceId) || db.reservations.some((r) => r.serviceId === serviceId && r.status === 'booked')) {
      return fail('ลบไม่ได้', 'บริการนี้มีประวัติการใช้งานแล้ว ให้แก้ไขแทน')
    }
    update((d) => ({ services: d.services.filter((s) => s.id !== serviceId) }))
    notify('ลบบริการแล้ว')
    return true
  }

  const saveTherapist = (payload, therapistId = null) => {
    const name = payload.name?.trim()
    if (!name) return fail('กรุณาใส่ชื่อหมอนวด')
    if (isDuplicate(db.therapists, 'name', name, therapistId)) return fail('มีหมอนวดชื่อนี้แล้ว')
    const nickname = payload.nickname?.trim() || name

    update((d) => ({
      therapists: therapistId
        ? d.therapists.map((t) => (t.id === therapistId ? { ...t, name, nickname } : t))
        : [
            ...d.therapists,
            {
              id: uid('t'),
              name,
              nickname,
              color: THERAPIST_COLORS[d.therapists.length % THERAPIST_COLORS.length],
              onDuty: false,
              queueOrder: nextQueueOrder(),
            },
          ],
    }))
    notify(therapistId ? 'แก้ไขหมอนวดแล้ว' : 'เพิ่มหมอนวดแล้ว', name)
    return true
  }

  const deleteTherapist = (therapistId) => {
    if (db.bookings.some((b) => b.therapistId === therapistId) || db.reservations.some((r) => r.therapistId === therapistId && r.status === 'booked')) {
      return fail('ลบไม่ได้', 'หมอคนนี้มีประวัติงานแล้ว ให้แก้ไขแทน')
    }
    update((d) => ({ therapists: d.therapists.filter((t) => t.id !== therapistId) }))
    notify('ลบหมอนวดแล้ว')
    return true
  }

  const saveRoom = (payload, roomId = null) => {
    const roomName = payload.room_name?.trim()
    if (!roomName) return fail('กรุณาใส่ชื่อห้อง')
    if (isDuplicate(db.rooms, 'room_name', roomName, roomId)) return fail('มีห้องชื่อนี้แล้ว')
    update((d) => ({
      rooms: roomId
        ? d.rooms.map((r) => (r.id === roomId ? { ...r, room_name: roomName, type: payload.type || r.type } : r))
        : [...d.rooms, { id: uid('r'), room_name: roomName, type: payload.type || 'body' }],
    }))
    notify(roomId ? 'แก้ไขห้องแล้ว' : 'เพิ่มห้องแล้ว', roomName)
    return true
  }

  const deleteRoom = (roomId) => {
    if (db.bookings.some((b) => b.roomId === roomId) || db.reservations.some((r) => r.roomId === roomId && r.status === 'booked')) {
      return fail('ลบไม่ได้', 'ห้องนี้มีประวัติการใช้งานแล้ว ให้แก้ไขแทน')
    }
    update((d) => ({ rooms: d.rooms.filter((r) => r.id !== roomId) }))
    notify('ลบห้องแล้ว')
    return true
  }

  const saveSettings = (payload) => {
    if (payload.ownerPin !== undefined && !/^\d{4}$/.test(payload.ownerPin)) return fail('รหัส PIN ต้องเป็นตัวเลข 4 หลัก')
    if (payload.pay?.guaranteeEnabled && !(Number(payload.pay.guaranteeAmount) > 0)) return fail('กรุณาใส่ยอดการันตีต่อวัน')
    update((d) => ({ settings: { ...d.settings, ...payload } }))
    notify('บันทึกการตั้งค่าแล้ว')
    return true
  }

  const resetDemo = () => {
    setDb(createSeed())
    notify('รีเซ็ตข้อมูลเดโมแล้ว', 'กลับไปเป็นข้อมูลตัวอย่างเริ่มต้น')
  }

  const value = {
    db,
    ...maps,
    currentShift,
    toast,
    isOwner,
    notify,
    unlockOwner,
    lockOwner,
    checkPin,
    openShift,
    previewClose,
    closeShift,
    payTherapist,
    findCustomerByPhone,
    openRoom,
    extendBooking,
    checkout,
    voidBooking,
    clockIn,
    clockOut,
    addAdvance,
    addExpense,
    deleteExpense,
    saveReservation,
    setReservationStatus,
    saveService,
    deleteService,
    saveTherapist,
    deleteTherapist,
    saveRoom,
    deleteRoom,
    saveSettings,
    resetDemo,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}

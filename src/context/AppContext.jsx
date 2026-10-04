/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useMemo, useState } from 'react'
import {
  initialBookings,
  initialExpenses,
  initialRooms,
  initialServices,
  initialTherapists,
} from '../mockData'

const AppContext = createContext(null)

export const AppProvider = ({ children }) => {
  const [therapists, setTherapists] = useState(initialTherapists)
  const [services, setServices] = useState(initialServices)
  const [rooms, setRooms] = useState(initialRooms)
  const [bookings, setBookings] = useState(initialBookings)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [toast, setToast] = useState(null)
  const [paidTherapists, setPaidTherapists] = useState({})

  const notify = (title, message, tone = 'success') => {
    setToast({ title, message, tone })
    window.clearTimeout(notify.timeout)
    notify.timeout = window.setTimeout(() => setToast(null), 2600)
  }

  const formatCurrency = (value) =>
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(value)

  const serviceMap = useMemo(
    () => Object.fromEntries(services.map((service) => [service.id, service])),
    [services],
  )

  const therapistMap = useMemo(
    () => Object.fromEntries(therapists.map((therapist) => [therapist.id, therapist])),
    [therapists],
  )

  const roomMap = useMemo(
    () => Object.fromEntries(rooms.map((room) => [room.id, room])),
    [rooms],
  )

  const beginBooking = ({ therapistId, serviceId, roomId, customDuration, customerName }) => {
    const service = serviceMap[serviceId]
    const room = roomMap[roomId]
    const therapist = therapistMap[therapistId]

    if (!service || !room || !therapist) {
      notify('ข้อมูลไม่ครบ', 'กรุณาเลือกหมอนวด บริการ และห้องให้ครบ', 'error')
      return
    }

    if (room.status === 'occupied') {
      notify('ห้องไม่ว่าง', 'ห้องนี้กำลังถูกใช้งานอยู่ กรุณาเลือกห้องว่าง', 'error')
      return
    }

    if (therapist.status === 'busy' || therapist.status === 'off_duty') {
      notify('หมอนวดไม่พร้อม', 'กรุณาเลือกหมอนวดที่พร้อมทำงาน', 'error')
      return
    }

    const hasActiveTherapistBooking = bookings.some(
      (booking) => booking.therapistId === therapistId && booking.status === 'active',
    )

    if (hasActiveTherapistBooking) {
      notify('หมอนวดกำลังมีคิว', 'หมอนวดคนนี้ยังมีงานที่กำลังดำเนินการอยู่', 'error')
      return
    }

    const resolvedDuration = Math.max(30, Number(customDuration) || service.duration_minutes)
    const scaledTotal = Math.round((service.price / service.duration_minutes) * resolvedDuration)
    const start = new Date()
    const end = new Date(start.getTime() + resolvedDuration * 60000)
    const activeQueue = bookings.filter((booking) => booking.status === 'active').length + 1

    const newBooking = {
      id: `b${Date.now()}`,
      customerName: customerName?.trim() || 'ลูกค้าใหม่',
      therapistId,
      serviceId,
      roomId,
      status: 'active',
      paymentMethod: 'cash',
      total: scaledTotal,
      duration_minutes: resolvedDuration,
      start: start.toISOString(),
      end: end.toISOString(),
      queueNumber: activeQueue,
    }

    setBookings((current) => [newBooking, ...current])
    setRooms((current) =>
      current.map((item) =>
        item.id === roomId ? { ...item, status: 'occupied' } : item,
      ),
    )
    setTherapists((current) =>
      current.map((item) =>
        item.id === therapistId
          ? {
              ...item,
              status: 'busy',
              checkinTime: start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
              queueNumber: activeQueue,
            }
          : item,
      ),
    )

    notify('เปิดห้องเรียบร้อย', `${room.room_name} ถูกเปิดให้ ${therapist.name} เริ่มนวด`, 'success')
  }

  const addExtension = (bookingId, minutes) => {
    setBookings((current) =>
      current.map((booking) => {
        if (booking.id !== bookingId || booking.status !== 'active') return booking

        const currentService = serviceMap[booking.serviceId]
        const rate = currentService ? currentService.price / currentService.duration_minutes : 0
        const updatedTotal = Number(booking.total || 0) + Number((rate * minutes) || 0)
        const newEnd = new Date(new Date(booking.end).getTime() + minutes * 60000)
        const updatedMinutes = Number(booking.duration_minutes || currentService?.duration_minutes || 0) + Number(minutes)

        return {
          ...booking,
          total: updatedTotal,
          end: newEnd.toISOString(),
          duration_minutes: updatedMinutes,
          updatedAt: Date.now(),
        }
      }),
    )

    notify('อัปเดตเวลานวด', `เพิ่มเวลา ${minutes} นาที ให้กับห้องนี้แล้ว`, 'success')
  }

  const clockInTherapist = (therapistId, timeValue) => {
    const therapist = therapistMap[therapistId]

    if (!therapist) {
      notify('ไม่พบหมอนวด', 'กรุณาเลือกหมอนวดก่อนบันทึกเวลา', 'error')
      return
    }

    const hasActiveBooking = bookings.some(
      (booking) => booking.therapistId === therapistId && booking.status === 'active',
    )

    if (hasActiveBooking) {
      notify('หมอนวดกำลังทำงาน', 'ไม่สามารถบันทึกเข้างานใหม่ได้ขณะมีคิวที่กำลังดำเนินการ', 'error')
      return
    }

    const chosenTime = timeValue || new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

    setTherapists((current) =>
      current.map((item) =>
        item.id === therapistId
          ? {
              ...item,
              status: 'available',
              checkinTime: chosenTime,
            }
          : item,
      ),
    )

    notify('บันทึกเข้างานแล้ว', `เวลาเข้างานของ ${therapist.name} คือ ${chosenTime}`, 'success')
  }

  const clockOutTherapist = (therapistId) => {
    const therapist = therapistMap[therapistId]

    if (!therapist) {
      notify('ไม่พบหมอนวด', 'กรุณาเลือกหมอนวดก่อนปิดงาน', 'error')
      return
    }

    const hasActiveBooking = bookings.some(
      (booking) => booking.therapistId === therapistId && booking.status === 'active',
    )

    if (hasActiveBooking) {
      notify('ยังมีคิวที่กำลังทำงาน', 'ต้องปิดห้อง/ชำระก่อนจึงจะเลิกงานได้', 'error')
      return
    }

    setTherapists((current) =>
      current.map((item) =>
        item.id === therapistId
          ? {
              ...item,
              status: 'off_duty',
              checkinTime: '—',
            }
          : item,
      ),
    )

    notify('เลิกงานแล้ว', `${therapist.name} ถูกปิดงานเรียบร้อย`, 'success')
  }

  const checkoutBooking = (bookingId, paymentMethod) => {
    const targetBooking = bookings.find((item) => item.id === bookingId)

    if (!targetBooking) {
      notify('ไม่พบรายการ', 'ไม่พบงานที่ต้องชำระเงิน', 'error')
      return
    }

    if (targetBooking.status !== 'active') {
      notify('สถานะไม่ถูกต้อง', 'รายการนี้ไม่ใช่คิวที่กำลังใช้งานอยู่', 'error')
      return
    }

    const normalizedPayment = paymentMethod || 'cash'

    setBookings((current) =>
      current.map((booking) => {
        if (booking.id !== bookingId) return booking

        return {
          ...booking,
          status: 'completed',
          paymentMethod: normalizedPayment,
        }
      }),
    )

    const service = serviceMap[targetBooking.serviceId]

    setRooms((current) =>
      current.map((room) =>
        room.id === targetBooking.roomId ? { ...room, status: 'available' } : room,
      ),
    )

    setTherapists((current) =>
      current.map((therapist) =>
        therapist.id === targetBooking.therapistId ? { ...therapist, status: 'available' } : therapist,
      ),
    )

    notify('บันทึกรับเงินสำเร็จ', `${service?.title ?? 'บริการ'} ${normalizedPayment === 'qr' ? 'โอน QR' : 'เงินสด'} ถูกบันทึกแล้ว`, 'success')
  }

  const addExpense = ({ title, amount, category = 'อื่นๆ' }) => {
    if (!title || Number(amount) <= 0) {
      notify('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกชื่อรายการและจำนวนเงิน', 'error')
      return
    }

    setExpenses((current) => [
      {
        id: `e${Date.now()}`,
        title,
        amount: Number(amount),
        category,
        time: new Date().toISOString(),
      },
      ...current,
    ])

    notify('เพิ่มรายจ่ายแล้ว', `${title} (${category}) ถูกบันทึกในสรุปประจำวัน`, 'success')
  }

  const addService = (payload) => {
    const title = payload.title?.trim()

    if (!title || Number(payload.price) <= 0) {
      notify('ข้อมูลคอร์สไม่ครบ', 'กรุณากรอกชื่อและราคาให้ครบ', 'error')
      return
    }

    if (services.some((service) => service.title.toLowerCase() === title.toLowerCase())) {
      notify('ซ้ำชื่อคอร์ส', 'มีคอร์สนี้อยู่แล้ว กรุณาเลือกชื่อใหม่', 'error')
      return
    }

    const newService = {
      id: `s${Date.now()}`,
      title,
      duration_minutes: Number(payload.duration_minutes) || 60,
      price: Number(payload.price),
      therapist_commission: Number(payload.therapist_commission) || 0,
    }

    setServices((current) => [...current, newService])
    notify('เพิ่มคอร์สใหม่', `${newService.title} อยู่ในระบบแล้ว`, 'success')
  }

  const updateService = (serviceId, payload) => {
    const title = payload.title?.trim()

    if (!title || Number(payload.price) <= 0) {
      notify('ข้อมูลคอร์สไม่ครบ', 'กรุณากรอกชื่อและราคาให้ครบ', 'error')
      return
    }

    const hasDuplicateTitle = services.some(
      (service) => service.id !== serviceId && service.title.toLowerCase() === title.toLowerCase(),
    )

    if (hasDuplicateTitle) {
      notify('ซ้ำชื่อคอร์ส', 'ชื่อคอร์สนี้มีอยู่แล้วในระบบ', 'error')
      return
    }

    setServices((current) =>
      current.map((service) =>
        service.id === serviceId
          ? { ...service, ...payload, title, price: Number(payload.price), therapist_commission: Number(payload.therapist_commission) || 0 }
          : service,
      ),
    )
    notify('อัปเดตคอร์สสำเร็จ', 'ข้อมูลคอร์สได้รับการปรับปรุงแล้ว', 'success')
  }

  const deleteService = (serviceId) => {
    const isUsed = bookings.some((booking) => booking.serviceId === serviceId)

    if (isUsed) {
      notify('ไม่สามารถลบคอร์ส', 'คอร์สนี้ถูกใช้งานในประวัติการนวดแล้ว กรุณาแก้ไขแทนการลบ', 'error')
      return
    }

    setServices((current) => current.filter((service) => service.id !== serviceId))
    notify('ลบคอร์สแล้ว', 'รายการคอร์สถูกลบออกจากระบบแล้ว', 'success')
  }

  const addTherapist = (payload) => {
    const name = payload.name?.trim()
    const nickname = payload.nickname?.trim()

    if (!name || !nickname) {
      notify('ข้อมูลหมอนวดไม่ครบ', 'กรุณากรอกชื่อและชื่อเล่น', 'error')
      return
    }

    if (therapists.some((therapist) => therapist.name.toLowerCase() === name.toLowerCase())) {
      notify('ซ้ำชื่อหมอนวด', 'มีหมอนวดรายนี้อยู่แล้ว', 'error')
      return
    }

    const newTherapist = {
      id: `t${Date.now()}`,
      name,
      nickname,
      status: 'available',
    }

    setTherapists((current) => [...current, newTherapist])
    notify('เพิ่มหมอนวดแล้ว', `${newTherapist.name} พร้อมรับงานแล้ว`, 'success')
  }

  const updateTherapist = (therapistId, payload) => {
    const name = payload.name?.trim()
    const nickname = payload.nickname?.trim()

    if (!name || !nickname) {
      notify('ข้อมูลหมอนวดไม่ครบ', 'กรุณากรอกชื่อและชื่อเล่น', 'error')
      return
    }

    const hasDuplicateName = therapists.some(
      (therapist) => therapist.id !== therapistId && therapist.name.toLowerCase() === name.toLowerCase(),
    )

    if (hasDuplicateName) {
      notify('ซ้ำชื่อหมอนวด', 'มีหมอนวดรายนี้อยู่แล้วในระบบ', 'error')
      return
    }

    setTherapists((current) =>
      current.map((therapist) =>
        therapist.id === therapistId ? { ...therapist, name, nickname } : therapist,
      ),
    )
    notify('อัปเดตหมอนวด', 'ข้อมูลหมอนวดได้รับการปรับปรุงแล้ว', 'success')
  }

  const deleteTherapist = (therapistId) => {
    const isUsed = bookings.some((booking) => booking.therapistId === therapistId)

    if (isUsed) {
      notify('ไม่สามารถลบหมอนวด', 'หมอนวดนี้มีประวัติหรือคิวที่กำลังใช้งานอยู่ กรุณาแก้ไขแทนการลบ', 'error')
      return
    }

    setTherapists((current) => current.filter((therapist) => therapist.id !== therapistId))
    notify('ลบหมอนวดแล้ว', 'ข้อมูลหมอนวดถูกลบออกจากระบบแล้ว', 'success')
  }

  const addRoom = (payload) => {
    const roomName = payload.room_name?.trim()

    if (!roomName) {
      notify('ข้อมูลห้องไม่ครบ', 'กรุณากรอกชื่อห้องก่อนบันทึก', 'error')
      return
    }

    if (rooms.some((room) => room.room_name.toLowerCase() === roomName.toLowerCase())) {
      notify('ซ้ำชื่อห้อง', 'มีชื่อห้องนี้อยู่แล้ว กรุณาเปลี่ยนชื่อใหม่', 'error')
      return
    }

    const newRoom = {
      id: `r${Date.now()}`,
      room_name: roomName,
      type: payload.type || 'body',
      status: 'available',
    }

    setRooms((current) => [...current, newRoom])
    notify('เพิ่มห้องนวดแล้ว', `${newRoom.room_name} พร้อมให้ใช้งาน`, 'success')
  }

  const updateRoom = (roomId, payload) => {
    const roomName = payload.room_name?.trim()

    if (!roomName) {
      notify('ข้อมูลห้องไม่ครบ', 'กรุณากรอกชื่อห้องก่อนบันทึก', 'error')
      return
    }

    const hasDuplicateRoomName = rooms.some(
      (room) => room.id !== roomId && room.room_name.toLowerCase() === roomName.toLowerCase(),
    )

    if (hasDuplicateRoomName) {
      notify('ซ้ำชื่อห้อง', 'มีชื่อห้องนี้อยู่แล้วในระบบ', 'error')
      return
    }

    setRooms((current) =>
      current.map((room) =>
        room.id === roomId ? { ...room, room_name: roomName, type: payload.type || room.type } : room,
      ),
    )
    notify('อัปเดตห้องแล้ว', 'ข้อมูลห้องถูกปรับปรุงเรียบร้อย', 'success')
  }

  const deleteRoom = (roomId) => {
    const hasActiveBooking = bookings.some((booking) => booking.roomId === roomId && booking.status === 'active')
    const hasHistoricalBooking = bookings.some((booking) => booking.roomId === roomId)

    if (hasActiveBooking || hasHistoricalBooking) {
      notify('ไม่สามารถลบห้อง', 'ห้องนี้มีประวัติการใช้งานหรือกำลังใช้งานอยู่ กรุณาแก้ไขแทนการลบ', 'error')
      return
    }

    setRooms((current) => current.filter((room) => room.id !== roomId))
    notify('ลบห้องแล้ว', 'ห้องถูกลบออกจากระบบเรียบร้อย', 'success')
  }

  const markTherapistPaid = (therapistId) => {
    setPaidTherapists((current) => ({ ...current, [therapistId]: true }))
    notify('ยืนยันจ่ายเงินแล้ว', 'บันทึกการจ่ายค่ามือเรียบร้อย', 'success')
  }

  return (
    <AppContext.Provider
      value={{
        therapists,
        services,
        rooms,
        bookings,
        expenses,
        toast,
        paidTherapists,
        formatCurrency,
        beginBooking,
        addExtension,
        clockInTherapist,
        clockOutTherapist,
        checkoutBooking,
        addExpense,
        addService,
        updateService,
        deleteService,
        addTherapist,
        updateTherapist,
        deleteTherapist,
        addRoom,
        updateRoom,
        deleteRoom,
        markTherapistPaid,
        notify,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }

  return context
}

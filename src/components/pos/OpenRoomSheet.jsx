import { useState } from 'react'
import { AlertTriangle, Play, Star } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { addMinutes, dateShort, digitsOnly, minutesText, timeHM } from '../../lib/format'
import { priceFor } from '../../lib/pricing'
import { activeBookings, customerStats, findConflicts, therapistQueue } from '../../lib/selectors'
import { Avatar, Button, Choices, Field, Modal, Pill, Stepper, TextInput, Toggle } from '../ui'

function Step({ number, title, children }) {
  return (
    <section className="mb-7">
      <h3 className="mb-3 flex items-center gap-3 text-2xl font-bold text-stone-900">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-800 text-xl text-white">{number}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

export default function OpenRoomSheet({ roomId: initialRoomId, reservation, onClose, onOpened }) {
  const { db, services, rooms, openRoom, findCustomerByPhone } = useApp()
  const active = activeBookings(db.bookings)
  const queue = therapistQueue(db.therapists, db.bookings)
  const queueHead = queue[0]
  const freeRooms = db.rooms.filter((room) => !active.some((b) => b.roomId === room.id))

  const reservedRoomFree = reservation?.roomId && freeRooms.some((r) => r.id === reservation.roomId)
  const firstService = db.services[0]

  const [roomId, setRoomId] = useState(initialRoomId ?? (reservedRoomFree ? reservation.roomId : null))
  const [serviceId, setServiceId] = useState(reservation?.serviceId ?? firstService?.id)
  const [minutes, setMinutes] = useState(reservation?.minutes ?? firstService?.duration_minutes ?? 60)
  const [therapistId, setTherapistId] = useState(reservation?.therapistId ?? queueHead?.id ?? null)
  const [requested, setRequested] = useState(!!reservation?.therapistId)
  const [phone, setPhone] = useState(reservation?.customerPhone ?? '')
  const [name, setName] = useState(reservation?.customerName ?? '')

  const showRoomPicker = !initialRoomId
  const service = services[serviceId]
  const price = priceFor(service, minutes)
  const now = new Date()
  const end = addMinutes(now, minutes)

  const customer = findCustomerByPhone(phone)
  const stats = customer ? customerStats(customer.id, db.bookings, db.therapists) : null

  const warnings = therapistId || roomId
    ? findConflicts(db, { start: now, end, therapistId, roomId, ignoreReservationId: reservation?.id })
    : []

  const chooseService = (id) => {
    setServiceId(id)
    setMinutes(services[id].duration_minutes)
  }

  const chooseTherapist = (id) => {
    setTherapistId(id)
    // Picking someone other than the next in line means the customer asked for them.
    setRequested(id !== queueHead?.id)
  }

  const changePhone = (value) => {
    const digits = digitsOnly(value).slice(0, 10)
    setPhone(digits)
    const match = findCustomerByPhone(digits)
    if (match && !name) setName(match.name)
  }

  const therapistOptions = db.therapists.map((therapist) => {
    const job = active.find((b) => b.therapistId === therapist.id)
    const position = queue.findIndex((t) => t.id === therapist.id)
    let sub = 'ยังไม่เข้างาน · กดเลือกได้'
    let badge = null
    if (job) sub = `กำลังนวด ถึง ${timeHM(job.end)}`
    else if (position === 0) badge = <Pill tone="green">ถึงคิว</Pill>
    else if (position > 0) sub = `คิวที่ ${position + 1}`
    return { value: therapist.id, label: therapist.name, sub: badge ? undefined : sub, badge, disabled: !!job }
  })

  const submit = () => {
    const result = openRoom({
      roomId,
      therapistId,
      serviceId,
      minutes,
      customerName: name,
      customerPhone: phone,
      requested,
      reservationId: reservation?.id,
    })
    if (result) {
      onOpened?.(result)
      onClose()
    }
  }

  const title = reservation ? `ลูกค้าจองมาถึง: ${reservation.customerName}` : `เปิด${rooms[initialRoomId]?.room_name ?? 'ห้อง'}`
  const offset = showRoomPicker ? 1 : 0

  return (
    <Modal
      title={title}
      subtitle={reservation ? `นัดเวลา ${timeHM(reservation.start)}${reservation.note ? ` · ${reservation.note}` : ''}` : 'เลือกให้ครบ แล้วกด "เริ่มนวด"'}
      onClose={onClose}
      size="max-w-3xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg text-stone-600">
              {service?.title ?? '—'} · {minutesText(minutes)} · เลิก {timeHM(end)}
            </p>
            <p className="text-4xl font-extrabold tabular-nums text-stone-900">{price.toLocaleString('th-TH')} บาท</p>
          </div>
          <Button size="xl" icon={Play} onClick={submit} disabled={!roomId || !therapistId || !serviceId} className="min-w-[220px]">
            เริ่มนวด
          </Button>
        </div>
      }
    >
      {showRoomPicker ? (
        <Step number={1} title="เลือกห้อง">
          {freeRooms.length ? (
            <Choices
              value={roomId}
              onChange={setRoomId}
              options={freeRooms.map((room) => ({ value: room.id, label: room.room_name }))}
            />
          ) : (
            <p className="rounded-2xl bg-red-50 p-4 text-lg font-bold text-red-800">ตอนนี้ไม่มีห้องว่าง</p>
          )}
        </Step>
      ) : null}

      <Step number={offset + 1} title="เลือกบริการ">
        <Choices
          value={serviceId}
          onChange={chooseService}
          size="lg"
          options={db.services.map((s) => ({
            value: s.id,
            label: s.title,
            sub: `${minutesText(s.duration_minutes)} · ${s.price.toLocaleString('th-TH')} บาท`,
          }))}
        />
      </Step>

      <Step number={offset + 2} title="เวลานวด">
        <Stepper value={minutes} onChange={setMinutes} step={30} min={30} max={300} format={minutesText} />
      </Step>

      <Step number={offset + 3} title="เลือกหมอ">
        <Choices value={therapistId} onChange={chooseTherapist} options={therapistOptions} size="lg" />
        <div className="mt-3">
          <Toggle
            checked={requested}
            onChange={setRequested}
            label="ลูกค้าขอหมอคนนี้"
            sub={requested ? 'หมอไม่เสียคิว' : 'หมอจะไปต่อท้ายคิว'}
          />
        </div>
      </Step>

      <Step number={offset + 4} title="ลูกค้า (ไม่ใส่ก็ได้)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="เบอร์โทร">
            <TextInput inputMode="tel" value={phone} onChange={(e) => changePhone(e.target.value)} placeholder="08xxxxxxxx" />
          </Field>
          <Field label="ชื่อ">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="ลูกค้าทั่วไป" />
          </Field>
        </div>

        {customer && stats ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-violet-300 bg-violet-50 p-4">
            <Star size={28} className="text-violet-700" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-xl font-bold text-violet-950">ลูกค้าประจำ: {customer.name}</p>
              <p className="text-lg text-violet-900">
                มาแล้ว {stats.visits} ครั้ง{stats.lastVisit ? ` · ล่าสุด ${dateShort(stats.lastVisit)}` : ''}
                {stats.favoriteTherapist ? ` · ชอบ${stats.favoriteTherapist.name}` : ''}
              </p>
            </div>
            {stats.favoriteTherapist && stats.favoriteTherapist.id !== therapistId && !active.some((b) => b.therapistId === stats.favoriteTherapist.id) ? (
              <Button variant="secondary" onClick={() => { setTherapistId(stats.favoriteTherapist.id); setRequested(true) }}>
                <Avatar therapist={stats.favoriteTherapist} size="sm" /> เลือก{stats.favoriteTherapist.name}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Step>

      {warnings.length ? (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4" role="alert">
          {warnings.map((message) => (
            <p key={message} className="flex items-start gap-2 text-lg font-bold text-amber-900">
              <AlertTriangle size={24} className="mt-0.5 shrink-0" aria-hidden="true" /> {message}
            </p>
          ))}
          <p className="mt-1 text-base text-amber-900">ถ้ารับคิวนี้ จะเลิก {timeHM(end)} — ตรวจดูให้แน่ใจก่อนเริ่ม</p>
        </div>
      ) : null}
    </Modal>
  )
}

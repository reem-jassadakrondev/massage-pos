import { useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { DAY, addMinutes, atTime, dateWithDay, digitsOnly, isSameDay, minutesText, startOfDay, timeHM } from '../../lib/format'
import { findConflicts } from '../../lib/selectors'
import { Button, Choices, Field, Modal, Stepper, TextInput } from '../ui'

const toDateInput = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Block({ title, children }) {
  return (
    <section className="mb-7">
      <h3 className="mb-3 text-2xl font-bold text-stone-900">{title}</h3>
      {children}
    </section>
  )
}

/** Create or edit a reservation. `initial` may carry { day, time, therapistId } from a tap on the timeline. */
export default function ReservationForm({ reservation, initial = {}, onClose }) {
  const { db, services, saveReservation, findCustomerByPhone } = useApp()
  const { openHour, closeHour } = db.settings
  const today = startOfDay()

  const [day, setDay] = useState(startOfDay(reservation?.start ?? initial.day ?? today))
  const [time, setTime] = useState(reservation ? timeHM(reservation.start) : initial.time ?? null)
  const [serviceId, setServiceId] = useState(reservation?.serviceId ?? db.services[0]?.id)
  const [minutes, setMinutes] = useState(reservation?.minutes ?? db.services[0]?.duration_minutes ?? 60)
  const [therapistId, setTherapistId] = useState(reservation ? reservation.therapistId ?? '' : initial.therapistId ?? '')
  const [roomId, setRoomId] = useState(reservation?.roomId ?? '')
  const [phone, setPhone] = useState(reservation?.customerPhone ?? '')
  const [name, setName] = useState(reservation?.customerName ?? '')
  const [note, setNote] = useState(reservation?.note ?? '')

  const start = time ? atTime(day, time) : null
  const end = start ? addMinutes(start, minutes) : null
  const busyFor = (patch) =>
    start ? findConflicts(db, { start, end, ignoreReservationId: reservation?.id, ...patch }).length > 0 : false

  const slots = []
  for (let h = openHour; h < closeHour; h += 1) {
    slots.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`)
  }
  const now = new Date()

  const dayOptions = [0, 1, 2].map((offset) => {
    const value = new Date(today.getTime() + offset * DAY)
    return { value: value.getTime(), label: ['วันนี้', 'พรุ่งนี้', 'มะรืน'][offset], sub: dateWithDay(value) }
  })
  const isQuickDay = dayOptions.some((o) => o.value === day.getTime())

  const changePhone = (value) => {
    const digits = digitsOnly(value).slice(0, 10)
    setPhone(digits)
    const match = findCustomerByPhone(digits)
    if (match && !name) setName(match.name)
  }

  const submit = () => {
    const ok = saveReservation(
      { customerName: name, customerPhone: phone, start, minutes, serviceId, therapistId: therapistId || null, roomId: roomId || null, note },
      reservation?.id,
    )
    if (ok) onClose()
  }

  return (
    <Modal
      title={reservation ? 'แก้ไขการจอง' : 'จองคิวใหม่'}
      onClose={onClose}
      size="max-w-3xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xl text-stone-800">
            {start ? (
              <>
                <b>{dateWithDay(day)}</b> {timeHM(start)}–{timeHM(end)} · {services[serviceId]?.title}
              </>
            ) : (
              <span className="text-stone-500">ยังไม่ได้เลือกเวลา</span>
            )}
          </p>
          <Button size="xl" icon={CalendarCheck} onClick={submit} disabled={!start || !name.trim()} className="min-w-[240px]">
            บันทึกการจอง
          </Button>
        </div>
      }
    >
      <Block title="1 วันที่">
        <div className="grid gap-3 sm:grid-cols-[3fr_1fr]">
          <Choices value={day.getTime()} onChange={(v) => setDay(new Date(v))} columns="grid-cols-3" options={dayOptions} />
          <label className={`flex min-h-[60px] flex-col justify-center rounded-2xl border-2 px-3 ${isQuickDay ? 'border-stone-300' : 'border-emerald-600 bg-emerald-50'}`}>
            <span className="text-base font-semibold text-stone-600">วันอื่น</span>
            <input
              type="date"
              className="bg-transparent text-lg font-bold text-stone-900 outline-none"
              value={toDateInput(day)}
              min={toDateInput(today)}
              onChange={(e) => e.target.value && setDay(startOfDay(new Date(`${e.target.value}T00:00`)))}
            />
          </label>
        </div>
      </Block>

      <Block title="2 เวลา">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {slots.map((slot) => {
            const past = isSameDay(day, now) && atTime(day, slot) < now
            const selected = slot === time
            return (
              <button
                key={slot}
                type="button"
                disabled={past}
                onClick={() => setTime(slot)}
                aria-pressed={selected}
                className={`min-h-[56px] rounded-xl border-2 text-xl font-bold tabular-nums transition disabled:opacity-30 ${
                  selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 bg-white text-stone-900 hover:border-stone-500'
                }`}
              >
                {slot}
              </button>
            )
          })}
        </div>
      </Block>

      <Block title="3 บริการ">
        <Choices
          value={serviceId}
          onChange={(id) => {
            setServiceId(id)
            setMinutes(services[id].duration_minutes)
          }}
          options={db.services.map((s) => ({ value: s.id, label: s.title, sub: `${minutesText(s.duration_minutes)} · ${s.price} บาท` }))}
        />
        <div className="mt-3">
          <Stepper value={minutes} onChange={setMinutes} min={30} max={300} format={minutesText} />
        </div>
      </Block>

      <Block title="4 หมอนวด">
        <Choices
          value={therapistId}
          onChange={setTherapistId}
          options={[
            { value: '', label: 'ใครก็ได้', sub: 'จัดหมอตอนลูกค้ามา' },
            ...db.therapists.map((t) => {
              const busy = busyFor({ therapistId: t.id })
              return { value: t.id, label: t.name, sub: busy ? 'ไม่ว่างเวลานี้' : 'ว่าง', disabled: busy && t.id !== therapistId }
            }),
          ]}
        />
      </Block>

      <Block title="5 ห้อง (ไม่ระบุก็ได้)">
        <Choices
          value={roomId}
          onChange={setRoomId}
          options={[
            { value: '', label: 'ไม่ระบุ' },
            ...db.rooms.map((r) => {
              const busy = busyFor({ roomId: r.id })
              return { value: r.id, label: r.room_name, sub: busy ? 'ไม่ว่างเวลานี้' : undefined, disabled: busy && r.id !== roomId }
            }),
          ]}
        />
      </Block>

      <Block title="6 ลูกค้า">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="เบอร์โทร">
            <TextInput inputMode="tel" value={phone} onChange={(e) => changePhone(e.target.value)} placeholder="08xxxxxxxx" />
          </Field>
          <Field label="ชื่อลูกค้า *">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น คุณสมศรี" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="หมายเหตุ">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ปวดหลัง ขอนวดเบา" />
          </Field>
        </div>
      </Block>
    </Modal>
  )
}

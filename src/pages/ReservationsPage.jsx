import { useState } from 'react'
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, DoorOpen, Pencil, Phone, RotateCcw, UserX, XCircle } from 'lucide-react'
import OpenRoomSheet from '../components/pos/OpenRoomSheet'
import ReservationForm from '../components/reservations/ReservationForm'
import Timeline from '../components/reservations/Timeline'
import { Button, ConfirmDialog, Empty, Modal, Pill, SectionTitle } from '../components/ui'
import { useApp } from '../context/AppContext'
import useNow from '../hooks/useNow'
import { DAY, dateLong, isSameDay, minutesText, phoneText, startOfDay, timeHM } from '../lib/format'
import { reservationEnd } from '../lib/selectors'

const STATUS = {
  booked: ['blue', 'จองแล้ว'],
  arrived: ['amber', 'มาแล้ว · กำลังนวด'],
  done: ['green', 'เสร็จแล้ว'],
  no_show: ['red', 'ไม่มา'],
  cancelled: ['gray', 'ยกเลิก'],
}

function ReservationCard({ reservation: r, onArrive, onEdit, onStatus, canArrive }) {
  const { therapists, services, rooms } = useApp()
  const [tone, label] = STATUS[r.status]
  const muted = ['no_show', 'cancelled'].includes(r.status)

  return (
    <div className={`rounded-3xl border-2 bg-white p-4 shadow-sm ${r.status === 'booked' ? 'border-sky-300' : 'border-stone-200'} ${muted ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-3xl font-extrabold tabular-nums text-stone-900">
            {timeHM(r.start)}
            <span className="text-xl font-semibold text-stone-500"> – {timeHM(reservationEnd(r))}</span>
          </p>
          <p className="mt-1 text-2xl font-bold text-stone-900">{r.customerName}</p>
          {r.customerPhone ? (
            <p className="flex items-center gap-1 text-lg text-stone-700">
              <Phone size={18} aria-hidden="true" /> {phoneText(r.customerPhone)}
            </p>
          ) : null}
        </div>
        <Pill tone={tone}>{label}</Pill>
      </div>

      <p className="mt-2 text-lg text-stone-800">
        {services[r.serviceId]?.title} {minutesText(r.minutes)} · <b>{r.therapistId ? therapists[r.therapistId]?.name : 'หมอคนไหนก็ได้'}</b>
        {r.roomId ? ` · ${rooms[r.roomId]?.room_name}` : ''}
      </p>
      {r.note ? <p className="mt-1 rounded-xl bg-amber-50 px-3 py-2 text-lg text-amber-900">📝 {r.note}</p> : null}

      {r.status === 'booked' ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {canArrive ? (
            <Button variant="blue" size="lg" icon={DoorOpen} onClick={() => onArrive(r)}>
              ลูกค้ามาแล้ว
            </Button>
          ) : null}
          <Button variant="secondary" icon={Pencil} onClick={() => onEdit(r)}>
            แก้ไข / เลื่อนเวลา
          </Button>
          <Button variant="secondary" icon={UserX} onClick={() => onStatus(r, 'no_show')}>
            ไม่มา
          </Button>
          <Button variant="secondary" icon={XCircle} className="text-red-700" onClick={() => onStatus(r, 'cancelled')}>
            ยกเลิก
          </Button>
        </div>
      ) : muted ? (
        <div className="mt-3">
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => onStatus(r, 'booked')}>
            คืนสถานะเป็นจองแล้ว
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default function ReservationsPage() {
  const { db, currentShift, setReservationStatus } = useApp()
  const now = useNow(30000)
  const [day, setDay] = useState(startOfDay())
  const [form, setForm] = useState(null) // { reservation } | { initial }
  const [arriving, setArriving] = useState(null)
  const [selected, setSelected] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const isToday = isSameDay(day, now)
  const dayReservations = db.reservations
    .filter((r) => isSameDay(r.start, day))
    .sort((a, b) => new Date(a.start) - new Date(b.start))
  const timelineReservations = dayReservations.filter((r) => r.status === 'booked')
  const dayBookings = db.bookings.filter((b) => b.status !== 'void' && isSameDay(b.start, day))
  const waiting = dayReservations.filter((r) => r.status === 'booked').length

  const askStatus = (reservation, status) => {
    if (status === 'booked') return setReservationStatus(reservation.id, status)
    setConfirm({ reservation, status })
  }

  const cardProps = {
    canArrive: isToday && !!currentShift,
    onArrive: (r) => {
      setSelected(null)
      setArriving(r)
    },
    onEdit: (r) => {
      setSelected(null)
      setForm({ reservation: r })
    },
    onStatus: (r, status) => {
      setSelected(null)
      askStatus(r, status)
    },
  }

  const shiftDay = (offset) => setDay(new Date(day.getTime() + offset * DAY))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="lg" icon={ChevronLeft} onClick={() => shiftDay(-1)} aria-label="วันก่อน" />
          <Button variant={isToday ? 'dark' : 'secondary'} size="lg" onClick={() => setDay(startOfDay())}>
            วันนี้
          </Button>
          <Button variant="secondary" size="lg" icon={ChevronRight} onClick={() => shiftDay(1)} aria-label="วันถัดไป" />
          <h2 className="ml-2 text-2xl font-bold text-stone-900">{dateLong(day)}</h2>
        </div>
        <Button size="xl" icon={CalendarPlus} onClick={() => setForm({ initial: { day } })}>
          จองคิวใหม่
        </Button>
      </div>

      <section>
        <SectionTitle icon={CalendarDays} action={<span className="text-lg text-stone-600">แตะช่องว่างในตาราง เพื่อจองหมอคนนั้นเวลานั้น</span>}>
          ตารางคิว
        </SectionTitle>
        <Timeline
          day={day}
          therapists={db.therapists}
          reservations={timelineReservations}
          bookings={dayBookings}
          openHour={db.settings.openHour}
          closeHour={db.settings.closeHour}
          now={now}
          onSlot={(therapistId, time) => setForm({ initial: { day, time, therapistId } })}
          onSelect={setSelected}
        />
      </section>

      <section>
        <SectionTitle>รายการจอง {waiting ? <Pill tone="blue">รอ {waiting} คิว</Pill> : null}</SectionTitle>
        {dayReservations.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {dayReservations.map((r) => (
              <ReservationCard key={r.id} reservation={r} {...cardProps} />
            ))}
          </div>
        ) : (
          <Empty>ยังไม่มีการจองวันนี้ · กด "จองคิวใหม่"</Empty>
        )}
      </section>

      {form ? <ReservationForm reservation={form.reservation} initial={form.initial} onClose={() => setForm(null)} /> : null}
      {arriving ? <OpenRoomSheet reservation={arriving} onClose={() => setArriving(null)} /> : null}
      {selected ? (
        <Modal title="การจอง" onClose={() => setSelected(null)} size="max-w-xl">
          <ReservationCard reservation={selected} {...cardProps} />
        </Modal>
      ) : null}
      {confirm ? (
        <ConfirmDialog
          title={confirm.status === 'cancelled' ? 'ยกเลิกการจองนี้?' : 'ลูกค้าไม่มาใช่ไหม?'}
          message={`${confirm.reservation.customerName} เวลา ${timeHM(confirm.reservation.start)}`}
          confirmLabel={confirm.status === 'cancelled' ? 'ยกเลิกการจอง' : 'ใช่ ลูกค้าไม่มา'}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setReservationStatus(confirm.reservation.id, confirm.status)
            setConfirm(null)
          }}
        />
      ) : null}
    </div>
  )
}

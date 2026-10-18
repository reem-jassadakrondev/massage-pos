import { CalendarClock, Clock3, Plus, Receipt } from 'lucide-react'
import { minutesBetween, minutesText, timeHM } from '../../lib/format'
import { Avatar, Button, Pill } from '../ui'

export default function RoomCard({ room, booking, therapist, service, reservation, now, onOpen, onCheckout, onExtend }) {
  if (!booking) {
    return (
      <div className="flex flex-col rounded-3xl border-2 border-emerald-400 bg-emerald-50 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-2xl font-extrabold text-stone-900">{room.room_name}</h3>
          <Pill tone="green">ว่าง</Pill>
        </div>
        {reservation ? (
          <p className="mt-2 flex items-center gap-2 rounded-xl bg-sky-100 px-3 py-2 text-lg font-bold text-sky-900">
            <CalendarClock size={22} /> มีจอง {timeHM(reservation.start)} {reservation.customerName}
          </p>
        ) : null}
        <Button size="xl" className="mt-4 w-full flex-1" icon={Plus} onClick={() => onOpen(room)}>
          เปิดห้อง
        </Button>
      </div>
    )
  }

  const remaining = minutesBetween(now, booking.end)
  const tone = remaining <= 0 ? 'over' : remaining <= 10 ? 'red' : 'amber'
  const styles = {
    amber: 'border-amber-400 bg-amber-50',
    red: 'border-red-500 bg-red-50',
    over: 'border-red-600 bg-red-100',
  }

  return (
    <div className={`flex flex-col rounded-3xl border-2 p-5 shadow-sm ${styles[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-2xl font-extrabold text-stone-900">{room.room_name}</h3>
        {tone === 'amber' ? <Pill tone="amber">กำลังนวด</Pill> : <Pill tone="red">{tone === 'over' ? 'เกินเวลา' : 'ใกล้หมดเวลา'}</Pill>}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Avatar therapist={therapist} />
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold text-stone-900">{therapist?.name}</p>
          <p className="truncate text-lg text-stone-700">
            {service?.title} · {booking.customerName}
          </p>
        </div>
      </div>

      <div className={`mt-4 rounded-2xl px-4 py-3 ${tone === 'amber' ? 'bg-white/80' : 'bg-white'}`}>
        <p className={`flex items-center gap-2 text-3xl font-extrabold tabular-nums ${tone === 'amber' ? 'text-stone-900' : 'text-red-700'} ${tone === 'over' ? 'animate-pulse' : ''}`}>
          <Clock3 size={30} aria-hidden="true" />
          {remaining > 0 ? `เหลือ ${minutesText(remaining)}` : `เกิน ${minutesText(-remaining || 1)}`}
        </p>
        <p className="mt-1 text-lg text-stone-700">
          {timeHM(booking.start)} – {timeHM(booking.end)} ({minutesText(booking.minutes)})
        </p>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-3">
        <Button variant="secondary" size="lg" icon={Plus} onClick={() => onExtend(booking)}>
          30 นาที
        </Button>
        <Button size="lg" icon={Receipt} onClick={() => onCheckout(booking)}>
          คิดเงิน
        </Button>
      </div>
    </div>
  )
}

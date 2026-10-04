import { useEffect, useMemo, useState } from 'react'
import { Clock3, CreditCard, Plus, UserRound } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'

export default function RoomCard({ room, booking, therapists, services, onSelect, onExtend }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const therapist = useMemo(
    () => therapists.find((item) => item.id === booking?.therapistId),
    [booking, therapists],
  )

  const service = useMemo(
    () => services.find((item) => item.id === booking?.serviceId),
    [booking, services],
  )

  const remainingMinutes = booking
    ? Math.max(0, Math.ceil((new Date(booking.end).getTime() - now.getTime()) / 60000))
    : null

  const displayRemainingMinutes = remainingMinutes ?? 0
  const remainingTone =
    remainingMinutes === null
      ? 'emerald'
      : remainingMinutes <= 15
        ? 'red'
        : remainingMinutes <= 30
          ? 'amber'
          : 'emerald'

  const handleCardKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(room.id, booking?.id)
    }
  }

  return (
    <div
      className={`w-full rounded-3xl border p-4 text-left shadow-sm transition-all duration-200 ${
        room.status === 'available'
          ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
          : 'border-red-200 bg-red-50 hover:bg-red-100'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(room.id, booking?.id)}
        onKeyDown={handleCardKeyDown}
        className="w-full cursor-pointer text-left outline-none"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-stone-800">{room.room_name}</p>
            <p className="text-xs uppercase tracking-[0.12em] text-stone-500">{room.type === 'foot' ? 'เท้า' : 'นวดตัว'} </p>
          </div>
          <StatusBadge status={room.status === 'available' ? 'available' : 'occupied'} label={room.status === 'available' ? 'ว่าง' : 'ไม่ว่าง'} />
        </div>

        {booking ? (
          <div className="space-y-3 text-sm text-stone-700">
            <div className="flex items-center gap-2">
              <UserRound size={15} className="text-stone-500" />
              <span className="font-semibold text-stone-800">{therapist?.name ?? 'หมอ'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard size={15} className="text-stone-500" />
              <span>{service?.title ?? 'บริการ'}</span>
            </div>
            <div
              className={`flex items-center gap-2 rounded-2xl p-2 ${
                remainingTone === 'red'
                  ? 'bg-red-100/80'
                  : remainingTone === 'amber'
                    ? 'bg-amber-100/80'
                    : 'bg-white/70'
              }`}
            >
              <Clock3 size={15} className={remainingTone === 'red' ? 'text-red-700' : remainingTone === 'amber' ? 'text-amber-700' : 'text-emerald-700'} />
              <span className={`font-bold ${remainingTone === 'red' ? 'text-red-700' : remainingTone === 'amber' ? 'text-amber-700' : 'text-emerald-700'}`}>
                เหลือ {displayRemainingMinutes} นาที
              </span>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[88px] items-center justify-center rounded-2xl bg-white/60 text-sm font-semibold text-emerald-700">
            กดเพื่อเปิดคิวใหม่
          </div>
        )}
      </div>

      {booking ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onExtend(booking.id, 30)}
            className="flex min-h-[52px] items-center justify-center gap-1 rounded-2xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-700"
          >
            <Plus size={15} /> 30 นาที
          </button>
          <button
            type="button"
            onClick={() => onExtend(booking.id, 60)}
            className="flex min-h-[52px] items-center justify-center gap-1 rounded-2xl bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700"
          >
            <Plus size={15} /> 1 ชม.
          </button>
        </div>
      ) : null}
    </div>
  )
}

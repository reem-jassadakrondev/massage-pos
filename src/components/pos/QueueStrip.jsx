import { Users } from 'lucide-react'
import { minutesBetween, minutesText } from '../../lib/format'
import { activeBookings, therapistQueue } from '../../lib/selectors'
import { Avatar } from '../ui'

export default function QueueStrip({ therapists, bookings, now }) {
  const queue = therapistQueue(therapists, bookings)
  const busy = activeBookings(bookings)
    .map((b) => ({ booking: b, therapist: therapists.find((t) => t.id === b.therapistId) }))
    .sort((a, b) => new Date(a.booking.end) - new Date(b.booking.end))

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm" aria-label="คิวหมอนวด">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-stone-900">
          <Users size={26} className="text-emerald-700" aria-hidden="true" /> คิวหมอ
        </h2>
        <span className="text-base text-stone-600">ว่างก่อน รับก่อน</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {queue.length ? (
          queue.map((therapist, index) => (
            <div
              key={therapist.id}
              className={`flex items-center gap-3 rounded-2xl border-2 py-2 pl-2 pr-4 ${
                index === 0 ? 'border-emerald-600 bg-emerald-50' : 'border-stone-200 bg-stone-50'
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-extrabold ${index === 0 ? 'bg-emerald-700 text-white' : 'bg-stone-300 text-stone-800'}`}>
                {index + 1}
              </span>
              <Avatar therapist={therapist} size="sm" />
              <div>
                <p className="text-xl font-bold leading-tight text-stone-900">{therapist.name}</p>
                <p className={`text-base font-semibold ${index === 0 ? 'text-emerald-800' : 'text-stone-600'}`}>{index === 0 ? 'ถึงคิวแล้ว' : 'ว่าง'}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-lg font-semibold text-amber-900">
            ตอนนี้ไม่มีหมอว่าง{busy[0] ? ` · ${busy[0].therapist?.name} จะว่างในอีก ${minutesText(Math.max(1, minutesBetween(now, busy[0].booking.end)))}` : ''}
          </p>
        )}

        {busy.map(({ booking, therapist }) => (
          <div key={booking.id} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-stone-300 py-2 pl-2 pr-4 opacity-80">
            <Avatar therapist={therapist} size="sm" />
            <div>
              <p className="text-xl font-bold leading-tight text-stone-700">{therapist?.name}</p>
              <p className="text-base text-stone-600">กำลังนวด · ว่างอีก {minutesText(Math.max(0, minutesBetween(now, booking.end)))}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

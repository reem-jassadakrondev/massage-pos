import { useEffect, useRef } from 'react'
import { isSameDay, startOfDay, timeHM } from '../../lib/format'
import { reservationEnd } from '../../lib/selectors'
import { Avatar } from '../ui'

const BLOCK_COLORS = {
  rose: 'bg-rose-100 border-rose-400 text-rose-950',
  sky: 'bg-sky-100 border-sky-400 text-sky-950',
  amber: 'bg-amber-100 border-amber-400 text-amber-950',
  violet: 'bg-violet-100 border-violet-400 text-violet-950',
  teal: 'bg-teal-100 border-teal-400 text-teal-950',
  lime: 'bg-lime-100 border-lime-400 text-lime-950',
  orange: 'bg-orange-100 border-orange-400 text-orange-950',
  indigo: 'bg-indigo-100 border-indigo-400 text-indigo-950',
}

const HOUR_W = 120
const ROW_H = 80
const NAME_W = 180

/**
 * Day view: one row per therapist (plus "not assigned"), time running left → right.
 * Tap an empty spot to book that therapist at that time; tap a block to manage it.
 */
export default function Timeline({ day, therapists, reservations, bookings, openHour, closeHour, now, onSlot, onSelect }) {
  const scroller = useRef(null)
  const dayStart = startOfDay(day)

  const hourOf = (value) => (new Date(value).getTime() - dayStart.getTime()) / 3600000
  // A paid bill frees the therapist when it was paid, not at the originally planned end.
  const bookingEnd = (b) => (b.status === 'completed' ? b.finishedAt ?? b.end : b.end)
  const items = [...reservations.map((r) => [r.start, reservationEnd(r)]), ...bookings.map((b) => [b.start, bookingEnd(b)])]
  const fromHour = Math.floor(Math.min(openHour, ...items.map(([s]) => hourOf(s))))
  const toHour = Math.ceil(Math.max(closeHour, ...items.map(([, e]) => hourOf(e))))
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i)
  const width = hours.length * HOUR_W
  const isToday = isSameDay(day, now)
  const nowX = (hourOf(now) - fromHour) * HOUR_W

  useEffect(() => {
    if (!scroller.current) return
    const target = isToday ? nowX - HOUR_W : 0
    scroller.current.scrollLeft = Math.max(0, target)
    // Only re-centre when the day changes, not on every clock tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.getTime()])

  const block = (start, end) => ({
    left: Math.max(0, (hourOf(start) - fromHour) * HOUR_W),
    width: Math.max(36, (hourOf(end) - hourOf(start)) * HOUR_W - 4),
  })

  const handleRowClick = (event, therapistId) => {
    if (event.target !== event.currentTarget) return
    const x = event.nativeEvent.offsetX
    const totalMinutes = Math.floor(((x / HOUR_W) * 60) / 30) * 30 + fromHour * 60
    const time = `${String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
    onSlot(therapistId, time)
  }

  const rows = [...therapists.map((t) => ({ id: t.id, therapist: t })), { id: '', therapist: null }]

  return (
    <div ref={scroller} className="overflow-x-auto rounded-3xl border border-stone-200 bg-white shadow-sm">
      <div style={{ width: width + NAME_W }} className="relative">
        {/* Hour header */}
        <div className="sticky top-0 z-10 flex border-b-2 border-stone-200 bg-stone-50">
          <div style={{ width: NAME_W }} className="sticky left-0 z-20 shrink-0 bg-stone-50 px-3 py-2 text-base font-bold text-stone-600">
            หมอ / เวลา
          </div>
          {hours.map((h) => (
            <div key={h} style={{ width: HOUR_W }} className="shrink-0 border-l border-stone-200 px-2 py-2 text-lg font-bold tabular-nums text-stone-800">
              {String(h % 24).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {rows.map(({ id, therapist }) => {
          const rowReservations = reservations.filter((r) => (r.therapistId ?? '') === id)
          const rowBookings = id ? bookings.filter((b) => b.therapistId === id) : []
          return (
            <div key={id || 'none'} className="flex border-b border-stone-200" style={{ height: ROW_H }}>
              <div style={{ width: NAME_W }} className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-stone-200 bg-white px-3">
                {therapist ? <Avatar therapist={therapist} size="sm" /> : null}
                <span className="whitespace-nowrap text-lg font-bold leading-tight text-stone-900">{therapist ? therapist.name : 'ยังไม่ระบุหมอ'}</span>
              </div>
              <div
                className="relative cursor-pointer hover:bg-emerald-50/40"
                style={{
                  width,
                  backgroundImage: `repeating-linear-gradient(to right, #e7e5e4 0 1px, transparent 1px ${HOUR_W / 2}px)`,
                }}
                onClick={(e) => handleRowClick(e, id)}
                title="แตะช่องว่างเพื่อจอง"
              >
                {rowBookings.map((b) => (
                  <div
                    key={b.id}
                    className={`pointer-events-none absolute bottom-2 top-2 overflow-hidden rounded-xl border-2 px-2 py-1 ${
                      b.status === 'active' ? 'border-amber-500 bg-amber-100' : 'border-stone-300 bg-stone-100'
                    }`}
                    style={block(b.start, bookingEnd(b))}
                  >
                    <p className="truncate text-base font-bold text-stone-800">{timeHM(b.start)} {b.status === 'active' ? 'กำลังนวด' : 'นวดแล้ว'}</p>
                    <p className="truncate text-sm text-stone-600">{b.customerName}</p>
                  </div>
                ))}
                {rowReservations.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelect(r)}
                    className={`absolute bottom-2 top-2 overflow-hidden rounded-xl border-2 border-l-8 px-2 py-1 text-left shadow-sm ${
                      therapist ? BLOCK_COLORS[therapist.color] ?? BLOCK_COLORS.sky : 'border-sky-500 bg-sky-100 text-sky-950'
                    }`}
                    style={block(r.start, reservationEnd(r))}
                  >
                    <p className="truncate text-base font-extrabold">{timeHM(r.start)} {r.customerName}</p>
                    <p className="truncate text-sm">จองแล้ว</p>
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {isToday && nowX >= 0 && nowX <= width ? (
          <div className="pointer-events-none absolute bottom-0 top-0 z-[5] w-0.5 bg-red-600" style={{ left: NAME_W + nowX }}>
            <span className="absolute -left-6 top-1 rounded bg-red-600 px-1 text-sm font-bold text-white">{timeHM(now)}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

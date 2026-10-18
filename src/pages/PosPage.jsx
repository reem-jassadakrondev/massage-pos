import { useState } from 'react'
import { BellRing, DoorOpen } from 'lucide-react'
import CheckoutSheet from '../components/pos/CheckoutSheet'
import OpenRoomSheet from '../components/pos/OpenRoomSheet'
import QueueStrip from '../components/pos/QueueStrip'
import RoomCard from '../components/pos/RoomCard'
import OpenShiftCard from '../components/shift/OpenShiftCard'
import { Button, SectionTitle, Stat } from '../components/ui'
import { useApp } from '../context/AppContext'
import useNow from '../hooks/useNow'
import { minutesBetween, minutesText, money, timeHM } from '../lib/format'
import { activeBookings, shiftRecords, summarize, upcomingReservations } from '../lib/selectors'

function ReservationAlerts({ reservations, now, onArrive }) {
  const { therapists, services } = useApp()
  if (!reservations.length) return null

  return (
    <section className="rounded-3xl border-2 border-sky-400 bg-sky-50 p-4 shadow-sm" aria-label="ลูกค้าจองใกล้ถึงเวลา">
      <h2 className="mb-3 flex items-center gap-2 text-2xl font-bold text-sky-950">
        <BellRing size={28} className="text-sky-700" aria-hidden="true" /> ลูกค้าจองใกล้ถึงเวลา
      </h2>
      <div className="space-y-3">
        {reservations.map((r) => {
          const diff = minutesBetween(now, r.start)
          return (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4">
              <div>
                <p className="text-2xl font-bold text-stone-900">
                  {timeHM(r.start)} · {r.customerName}
                </p>
                <p className="text-lg text-stone-700">
                  {services[r.serviceId]?.title} {minutesText(r.minutes)} · {r.therapistId ? therapists[r.therapistId]?.name : 'หมอคนไหนก็ได้'}
                </p>
                <p className={`text-lg font-bold ${diff < 0 ? 'text-red-700' : 'text-sky-800'}`}>
                  {diff > 0 ? `อีก ${minutesText(diff)}` : diff === 0 ? 'ถึงเวลาแล้ว' : `เลยเวลานัด ${minutesText(-diff)}`}
                </p>
              </div>
              <Button size="lg" variant="blue" icon={DoorOpen} onClick={() => onArrive(r)}>
                ลูกค้ามาแล้ว
              </Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function PosPage() {
  const { db, currentShift, therapists, services, extendBooking } = useApp()
  const now = useNow(15000)
  const [openSheet, setOpenSheet] = useState(null) // { roomId } | { reservation }
  const [checkoutBooking, setCheckoutBooking] = useState(null)

  const active = activeBookings(db.bookings)
  const upcoming = upcomingReservations(db.reservations, now, 30, 30)
  const todaySummary = currentShift ? summarize(shiftRecords(db, currentShift.id)) : null

  return (
    <div className="space-y-6">
      {!currentShift ? <OpenShiftCard /> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ห้องว่าง" value={`${db.rooms.length - active.length} ห้อง`} tone="green" />
        <Stat label="กำลังนวด" value={`${active.length} ห้อง`} tone="amber" />
        <Stat label="ลูกค้าวันนี้" value={`${todaySummary?.bills ?? 0} คน`} />
        <Stat label="ยอดขายวันนี้" value={`${money(todaySummary?.revenue ?? 0)}`} hint="บาท" tone="blue" />
      </div>

      <ReservationAlerts reservations={upcoming} now={now} onArrive={(reservation) => setOpenSheet({ reservation })} />

      <QueueStrip therapists={db.therapists} bookings={db.bookings} now={now} />

      <section>
        <SectionTitle icon={DoorOpen}>ห้องนวด</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {db.rooms.map((room) => {
            const booking = active.find((b) => b.roomId === room.id)
            const reservation = db.reservations.find(
              (r) => r.status === 'booked' && r.roomId === room.id && minutesBetween(now, r.start) <= 60 && minutesBetween(now, r.start) >= -30,
            )
            return (
              <RoomCard
                key={room.id}
                room={room}
                booking={booking}
                therapist={booking ? therapists[booking.therapistId] : null}
                service={booking ? services[booking.serviceId] : null}
                reservation={reservation}
                now={now}
                onOpen={() => setOpenSheet({ roomId: room.id })}
                onCheckout={setCheckoutBooking}
                onExtend={(b) => extendBooking(b.id, 30)}
              />
            )
          })}
        </div>
      </section>

      {openSheet ? (
        <OpenRoomSheet roomId={openSheet.roomId} reservation={openSheet.reservation} onClose={() => setOpenSheet(null)} />
      ) : null}
      {checkoutBooking ? <CheckoutSheet booking={checkoutBooking} onClose={() => setCheckoutBooking(null)} /> : null}
    </div>
  )
}

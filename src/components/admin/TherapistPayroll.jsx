import { Clock3, Wallet } from 'lucide-react'

export default function TherapistPayroll({ therapists, services, bookings, paidTherapists, markTherapistPaid, formatCurrency }) {
  const serviceMap = Object.fromEntries(services.map((service) => [service.id, service]))

  const rows = therapists.map((therapist) => {
    const completedBookings = bookings.filter(
      (booking) => booking.therapistId === therapist.id && booking.status === 'completed',
    )

    const sessions = completedBookings.length
    const totalHours = completedBookings.reduce((sum, booking) => {
      const service = serviceMap[booking.serviceId]
      return sum + (service ? service.duration_minutes / 60 : 0)
    }, 0)

    const payout = completedBookings.reduce((sum, booking) => {
      const service = serviceMap[booking.serviceId]
      return sum + (service ? Number(service.therapist_commission) : 0)
    }, 0)

    return {
      ...therapist,
      sessions,
      totalHours,
      payout,
      paid: !!paidTherapists[therapist.id],
    }
  })

  return (
    <div className="space-y-3">
      {rows.map((therapist) => (
        <div key={therapist.id} className="flex flex-col gap-3 rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-stone-800">{therapist.name}</p>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                {therapist.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-stone-600">
              <span className="flex items-center gap-1"><Clock3 size={15} /> {therapist.sessions} รอบ</span>
              <span className="flex items-center gap-1"><Wallet size={15} /> {therapist.totalHours.toFixed(1)} ชม.</span>
              <span className="font-bold text-stone-800">{formatCurrency(therapist.payout)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => markTherapistPaid(therapist.id)}
            disabled={therapist.paid}
            className={`min-h-[56px] rounded-2xl px-5 py-3 text-sm font-bold transition ${
              therapist.paid
                ? 'bg-stone-200 text-stone-600'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {therapist.paid ? 'จ่ายแล้ว' : 'ยืนยันจ่ายแล้ว'}
          </button>
        </div>
      ))}
    </div>
  )
}

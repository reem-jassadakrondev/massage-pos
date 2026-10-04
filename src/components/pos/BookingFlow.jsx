import { CalendarClock, CheckCircle2 } from 'lucide-react'

export default function BookingFlow({
  therapists,
  services,
  rooms,
  bookings,
  selectedTherapistId,
  selectedServiceId,
  selectedRoomId,
  customDuration,
  setCustomDuration,
  customerName,
  setCustomerName,
  onSelectTherapist,
  onSelectService,
  onCreateBooking,
}) {
  const availableTherapists = therapists.filter((therapist) => therapist.status !== 'off_duty')
  const safeSelectedTherapistId = availableTherapists.some((therapist) => therapist.id === selectedTherapistId)
    ? selectedTherapistId
    : availableTherapists[0]?.id ?? ''
  const safeSelectedServiceId = services.some((service) => service.id === selectedServiceId)
    ? selectedServiceId
    : services[0]?.id ?? ''
  const safeSelectedRoomId = rooms.some((room) => room.id === selectedRoomId)
    ? selectedRoomId
    : rooms[0]?.id ?? ''

  const selectedTherapist = therapists.find((therapist) => therapist.id === safeSelectedTherapistId) ?? therapists[0]
  const selectedService = services.find((service) => service.id === safeSelectedServiceId) ?? services[0]
  const selectedRoom = rooms.find((room) => room.id === safeSelectedRoomId) ?? rooms[0]
  const bookingRoomId = selectedRoom?.id ?? safeSelectedRoomId ?? rooms[0]?.id
  const therapistHasActiveBooking = (therapistId) =>
    (bookings || []).some((booking) => booking.therapistId === therapistId && booking.status === 'active')

  const activeDuration = Math.max(30, Number(customDuration) || selectedService?.duration_minutes || 60)
  const baseHourRate = selectedService ? Number(selectedService.price) : 0
  const calculatedTotal = selectedService ? Math.round((baseHourRate / 60) * activeDuration) : 0
  const startTime = new Date()
  const endTime = new Date(startTime.getTime() + activeDuration * 60000)

  return (
    <div className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">เปิดคิวใหม่</p>
          <h3 className="mt-1 text-xl font-bold text-stone-800">เลือกหมอนวดและบริการ</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
          <label className="mb-2 block text-sm font-semibold text-stone-700">ชื่อลูกค้า</label>
          <input
            type="text"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="ลูกค้าใหม่"
            className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-white px-4 text-base outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-stone-700">1. เลือกหมอนวด</p>
          <div className="grid grid-cols-2 gap-2">
            {therapists.map((therapist) => {
              const isDisabled = therapist.status === 'off_duty' || therapist.status === 'busy' || therapistHasActiveBooking(therapist.id)

              return (
                <button
                  key={therapist.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelectTherapist(therapist.id)}
                  className={`min-h-[56px] rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${
                    safeSelectedTherapistId === therapist.id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-stone-200 bg-stone-50 text-stone-700'
                  } ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{therapist.name}</span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        therapist.status === 'busy' ? 'bg-amber-500' : therapist.status === 'off_duty' ? 'bg-stone-400' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-stone-700">2. เลือกบริการ</p>
          <div className="space-y-2">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  onSelectService(service.id)
                  setCustomDuration(service.duration_minutes)
                }}
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${
                  safeSelectedServiceId === service.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-stone-200 bg-stone-50'
                }`}
              >
                <div>
                  <div className="text-base font-bold text-stone-800">{service.title}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-700">{service.price}</div>
                  <div className="text-xs text-stone-500">บาท</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-stone-700">ระบุเวลา</span>
              <span className="text-sm font-bold text-emerald-700">{activeDuration} นาที</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 90, 120].map((minute) => (
                <button
                  key={minute}
                  type="button"
                  onClick={() => setCustomDuration(minute)}
                  className={`min-h-[44px] rounded-xl border px-2 py-2 text-sm font-bold ${
                    activeDuration === minute
                      ? 'border-emerald-500 bg-emerald-100 text-emerald-700'
                      : 'border-stone-200 bg-white text-stone-700'
                  }`}
                >
                  {minute}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={30}
              step={15}
              value={activeDuration}
              onChange={(event) => setCustomDuration(Number(event.target.value) || 30)}
              className="mt-3 min-h-[52px] w-full rounded-2xl border border-stone-200 bg-white px-4 text-base outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[26px] border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-600">
          <CalendarClock size={16} />
          เวลาเริ่ม / สิ้นสุด
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-stone-200 bg-white p-2 text-stone-700">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">เริ่ม</div>
            <div className="mt-1 text-lg font-black text-stone-800">{startTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-2 text-stone-700">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">สิ้นสุด</div>
            <div className="mt-1 text-lg font-black text-stone-800">{endTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">
          <span>ห้องที่เลือก</span>
          <span className="font-bold text-stone-800">{selectedRoom?.room_name ?? 'ยังไม่ได้เลือก'}</span>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-stone-600">รวม</span>
            <span className="text-xl font-black text-stone-800">{calculatedTotal} บาท</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!selectedTherapist || !selectedService || !bookingRoomId) {
              return
            }

            onCreateBooking({
              therapistId: selectedTherapist.id,
              serviceId: selectedService.id,
              roomId: bookingRoomId,
              customMinutes: activeDuration,
              customerName: customerName || 'ลูกค้าใหม่',
            })
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-4 text-base font-black text-white shadow-md transition hover:bg-emerald-500"
        >
          <CheckCircle2 size={20} />
          บันทึกเริ่มนวด
        </button>
      </div>
    </div>
  )
}

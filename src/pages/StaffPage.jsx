import { useState } from 'react'
import { ClipboardList, HandCoins, LogIn, LogOut, Users } from 'lucide-react'
import { Avatar, Button, Choices, Empty, Field, Modal, MoneyInput, Pill, SectionTitle } from '../components/ui'
import { useApp } from '../context/AppContext'
import useNow from '../hooks/useNow'
import { DAY, isSameDay, minutesBetween, minutesText, money, startOfDay, timeHM } from '../lib/format'
import { payCells, payRows, paySettings } from '../lib/payroll'
import { activeBookings, therapistQueue } from '../lib/selectors'

function AdvanceDialog({ therapist, owed, showPay, onClose }) {
  const { addAdvance } = useApp()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('เบิกล่วงหน้า')

  const submit = () => addAdvance({ therapistId: therapist.id, amount, note }) && onClose()

  return (
    <Modal
      title={`${therapist.name} เบิกเงิน`}
      subtitle={showPay ? `ยอดค้างจ่ายตอนนี้ ${money(owed)} บาท (ค่ามือ + ทิป − เบิก)` : 'เจ้าของร้านจะเห็นรายการเบิกนี้'}
      onClose={onClose}
      size="max-w-xl"
      footer={
        <Button size="xl" className="w-full" icon={HandCoins} onClick={submit} disabled={!Number(amount)}>
          จ่ายเงินเบิก {amount ? `${money(amount)} บาท` : ''}
        </Button>
      }
    >
      <Field label="จำนวนเงิน">
        <MoneyInput value={amount} onChange={setAmount} autoFocus />
      </Field>
      <div className="mt-3 flex flex-wrap gap-2">
        {[100, 200, 300, 500].map((v) => (
          <Button key={v} variant="secondary" onClick={() => setAmount(String(v))}>
            {v}
          </Button>
        ))}
      </div>
      <h3 className="mb-3 mt-6 text-lg font-bold text-stone-800">เบิกไปทำอะไร</h3>
      <Choices value={note} onChange={setNote} columns="grid-cols-3" options={['เบิกล่วงหน้า', 'ค่ารถ', 'ค่าข้าว'].map((v) => ({ value: v, label: v }))} />
      <p className="mt-5 text-base text-stone-600">จ่ายเงินสดจากลิ้นชัก และหักออกตอนจ่ายค่าหมอ</p>
    </Modal>
  )
}

export default function StaffPage() {
  const { db, currentShift, isOwner, rooms, services, therapists, clockIn, clockOut } = useApp()
  const pay = paySettings(db.settings)
  const showPay = isOwner || pay.cashierSeesPay
  const now = useNow(30000)
  const [advanceFor, setAdvanceFor] = useState(null)
  const [filter, setFilter] = useState('all')

  const active = activeBookings(db.bookings)
  const queue = therapistQueue(db.therapists, db.bookings)
  const todayStart = startOfDay(now)
  const today = Object.fromEntries(
    payRows(payCells(db, todayStart, new Date(todayStart.getTime() + DAY)), db.therapists).map((r) => [r.therapistId, r]),
  )
  const owed = Object.fromEntries(
    payRows(payCells(db, new Date(0), new Date(todayStart.getTime() + DAY)), db.therapists).map((r) => [r.therapistId, r.unpaid]),
  )

  const attendanceToday = (therapistId) => {
    const today = db.attendance.filter((a) => a.therapistId === therapistId && isSameDay(a.inAt, now))
    return { firstIn: today[0]?.inAt, lastOut: today.length && today.every((a) => a.outAt) ? today[today.length - 1].outAt : null }
  }

  const todayLog = db.bookings
    .filter((b) => isSameDay(b.start, now))
    .filter((b) => filter === 'all' || b.therapistId === filter)
    .sort((a, b) => new Date(b.start) - new Date(a.start))

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle icon={Users} action={<span className="text-lg text-stone-600">รับลูกค้าแล้วต่อท้ายคิว · ลูกค้าขอหมอ ไม่เสียคิว</span>}>
          หมอนวดวันนี้
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {db.therapists.map((therapist) => {
            const job = active.find((b) => b.therapistId === therapist.id)
            const position = queue.findIndex((t) => t.id === therapist.id)
            const { firstIn, lastOut } = attendanceToday(therapist.id)
            const day = today[therapist.id]

            return (
              <div
                key={therapist.id}
                className={`flex flex-col rounded-3xl border-2 bg-white p-5 shadow-sm ${
                  job ? 'border-amber-400' : therapist.onDuty ? 'border-emerald-400' : 'border-stone-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Avatar therapist={therapist} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-extrabold text-stone-900">{therapist.name}</p>
                    {job ? (
                      <Pill tone="amber">กำลังนวด · {rooms[job.roomId]?.room_name}</Pill>
                    ) : therapist.onDuty ? (
                      <Pill tone="green">{position === 0 ? 'ว่าง · ถึงคิว' : `ว่าง · คิวที่ ${position + 1}`}</Pill>
                    ) : (
                      <Pill tone="gray">ยังไม่เข้างาน</Pill>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-1 text-lg text-stone-800">
                  <p>
                    เข้างาน: <b className="tabular-nums">{firstIn ? timeHM(firstIn) : '—'}</b>
                    {lastOut ? (
                      <>
                        {' '}· เลิกงาน: <b className="tabular-nums">{timeHM(lastOut)}</b>
                      </>
                    ) : null}
                  </p>
                  {job ? (
                    <p>
                      ว่างอีก <b>{minutesText(Math.max(0, minutesBetween(now, job.end)))}</b> (เลิก {timeHM(job.end)})
                    </p>
                  ) : null}
                </div>

                {day ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-stone-100 p-3 text-center">
                    <div>
                      <p className="text-base text-stone-600">นวดแล้ว</p>
                      <p className="text-xl font-bold">{day.jobs} รอบ</p>
                    </div>
                    {showPay ? (
                      <>
                        <div>
                          <p className="text-base text-stone-600">{day.topUp ? 'รายได้ (การันตี)' : 'ค่ามือ+ทิป'}</p>
                          <p className="text-xl font-bold tabular-nums">{money(day.earned)}</p>
                        </div>
                        <div>
                          <p className="text-base text-stone-600">เบิกไป</p>
                          <p className="text-xl font-bold tabular-nums">{money(day.advance)}</p>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <p className="text-base text-stone-600">เวลานวดรวม</p>
                        <p className="text-xl font-bold">{minutesText(day.minutes)}</p>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="mt-4 grid flex-1 grid-cols-2 items-end gap-3">
                  {therapist.onDuty ? (
                    <Button variant="secondary" size="lg" icon={LogOut} onClick={() => clockOut(therapist.id)} disabled={!!job}>
                      เลิกงาน
                    </Button>
                  ) : (
                    <Button size="lg" icon={LogIn} onClick={() => clockIn(therapist.id)}>
                      เข้างาน
                    </Button>
                  )}
                  <Button variant="warning" size="lg" icon={HandCoins} onClick={() => setAdvanceFor(therapist)} disabled={!currentShift}>
                    เบิกเงิน
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <SectionTitle icon={ClipboardList}>บันทึกงานวันนี้</SectionTitle>
        <div className="mb-4">
          <Choices
            value={filter}
            onChange={setFilter}
            columns="grid-cols-3 sm:grid-cols-6"
            options={[{ value: 'all', label: 'ทุกคน' }, ...db.therapists.map((t) => ({ value: t.id, label: t.name }))]}
          />
        </div>

        {todayLog.length ? (
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1.1fr_1fr_1fr_1.3fr_0.8fr_1fr] gap-3 border-b-2 border-stone-200 bg-stone-50 px-5 py-3 text-lg font-bold text-stone-700 md:grid">
              <span>ขึ้น – ลง</span>
              <span>หมอ</span>
              <span>ห้อง</span>
              <span>รายการ</span>
              <span>เวลา</span>
              <span>สถานะ</span>
            </div>
            {todayLog.map((b) => (
              <div
                key={b.id}
                className={`grid grid-cols-2 gap-x-3 gap-y-1 border-b border-stone-100 px-5 py-4 text-lg md:grid-cols-[1.1fr_1fr_1fr_1.3fr_0.8fr_1fr] md:items-center ${
                  b.status === 'void' ? 'text-stone-400 line-through' : 'text-stone-900'
                }`}
              >
                <span className="font-bold tabular-nums">
                  {timeHM(b.start)} – {timeHM(b.finishedAt ?? b.end)}
                </span>
                <span className="font-semibold">{therapists[b.therapistId]?.name}</span>
                <span>{rooms[b.roomId]?.room_name}</span>
                <span>{services[b.serviceId]?.title}</span>
                <span className="tabular-nums">{(b.minutes / 60).toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.</span>
                <span className="no-underline">
                  {b.status === 'active' ? <Pill tone="amber">กำลังนวด</Pill> : b.status === 'void' ? <Pill tone="gray">ยกเลิก</Pill> : <Pill tone="green">เสร็จ</Pill>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>วันนี้ยังไม่มีงาน</Empty>
        )}
      </section>

      {advanceFor ? <AdvanceDialog therapist={advanceFor} owed={owed[advanceFor.id] ?? 0} showPay={showPay} onClose={() => setAdvanceFor(null)} /> : null}
    </div>
  )
}

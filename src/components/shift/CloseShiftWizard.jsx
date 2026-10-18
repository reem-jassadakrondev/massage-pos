import { useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, EyeOff, Lock, Minus, Plus, Printer } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { isSameDay, money, timeHM } from '../../lib/format'
import { printShiftSlip } from '../../lib/print'
import { CYCLE_LABEL, paySettings } from '../../lib/payroll'
import { activeBookings } from '../../lib/selectors'
import { Avatar, Button, Field, Modal, MoneyInput, PinPad, TextInput } from '../ui'

const NOTES = [1000, 500, 100, 50, 20]
const NOTE_COLORS = {
  1000: 'bg-stone-300 text-stone-900',
  500: 'bg-violet-200 text-violet-950',
  100: 'bg-red-200 text-red-950',
  50: 'bg-sky-200 text-sky-950',
  20: 'bg-emerald-200 text-emerald-950',
}
const STEPS = ['เช็คห้อง', 'สรุปยอด', 'จ่ายค่ามือ', 'นับเงิน']

function Row({ label, value, strong, tone }) {
  const color = tone === 'red' ? 'text-red-700' : tone === 'green' ? 'text-emerald-700' : 'text-stone-900'
  return (
    <div className={`flex items-baseline justify-between gap-3 border-b border-stone-100 py-2 ${strong ? 'text-2xl font-extrabold' : 'text-xl'}`}>
      <span className="text-stone-700">{label}</span>
      <span className={`tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

export function DifferenceBadge({ difference, size = 'text-2xl' }) {
  if (difference === 0) return <span className={`font-extrabold text-emerald-700 ${size}`}>ยอดตรง ✓</span>
  return (
    <span className={`font-extrabold ${difference > 0 ? 'text-sky-700' : 'text-red-700'} ${size}`}>
      {difference > 0 ? 'เงินเกิน' : 'เงินขาด'} {money(Math.abs(difference))} บาท
    </span>
  )
}

export default function CloseShiftWizard({ onClose, onGoPos }) {
  const { db, currentShift, rooms, therapists, isOwner, checkPin, previewClose, closeShift } = useApp()
  const pay = paySettings(db.settings)
  const [step, setStep] = useState(0)
  const [paidIds, setPaidIds] = useState(() => (previewClose([])?.payouts ?? []).filter((p) => p.unpaid > 0).map((p) => p.therapistId))
  const [payUnlocked, setPayUnlocked] = useState(isOwner || pay.cashierSeesPay)
  const [askPin, setAskPin] = useState(false)
  const [notes, setNotes] = useState({})
  const [coins, setCoins] = useState('')
  const [note, setNote] = useState('')
  const [closed, setClosed] = useState(null)

  const print = (shift) => printShiftSlip({ shopName: db.settings.shopName, shift, showProfit: isOwner, showPay: payUnlocked })

  if (closed) {
    return (
      <Modal
        title="ปิดรอบเรียบร้อย"
        onClose={onClose}
        size="max-w-lg"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" icon={Printer} onClick={() => print(closed)}>
              พิมพ์ใบสรุป
            </Button>
            <Button size="lg" onClick={onClose}>
              เสร็จ
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center">
          <Lock size={64} className="text-emerald-700" aria-hidden="true" />
          <p className="mt-3 text-xl text-stone-700">ยอดขายรอบนี้</p>
          <p className="text-5xl font-extrabold tabular-nums">{money(closed.summary.revenue)} บาท</p>
          <div className="mt-4">
            <DifferenceBadge difference={closed.difference} size="text-3xl" />
          </div>
          <p className="mt-4 text-lg text-stone-600">ยอดของรอบนี้ถูกล็อกแล้ว · หมอทุกคนถูกบันทึกเลิกงาน</p>
        </div>
      </Modal>
    )
  }

  const active = activeBookings(db.bookings)
  const preview = previewClose(paidIds)
  const { summary, payouts } = preview
  const counted = NOTES.reduce((total, n) => total + n * (Number(notes[n]) || 0), 0) + (Number(coins) || 0)
  const difference = counted - preview.expectedCash
  const waitingReservations = db.reservations.filter((r) => r.status === 'booked' && isSameDay(r.start, new Date())).length

  const setNote_ = (n, value) => setNotes((current) => ({ ...current, [n]: Math.max(0, value) }))
  const togglePaid = (id) => setPaidIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const finish = () => {
    const result = closeShift({ countedCash: counted, note, paidTherapistIds: paidIds })
    if (result) setClosed(result)
  }

  const canNext = step === 0 ? active.length === 0 : true

  if (askPin) {
    return (
      <PinPad
        subtitle="ดูยอดค่าหมอ"
        onClose={() => setAskPin(false)}
        onSubmit={(pin) => {
          if (!checkPin(pin)) return false
          setPayUnlocked(true)
          setAskPin(false)
          return true
        }}
      />
    )
  }

  return (
    <Modal
      title="ปิดรอบของวัน"
      subtitle={`เปิดรอบเมื่อ ${timeHM(currentShift.openedAt)} · ขั้นที่ ${step + 1} จาก ${STEPS.length}: ${STEPS[step]}`}
      onClose={onClose}
      size="max-w-3xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => (step ? setStep(step - 1) : onClose())}>
            {step ? 'ย้อนกลับ' : 'ยกเลิก'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="xl" onClick={() => setStep(step + 1)} disabled={!canNext}>
              ถัดไป <ArrowRight size={28} aria-hidden="true" />
            </Button>
          ) : (
            <Button size="xl" icon={Lock} onClick={finish} disabled={counted === 0 && preview.expectedCash > 0}>
              ยืนยันปิดรอบ
            </Button>
          )}
        </div>
      }
    >
      {/* Progress */}
      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="ขั้นตอน">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-xl px-2 py-2 text-center text-base font-bold ${
              index === step ? 'bg-stone-800 text-white' : index < step ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-200 text-stone-600'
            }`}
          >
            {index < step ? '✓ ' : `${index + 1}. `}
            {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        active.length ? (
          <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-5">
            <p className="flex items-center gap-2 text-2xl font-extrabold text-red-800">
              <AlertTriangle size={30} aria-hidden="true" /> ยังคิดเงินไม่ครบ {active.length} ห้อง
            </p>
            <ul className="mt-3 space-y-1 text-xl text-red-900">
              {active.map((b) => (
                <li key={b.id}>
                  • {rooms[b.roomId]?.room_name} — {therapists[b.therapistId]?.name} ({b.customerName})
                </li>
              ))}
            </ul>
            <Button size="lg" className="mt-4" onClick={onGoPos}>
              ไปหน้าร้าน เพื่อคิดเงิน
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5">
            <p className="flex items-center gap-2 text-2xl font-extrabold text-emerald-800">
              <CheckCircle2 size={30} aria-hidden="true" /> ทุกห้องคิดเงินเรียบร้อย
            </p>
            {waitingReservations ? (
              <p className="mt-2 text-xl text-amber-800">มีลูกค้าจองวันนี้ที่ยังไม่มา {waitingReservations} คิว (ไม่กระทบการปิดรอบ)</p>
            ) : null}
          </div>
        )
      ) : null}

      {step === 1 ? (
        <div>
          <Row label="จำนวนบิล" value={`${summary.bills} บิล`} />
          {summary.voided ? <Row label="บิลที่ยกเลิก" value={`${summary.voided} บิล`} tone="red" /> : null}
          <Row label="รับเงินสด" value={`${money(summary.cash)} บาท`} />
          <Row label="รับโอน / QR" value={`${money(summary.qr)} บาท`} />
          {summary.discount ? <Row label="ส่วนลดที่ให้ไป" value={`${money(summary.discount)} บาท`} /> : null}
          {summary.tips ? <Row label="ทิป (เป็นของหมอ)" value={`${money(summary.tips)} บาท`} /> : null}
          <Row label="รายจ่ายจากลิ้นชัก" value={`${money(summary.expenseTotal)} บาท`} />
          {summary.advanceTotal ? <Row label="หมอเบิกล่วงหน้า" value={`${money(summary.advanceTotal)} บาท`} /> : null}
          <Row label="ยอดขาย (หลังส่วนลด)" value={`${money(summary.revenue)} บาท`} strong />
          {isOwner && summary.topUp ? <Row label="ร้านเติมเงินการันตีหมอ" value={`${money(summary.topUp)} บาท`} /> : null}
          {isOwner ? <Row label="กำไรสุทธิ" value={`${money(summary.profit)} บาท`} strong tone="green" /> : null}
        </div>
      ) : null}

      {step === 2 ? (
        pay.cycle !== 'daily' ? (
          <div className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-5">
            <p className="flex items-center gap-2 text-2xl font-extrabold text-sky-900">
              <CalendarClock size={30} aria-hidden="true" /> ร้านนี้จ่ายค่าหมอ{CYCLE_LABEL[pay.cycle]}
            </p>
            <p className="mt-2 text-xl text-sky-900">ปิดรอบวันนี้ไม่ต้องจ่ายค่าหมอ · เจ้าของร้านจ่ายที่เมนู "ค่าหมอ" เมื่อครบรอบ</p>
          </div>
        ) : !payUnlocked ? (
          <div className="rounded-2xl border-2 border-stone-300 bg-white p-5 text-center">
            <EyeOff size={48} className="mx-auto text-stone-500" aria-hidden="true" />
            <p className="mt-2 text-2xl font-extrabold text-stone-900">ยอดค่าหมอ ให้เจ้าของร้านดู</p>
            <p className="mt-1 text-xl text-stone-700">รวมที่ต้องจ่ายวันนี้ {money(preview.payoutsPaid)} บาท</p>
            <Button size="lg" className="mt-4" icon={Lock} onClick={() => setAskPin(true)}>
              ให้เจ้าของร้านใส่ PIN
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-lg text-stone-700">
              ค่ามือ{pay.guaranteeEnabled ? ` (การันตีขั้นต่ำ ${money(pay.guaranteeAmount)}/วัน)` : ''} + ทิป{pay.tipMode === 'pooled' ? 'กองกลาง' : ''} − เบิก · แตะเพื่อเลือกว่าจ่ายเงินสดตอนนี้
            </p>
            {payouts.length ? (
              payouts.map((p) => {
                const paid = paidIds.includes(p.therapistId)
                const owes = p.unpaid <= 0
                const carried = p.unpaidDays.length > 1
                return (
                  <button
                    key={p.therapistId}
                    type="button"
                    disabled={owes}
                    onClick={() => togglePaid(p.therapistId)}
                    aria-pressed={paid}
                    className={`flex w-full flex-wrap items-center gap-4 rounded-2xl border-2 p-4 text-left ${
                      paid && !owes ? 'border-emerald-600 bg-emerald-50' : 'border-stone-300 bg-white'
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 ${paid && !owes ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-400'}`}>
                      {paid && !owes ? '✓' : ''}
                    </span>
                    <Avatar therapist={therapists[p.therapistId]} size="sm" />
                    <div className="min-w-[200px] flex-1">
                      <p className="text-xl font-bold">{p.name}</p>
                      <p className="text-base text-stone-600">
                        {p.jobs} รอบ · ค่ามือ {money(p.commission)}
                        {p.topUp ? ` + การันตี ${money(p.topUp)}` : ''} + ทิป {money(p.tips)} − เบิก {money(p.advance)}
                      </p>
                      {carried ? <p className="text-base font-bold text-amber-800">รวมยอดค้างจากวันก่อน ({p.unpaidDays.length} วัน)</p> : null}
                    </div>
                    <span className={`text-2xl font-extrabold tabular-nums ${owes && p.unpaid < 0 ? 'text-red-700' : ''}`}>
                      {p.unpaid < 0 ? `ติดร้าน ${money(-p.unpaid)}` : `${money(p.unpaid)} บาท`}
                    </span>
                  </button>
                )
              })
            ) : (
              <p className="text-xl text-stone-600">ไม่มีค่าหมอค้างจ่าย</p>
            )}
            <p className="text-base text-stone-600">คนที่ไม่ได้ติ๊ก หรือติดร้าน จะยกยอดไปรวมกับวันถัดไป</p>
            <Row label="จ่ายค่าหมอจากลิ้นชักรวม" value={`${money(preview.payoutsPaid)} บาท`} strong />
          </div>
        )
      ) : null}

      {step === 3 ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-2">
            <p className="mb-2 text-lg text-stone-700">นับธนบัตรในลิ้นชัก แล้วกด + / − ตามจำนวนใบ</p>
            {NOTES.map((n) => {
              const count = Number(notes[n]) || 0
              return (
                <div key={n} className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-2">
                  <span className={`w-20 rounded-lg py-2 text-center text-xl font-extrabold ${NOTE_COLORS[n]}`}>{n}</span>
                  <Button variant="secondary" icon={Minus} onClick={() => setNote_(n, count - 1)} disabled={!count} aria-label={`ลดแบงก์ ${n}`} />
                  <input
                    inputMode="numeric"
                    aria-label={`จำนวนแบงก์ ${n}`}
                    value={count || ''}
                    placeholder="0"
                    onChange={(e) => setNote_(n, Number(e.target.value.replace(/\D/g, '')) || 0)}
                    className="h-[52px] w-16 rounded-xl border-2 border-stone-300 text-center text-2xl font-bold tabular-nums"
                  />
                  <Button variant="secondary" icon={Plus} onClick={() => setNote_(n, count + 1)} aria-label={`เพิ่มแบงก์ ${n}`} />
                  <span className="ml-auto text-xl font-bold tabular-nums">{money(n * count)}</span>
                </div>
              )
            })}
            <Field label="เหรียญรวม">
              <MoneyInput value={coins} onChange={setCoins} />
            </Field>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-stone-100 p-4">
              <Row label="เงินทอนตั้งต้น" value={money(currentShift.openingCash)} />
              <Row label="+ รับเงินสด" value={money(summary.cash)} />
              <Row label="− รายจ่าย" value={money(summary.expenseTotal)} />
              {summary.advanceTotal ? <Row label="− หมอเบิก" value={money(summary.advanceTotal)} /> : null}
              {summary.payoutTotal ? <Row label="− จ่ายค่าหมอระหว่างวัน" value={money(summary.payoutTotal)} /> : null}
              {pay.cycle === 'daily' ? <Row label="− จ่ายค่าหมอตอนปิดรอบ" value={money(preview.payoutsPaid)} /> : null}
              <Row label="ควรมีในลิ้นชัก" value={`${money(preview.expectedCash)} บาท`} strong />
            </div>
            <div className={`rounded-2xl border-2 p-4 ${difference === 0 ? 'border-emerald-500 bg-emerald-50' : difference > 0 ? 'border-sky-400 bg-sky-50' : 'border-red-400 bg-red-50'}`}>
              <p className="text-xl text-stone-700">นับได้</p>
              <p className="text-5xl font-extrabold tabular-nums">{money(counted)} บาท</p>
              <div className="mt-2">{counted ? <DifferenceBadge difference={difference} /> : <span className="text-xl text-stone-600">ยังไม่ได้นับ</span>}</div>
            </div>
            {counted && difference !== 0 ? (
              <Field label="หมายเหตุ (ทำไมเงินไม่ตรง)">
                <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ทอนเงินผิด" />
              </Field>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

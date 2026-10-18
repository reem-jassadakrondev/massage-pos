import { useState } from 'react'
import { Ban, Banknote, CheckCircle2, Minus, Plus, Printer, QrCode, Split } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { minutesText, money, timeHM } from '../../lib/format'
import { paySettings } from '../../lib/payroll'
import { billTotals } from '../../lib/pricing'
import { printReceipt } from '../../lib/print'
import PromptPayQR from '../PromptPayQR'
import VoidDialog from '../VoidDialog'
import { Avatar, Button, Choices, Field, Modal, MoneyInput } from '../ui'

const DISCOUNTS = [
  { value: 'none', label: 'ไม่มี', discount: { type: 'none', value: 0 } },
  { value: 'p10', label: '10%', discount: { type: 'percent', value: 10 } },
  { value: 'p20', label: '20%', discount: { type: 'percent', value: 20 } },
  { value: 'b50', label: 'ลด 50', discount: { type: 'baht', value: 50 } },
  { value: 'b100', label: 'ลด 100', discount: { type: 'baht', value: 100 } },
  { value: 'custom', label: 'ใส่เอง' },
]

const TIPS = [
  { value: '0', label: 'ไม่มี' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
  { value: 'custom', label: 'ใส่เอง' },
]

function Line({ label, value, strong }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? 'text-2xl font-extrabold text-stone-900' : 'text-xl text-stone-700'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function Done({ booking, onClose }) {
  const { db, therapists, services, rooms } = useApp()
  const change = booking.received - booking.payCash

  const print = () =>
    printReceipt({
      shopName: db.settings.shopName,
      booking,
      therapistName: therapists[booking.therapistId]?.name,
      serviceTitle: services[booking.serviceId]?.title,
      roomName: rooms[booking.roomId]?.room_name,
    })

  return (
    <Modal
      title="รับเงินเรียบร้อย"
      onClose={onClose}
      size="max-w-lg"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" icon={Printer} onClick={print}>
            พิมพ์ใบเสร็จ
          </Button>
          <Button size="lg" onClick={onClose}>
            เสร็จ
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 size={72} className="text-emerald-600" aria-hidden="true" />
        <p className="mt-3 text-xl text-stone-700">ยอดรับ</p>
        <p className="text-5xl font-extrabold tabular-nums text-stone-900">{money(booking.total)} บาท</p>
        {change > 0 ? (
          <div className="mt-5 w-full rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4">
            <p className="text-xl font-bold text-emerald-900">ทอนเงินลูกค้า</p>
            <p className="text-5xl font-extrabold tabular-nums text-emerald-800">{money(change)} บาท</p>
          </div>
        ) : null}
        <p className="mt-4 text-lg text-stone-600">{rooms[booking.roomId]?.room_name} ว่างแล้ว</p>
      </div>
    </Modal>
  )
}

export default function CheckoutSheet({ booking: initial, onClose }) {
  const { db, therapists, services, rooms, checkout, extendBooking } = useApp()
  // Re-read from the store so time adjustments show up immediately.
  const booking = db.bookings.find((b) => b.id === initial.id) ?? initial

  const [discountKey, setDiscountKey] = useState('none')
  const [customDiscount, setCustomDiscount] = useState('')
  const [tipKey, setTipKey] = useState('0')
  const [customTip, setCustomTip] = useState('')
  const [method, setMethod] = useState('cash')
  const [received, setReceived] = useState('')
  const [cashPart, setCashPart] = useState('')
  const [paid, setPaid] = useState(null)
  const [voiding, setVoiding] = useState(false)

  if (paid) return <Done booking={paid} onClose={onClose} />
  if (voiding) return <VoidDialog booking={booking} onClose={() => setVoiding(false)} onDone={onClose} />

  const therapist = therapists[booking.therapistId]
  const service = services[booking.serviceId]
  const pooledTips = paySettings(db.settings).tipMode === 'pooled'
  const discount =
    discountKey === 'custom' ? { type: 'baht', value: Number(customDiscount) || 0 } : DISCOUNTS.find((d) => d.value === discountKey).discount
  const tip = tipKey === 'custom' ? Number(customTip) || 0 : Number(tipKey)
  const totals = billTotals(booking.price, discount, tip)

  const cashDue = method === 'cash' ? totals.total : method === 'split' ? Math.min(Number(cashPart) || 0, totals.total) : 0
  const qrDue = totals.total - cashDue
  const receivedNumber = Number(received) || 0
  const change = receivedNumber - cashDue
  const notEnough = method !== 'qr' && received !== '' && receivedNumber < cashDue
  const quickCash = [...new Set([Math.ceil(cashDue / 100) * 100, Math.ceil(cashDue / 500) * 500, 1000])].filter((v) => v > cashDue).slice(0, 3)

  const submit = () => {
    const result = checkout(booking.id, {
      discount,
      tip,
      method,
      cashPart: cashDue,
      received: received === '' ? cashDue : receivedNumber,
    })
    if (result) setPaid(result)
  }

  return (
    <Modal
      title={`คิดเงิน ${rooms[booking.roomId]?.room_name}`}
      subtitle={`${booking.customerName} · เริ่ม ${timeHM(booking.start)}`}
      onClose={onClose}
      size="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" icon={Ban} onClick={() => setVoiding(true)} className="text-red-700">
            ยกเลิกคิวนี้
          </Button>
          <Button size="xl" icon={CheckCircle2} onClick={submit} disabled={notEnough || (method === 'split' && !cashDue)} className="min-w-[260px]">
            รับเงิน {money(totals.total)} บาท
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <Avatar therapist={therapist} />
              <div>
                <p className="text-2xl font-bold text-stone-900">{service?.title}</p>
                <p className="text-lg text-stone-700">{therapist?.name}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button variant="secondary" icon={Minus} onClick={() => extendBooking(booking.id, -30)} disabled={booking.minutes <= 30} aria-label="ลด 30 นาที">
                30
              </Button>
              <p className="text-2xl font-extrabold text-stone-900">{minutesText(booking.minutes)}</p>
              <Button variant="secondary" icon={Plus} onClick={() => extendBooking(booking.id, 30)} aria-label="เพิ่ม 30 นาที">
                30
              </Button>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xl font-bold text-stone-900">ส่วนลด</h3>
            <Choices value={discountKey} onChange={setDiscountKey} columns="grid-cols-3" options={DISCOUNTS.map(({ value, label }) => ({ value, label }))} />
            {discountKey === 'custom' ? (
              <MoneyInput className="mt-3" value={customDiscount} onChange={setCustomDiscount} placeholder="ลดกี่บาท" autoFocus />
            ) : null}
          </div>

          <div>
            <h3 className="mb-1 text-xl font-bold text-stone-900">{pooledTips ? 'ทิป (เข้ากองกลาง)' : `ทิปให้${therapist?.name}`}</h3>
            <p className="mb-3 text-base text-stone-600">
              {pooledTips ? 'ทิปรวมทั้งร้าน แล้วหารให้หมอทุกคนที่มาทำงานวันนี้' : 'เงินทิปเป็นของหมอทั้งหมด ไม่นับเป็นรายได้ร้าน'}
            </p>
            <Choices value={tipKey} onChange={setTipKey} columns="grid-cols-3 sm:grid-cols-5" options={TIPS} />
            {tipKey === 'custom' ? <MoneyInput className="mt-3" value={customTip} onChange={setCustomTip} placeholder="ทิปกี่บาท" autoFocus /> : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2 rounded-2xl bg-stone-100 p-4">
            <Line label={`ค่านวด ${minutesText(booking.minutes)}`} value={money(totals.price)} />
            {totals.discount ? <Line label="ส่วนลด" value={`-${money(totals.discount)}`} /> : null}
            {totals.tip ? <Line label={pooledTips ? 'ทิปกองกลาง' : 'ทิปหมอ'} value={`+${money(totals.tip)}`} /> : null}
            <div className="border-t-2 border-stone-300 pt-2">
              <Line label="ยอดที่ต้องรับ" value={`${money(totals.total)} บาท`} strong />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xl font-bold text-stone-900">ลูกค้าจ่ายด้วย</h3>
            <Choices
              value={method}
              onChange={setMethod}
              columns="grid-cols-3"
              options={[
                { value: 'cash', label: 'เงินสด', badge: <Banknote size={30} className="text-emerald-700" /> },
                { value: 'qr', label: 'โอน / QR', badge: <QrCode size={30} className="text-sky-700" /> },
                { value: 'split', label: 'แบ่งจ่าย', badge: <Split size={30} className="text-violet-700" /> },
              ]}
            />
          </div>

          {method === 'split' ? (
            <Field label="จ่ายเงินสดเท่าไหร่" hint={`ที่เหลือ ${money(qrDue)} บาท โอนผ่าน QR`}>
              <MoneyInput value={cashPart} onChange={setCashPart} placeholder="เงินสด" />
            </Field>
          ) : null}

          {method !== 'qr' && cashDue > 0 ? (
            <div>
              <Field label="รับเงินสดมา">
                <MoneyInput value={received} onChange={setReceived} placeholder={money(cashDue)} />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setReceived(String(cashDue))}>
                  พอดี
                </Button>
                {quickCash.map((amount) => (
                  <Button key={amount} variant="secondary" onClick={() => setReceived(String(amount))}>
                    {money(amount)}
                  </Button>
                ))}
              </div>
              {received !== '' ? (
                notEnough ? (
                  <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xl font-bold text-red-800">เงินไม่พอ ขาดอีก {money(cashDue - receivedNumber)} บาท</p>
                ) : change > 0 ? (
                  <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-2xl font-extrabold text-emerald-800">ทอน {money(change)} บาท</p>
                ) : null
              ) : null}
            </div>
          ) : null}

          {qrDue > 0 && method !== 'cash' ? <PromptPayQR promptPayId={db.settings.promptPayId} amount={qrDue} /> : null}
        </div>
      </div>
    </Modal>
  )
}

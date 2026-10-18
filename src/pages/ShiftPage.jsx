import { useState } from 'react'
import { Ban, History, Lock, Printer, ReceiptText, Trash2, Wallet } from 'lucide-react'
import CloseShiftWizard, { DifferenceBadge } from '../components/shift/CloseShiftWizard'
import OpenShiftCard from '../components/shift/OpenShiftCard'
import VoidDialog from '../components/VoidDialog'
import { Button, Card, Choices, ConfirmDialog, Empty, Modal, MoneyInput, Pill, SectionTitle, Stat, TextInput } from '../components/ui'
import { useApp } from '../context/AppContext'
import { dateLong, dateWithDay, isSameDay, money, timeHM } from '../lib/format'
import { paySettings } from '../lib/payroll'
import { printReceipt, printShiftSlip } from '../lib/print'
import { shiftRecords, summarize } from '../lib/selectors'

const QUICK_EXPENSES = ['น้ำแข็ง', 'น้ำดื่มลูกค้า', 'ซักผ้า', 'ข้าวพนักงาน', 'น้ำมันนวด', 'อื่นๆ']

function ExpenseBox({ expenses }) {
  const { addExpense, deleteExpense } = useApp()
  const [title, setTitle] = useState('น้ำแข็ง')
  const [other, setOther] = useState('')
  const [amount, setAmount] = useState('')
  const [removing, setRemoving] = useState(null)

  const submit = () => {
    const ok = addExpense({ title: title === 'อื่นๆ' ? other : title, amount, category: title === 'อื่นๆ' ? 'อื่นๆ' : 'ค่าใช้จ่ายร้าน' })
    if (ok) {
      setAmount('')
      setOther('')
    }
  }

  return (
    <Card>
      <SectionTitle icon={Wallet}>จ่ายเงินออกจากลิ้นชัก</SectionTitle>
      <Choices value={title} onChange={setTitle} columns="grid-cols-2 sm:grid-cols-3" options={QUICK_EXPENSES.map((v) => ({ value: v, label: v }))} />
      {title === 'อื่นๆ' ? <TextInput className="mt-3" value={other} onChange={(e) => setOther(e.target.value)} placeholder="ซื้ออะไร" /> : null}
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
        <MoneyInput value={amount} onChange={setAmount} placeholder="จำนวนเงิน" />
        <Button size="lg" onClick={submit} disabled={!Number(amount)}>
          บันทึก
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        {expenses.length ? (
          expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 px-4 py-2">
              <div>
                <p className="text-lg font-bold">{e.title}</p>
                <p className="text-base text-stone-600">{timeHM(e.time)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tabular-nums">{money(e.amount)}</span>
                <Button variant="ghost" size="sm" icon={Trash2} aria-label={`ลบ ${e.title}`} onClick={() => setRemoving(e)} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-lg text-stone-600">ยังไม่มีรายจ่าย</p>
        )}
      </div>

      {removing ? (
        <ConfirmDialog
          title="ลบรายจ่ายนี้?"
          message={`${removing.title} ${money(removing.amount)} บาท`}
          confirmLabel="ลบ"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            deleteExpense(removing.id)
            setRemoving(null)
          }}
        />
      ) : null}
    </Card>
  )
}

function BillList({ bookings, onVoid }) {
  const { db, therapists, services, rooms } = useApp()
  const bills = bookings
    .filter((b) => b.status !== 'active' && (b.paidAt || b.voidedAt))
    .sort((a, b) => new Date(b.paidAt ?? b.voidedAt) - new Date(a.paidAt ?? a.voidedAt))

  const print = (b) =>
    printReceipt({
      shopName: db.settings.shopName,
      booking: b,
      therapistName: therapists[b.therapistId]?.name,
      serviceTitle: services[b.serviceId]?.title,
      roomName: rooms[b.roomId]?.room_name,
    })

  return (
    <Card>
      <SectionTitle icon={ReceiptText}>บิลของรอบนี้</SectionTitle>
      {bills.length ? (
        <div className="space-y-2">
          {bills.map((b) => {
            const isVoid = b.status === 'void'
            return (
              <div key={b.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 px-4 py-3 ${isVoid ? 'bg-stone-100' : 'bg-white'}`}>
                <span className="w-16 text-xl font-bold tabular-nums text-stone-700">{timeHM(b.paidAt ?? b.voidedAt)}</span>
                <div className="min-w-[160px] flex-1">
                  <p className={`text-xl font-bold ${isVoid ? 'text-stone-500 line-through' : ''}`}>{b.customerName}</p>
                  <p className="text-base text-stone-600">
                    {services[b.serviceId]?.title} · {therapists[b.therapistId]?.name}
                    {isVoid ? ` · ยกเลิก: ${b.voidReason}` : ''}
                  </p>
                </div>
                {isVoid ? (
                  <Pill tone="gray">ยกเลิกแล้ว</Pill>
                ) : (
                  <>
                    <Pill tone={b.payQr && b.payCash ? 'violet' : b.payQr ? 'blue' : 'green'}>{b.payQr && b.payCash ? 'แบ่งจ่าย' : b.payQr ? 'QR' : 'เงินสด'}</Pill>
                    <span className="w-24 text-right text-2xl font-extrabold tabular-nums">{money(b.total)}</span>
                    <Button variant="secondary" size="sm" icon={Printer} onClick={() => print(b)}>
                      ใบเสร็จ
                    </Button>
                    <Button variant="ghost" size="sm" icon={Ban} className="text-red-700" onClick={() => onVoid(b)}>
                      ยกเลิกบิล
                    </Button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <Empty>ยังไม่มีบิลในรอบนี้</Empty>
      )}
    </Card>
  )
}

function ShiftDetail({ shift, onClose }) {
  const { db, isOwner } = useApp()
  const s = shift.summary
  const line = (label, value) => (
    <div className="flex justify-between gap-3 border-b border-stone-100 py-2 text-xl">
      <span className="text-stone-700">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  )

  return (
    <Modal
      title={`ปิดรอบ ${dateWithDay(shift.openedAt)}`}
      subtitle={`${timeHM(shift.openedAt)} – ${timeHM(shift.closedAt)}`}
      onClose={onClose}
      size="max-w-xl"
      footer={
        <Button size="lg" className="w-full" icon={Printer} onClick={() => printShiftSlip({ shopName: db.settings.shopName, shift, showProfit: isOwner, showPay: isOwner || paySettings(db.settings).cashierSeesPay })}>
          พิมพ์ใบสรุป
        </Button>
      }
    >
      {line('จำนวนบิล', `${s.bills} บิล`)}
      {line('ยอดขาย', `${money(s.revenue)} บาท`)}
      {line('เงินสด / QR', `${money(s.cash)} / ${money(s.qr)}`)}
      {line('รายจ่าย', `${money(s.expenseTotal)} บาท`)}
      {line('จ่ายค่าหมอ', `${money(shift.payoutsPaid + (s.payoutTotal ?? 0))} บาท`)}
      {line('ควรมี / นับได้', `${money(shift.expectedCash)} / ${money(shift.countedCash)}`)}
      {isOwner ? line('กำไรสุทธิ', `${money(s.profit)} บาท`) : null}
      <div className="mt-3">
        <DifferenceBadge difference={shift.difference} />
        {shift.note ? <p className="mt-1 text-lg text-stone-700">หมายเหตุ: {shift.note}</p> : null}
      </div>
    </Modal>
  )
}

export default function ShiftPage({ onGoPos }) {
  const { db, currentShift } = useApp()
  const [closing, setClosing] = useState(false)
  const [voiding, setVoiding] = useState(null)
  const [detail, setDetail] = useState(null)
  const [showAllHistory, setShowAllHistory] = useState(false)

  const records = currentShift ? shiftRecords(db, currentShift.id) : null
  const summary = records ? summarize(records) : null
  const history = db.shifts.filter((s) => s.status === 'closed').sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt))

  return (
    <div className="space-y-8">
      {currentShift ? (
        <>
          <section className="rounded-3xl border-2 border-stone-300 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg text-stone-600">รอบที่เปิดอยู่</p>
                <h2 className="text-3xl font-extrabold text-stone-900">{dateLong(currentShift.openedAt)}</h2>
                <p className="text-xl text-stone-700">
                  เปิดเมื่อ {timeHM(currentShift.openedAt)} · เงินทอนตั้งต้น {money(currentShift.openingCash)} บาท
                </p>
                {!isSameDay(currentShift.openedAt, new Date()) ? (
                  <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-lg font-bold text-red-800">รอบนี้เปิดค้างไว้ตั้งแต่วันก่อน กรุณาปิดรอบ</p>
                ) : null}
              </div>
              <Button size="xl" variant="dark" icon={Lock} onClick={() => setClosing(true)}>
                ปิดรอบ
              </Button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="ยอดขาย" value={money(summary.revenue)} hint="บาท" tone="blue" />
              <Stat label="เงินสด" value={money(summary.cash)} hint="บาท" tone="green" />
              <Stat label="โอน / QR" value={money(summary.qr)} hint="บาท" />
              <Stat label="จำนวนบิล" value={`${summary.bills}`} hint={summary.voided ? `ยกเลิก ${summary.voided} บิล` : 'บิล'} />
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <BillList bookings={records.bookings} onVoid={setVoiding} />
            <ExpenseBox expenses={records.expenses} />
          </div>
        </>
      ) : (
        <OpenShiftCard />
      )}

      <section>
        <SectionTitle icon={History}>ประวัติปิดรอบ</SectionTitle>
        {history.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(showAllHistory ? history : history.slice(0, 6)).map((shift) => (
              <button
                key={shift.id}
                type="button"
                onClick={() => setDetail(shift)}
                className="rounded-2xl border-2 border-stone-200 bg-white p-4 text-left shadow-sm hover:border-stone-400"
              >
                <p className="text-xl font-bold text-stone-900">{dateWithDay(shift.openedAt)}</p>
                <p className="text-3xl font-extrabold tabular-nums">{money(shift.summary.revenue)} บาท</p>
                <p className="text-lg text-stone-600">{shift.summary.bills} บิล</p>
                <div className="mt-1">
                  <DifferenceBadge difference={shift.difference} size="text-lg" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Empty>ยังไม่มีประวัติ</Empty>
        )}
        {!showAllHistory && history.length > 6 ? (
          <Button variant="secondary" size="lg" className="mt-4 w-full" onClick={() => setShowAllHistory(true)}>
            ดูประวัติทั้งหมด {history.length} รอบ
          </Button>
        ) : null}
      </section>

      {closing ? <CloseShiftWizard onClose={() => setClosing(false)} onGoPos={onGoPos} /> : null}
      {voiding ? <VoidDialog booking={voiding} onClose={() => setVoiding(null)} /> : null}
      {detail ? <ShiftDetail shift={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  )
}

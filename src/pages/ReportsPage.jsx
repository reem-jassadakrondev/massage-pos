import { useState } from 'react'
import { Ban, BarChart3, Clock3, HandCoins, Printer, ReceiptText, Trophy, Wallet } from 'lucide-react'
import { BarList, ColumnChart } from '../components/owner/Charts'
import { Button, Card, Choices, Empty, MoneyInput, Pill, SectionTitle, Stat, TextInput } from '../components/ui'
import { useApp } from '../context/AppContext'
import { DAY, dateShort, dateWithDay, money, timeHM } from '../lib/format'
import { printReport } from '../lib/print'
import { payCells, payRows } from '../lib/payroll'
import { inRange, paidBookings, periodRange, summarize } from '../lib/selectors'

const PERIODS = [
  { value: 'day', label: 'วันนี้' },
  { value: 'week', label: '7 วัน' },
  { value: 'month', label: '30 วัน' },
]

const methodLabel = (b) => (b.payQr && b.payCash ? 'แบ่งจ่าย' : b.payQr ? 'QR' : 'เงินสด')

function OwnerExpense() {
  const { addExpense } = useApp()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')

  const submit = () => {
    if (addExpense({ title, amount, category: 'ค่าใช้จ่ายร้าน', fromDrawer: false })) {
      setTitle('')
      setAmount('')
    }
  }

  return (
    <div className="mt-4 rounded-2xl bg-stone-50 p-4">
      <p className="mb-2 text-lg font-bold text-stone-800">เพิ่มรายจ่ายที่ไม่ได้จ่ายจากลิ้นชัก (เช่น ค่าไฟ ค่าเช่า)</p>
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="รายการ" />
        <MoneyInput value={amount} onChange={setAmount} />
        <Button size="lg" onClick={submit} disabled={!title.trim() || !Number(amount)}>
          บันทึก
        </Button>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const { db, therapists, services } = useApp()
  const [period, setPeriod] = useState('week')
  const [showAll, setShowAll] = useState(false)

  const { from, to, days } = periodRange(period)
  const bookings = db.bookings.filter((b) => inRange(b.paidAt ?? b.voidedAt ?? b.start, from, to))
  const paid = paidBookings(bookings).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
  const voided = db.bookings.filter((b) => b.status === 'void' && inRange(b.voidedAt, from, to))
  const expenses = db.expenses.filter((e) => inRange(e.time, from, to))
  const advances = db.advances.filter((a) => inRange(a.time, from, to))
  const payouts = payRows(payCells(db, from, to), db.therapists).sort((a, b) => b.revenue - a.revenue)
  const topUp = payouts.reduce((total, p) => total + p.topUp, 0)
  const summary = summarize({ bookings: paid, expenses, advances, topUp })
  const periodName = PERIODS.find((p) => p.value === period).label

  // Revenue per day (or per hour for "today").
  const byDay = Array.from({ length: days }, (_, i) => {
    const dayStart = new Date(from.getTime() + i * DAY)
    const dayEnd = new Date(dayStart.getTime() + DAY)
    const value = paid.filter((b) => inRange(b.paidAt, dayStart, dayEnd)).reduce((t, b) => t + b.net, 0)
    return {
      key: dayStart.getTime(),
      label: days > 7 ? String(dayStart.getDate()) : dateWithDay(dayStart).split(' ')[0],
      value,
      tooltip: `${dateShort(dayStart)} · ${money(value)} บาท`,
    }
  })

  // Customers by starting hour.
  const hourCounts = paid.reduce((acc, b) => {
    const h = new Date(b.start).getHours()
    return { ...acc, [h]: (acc[h] || 0) + 1 }
  }, {})
  const hours = Object.keys(hourCounts).map(Number)
  const fromHour = Math.min(db.settings.openHour, ...hours)
  const toHour = Math.max(db.settings.closeHour - 1, ...hours)
  const byHour = Array.from({ length: toHour - fromHour + 1 }, (_, i) => {
    const h = fromHour + i
    const value = hourCounts[h] || 0
    return { key: h, label: `${h}`, value, tooltip: `${String(h).padStart(2, '0')}:00 น. · ${value} คน` }
  })
  const peak = byHour.reduce((best, h) => (h.value > (best?.value ?? -1) ? h : best), null)

  const print = () =>
    printReport({
      shopName: db.settings.shopName,
      title: `รายงาน ${periodName} (${dateShort(from)} – ${dateShort(new Date(to.getTime() - 1))})`,
      summary,
      payouts,
      rows: paid.map((b) => ({
        date: dateShort(b.paidAt),
        time: timeHM(b.paidAt),
        customer: b.customerName,
        service: services[b.serviceId]?.title ?? '',
        therapist: therapists[b.therapistId]?.name ?? '',
        method: methodLabel(b),
        amount: b.net,
      })),
    })

  const visibleBills = showAll ? paid : paid.slice(0, 20)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-md">
          <Choices value={period} onChange={setPeriod} columns="grid-cols-3" options={PERIODS} />
        </div>
        <Button variant="secondary" size="lg" icon={Printer} onClick={print}>
          พิมพ์รายงาน
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="ยอดขาย" value={money(summary.revenue)} hint="บาท (หลังส่วนลด)" tone="blue" />
        <Stat label="ค่ามือหมอ" value={money(summary.commission + summary.topUp)} hint={summary.topUp ? `รวมการันตี ${money(summary.topUp)} บาท` : 'บาท'} />
        <Stat label="รายจ่ายอื่น" value={money(summary.expenseTotal)} hint="บาท" />
        <Stat label="กำไรสุทธิ" value={money(summary.profit)} hint="บาท" tone="green" />
        <Stat label="ลูกค้า" value={`${summary.bills}`} hint="คน" />
        <Stat label="เฉลี่ยต่อบิล" value={money(summary.averageBill)} hint="บาท" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {days > 1 ? (
          <Card>
            <SectionTitle icon={BarChart3}>ยอดขายรายวัน</SectionTitle>
            <ColumnChart data={byDay} format={(v) => money(v)} labelEvery={days > 7 ? 3 : 1} ariaLabel="กราฟยอดขายรายวัน" />
          </Card>
        ) : null}
        <Card>
          <SectionTitle icon={Clock3} action={peak?.value ? <Pill tone="green">คนเยอะสุด {String(peak.key).padStart(2, '0')}:00 น.</Pill> : null}>
            ช่วงเวลาที่ลูกค้าเยอะ
          </SectionTitle>
          <ColumnChart data={byHour} format={(v) => Math.round(v)} labelEvery={2} ariaLabel="กราฟจำนวนลูกค้าตามช่วงเวลา" />
        </Card>
        <Card>
          <SectionTitle icon={Trophy}>หมอทำยอด</SectionTitle>
          {payouts.length ? (
            <BarList rows={payouts.map((p) => ({ key: p.therapistId, label: p.name, value: p.revenue, sub: `${p.jobs} รอบ` }))} format={(v) => `${money(v)} บาท`} />
          ) : (
            <Empty>ยังไม่มีข้อมูล</Empty>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle icon={HandCoins}>ค่ามือหมอ ({periodName})</SectionTitle>
        {payouts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-lg">
              <thead>
                <tr className="border-b-2 border-stone-200 text-left text-stone-700">
                  <th className="py-2">หมอนวด</th>
                  <th className="py-2 text-right">รอบ</th>
                  <th className="py-2 text-right">ค่ามือ</th>
                  <th className="py-2 text-right">การันตี</th>
                  <th className="py-2 text-right">ทิป</th>
                  <th className="py-2 text-right">เบิก</th>
                  <th className="py-2 text-right">สุทธิ</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.therapistId} className="border-b border-stone-100">
                    <td className="py-3 font-bold">{p.name}</td>
                    <td className="py-3 text-right tabular-nums">{p.jobs}</td>
                    <td className="py-3 text-right tabular-nums">{money(p.commission)}</td>
                    <td className="py-3 text-right tabular-nums">{p.topUp ? money(p.topUp) : '—'}</td>
                    <td className="py-3 text-right tabular-nums">{money(p.tips)}</td>
                    <td className="py-3 text-right tabular-nums">{money(p.advance)}</td>
                    <td className="py-3 text-right text-xl font-extrabold tabular-nums">{money(p.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>ยังไม่มีข้อมูล</Empty>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionTitle icon={Wallet}>รายจ่าย ({money(summary.expenseTotal)} บาท)</SectionTitle>
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {expenses.length ? (
              [...expenses]
                .sort((a, b) => new Date(b.time) - new Date(a.time))
                .map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 px-4 py-2">
                    <div>
                      <p className="text-lg font-bold">{e.title}</p>
                      <p className="text-base text-stone-600">
                        {dateShort(e.time)} {timeHM(e.time)} · {e.shiftId ? 'จ่ายจากลิ้นชัก' : 'จ่ายจากบัญชีร้าน'}
                      </p>
                    </div>
                    <span className="text-xl font-bold tabular-nums">{money(e.amount)}</span>
                  </div>
                ))
            ) : (
              <Empty>ไม่มีรายจ่าย</Empty>
            )}
          </div>
          <OwnerExpense />
        </Card>

        <Card>
          <SectionTitle icon={Ban}>บิลที่ถูกยกเลิก ({voided.length})</SectionTitle>
          {voided.length ? (
            <div className="space-y-2">
              {voided.map((b) => (
                <div key={b.id} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-lg font-bold">
                      {dateShort(b.voidedAt)} {timeHM(b.voidedAt)} · {b.customerName}
                    </p>
                    <span className="text-xl font-bold tabular-nums">{money(b.total ?? b.price)}</span>
                  </div>
                  <p className="text-base text-stone-700">
                    เหตุผล: <b>{b.voidReason}</b> · โดย {b.voidedBy} · {therapists[b.therapistId]?.name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <Empty>ไม่มีบิลถูกยกเลิก 👍</Empty>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle icon={ReceiptText}>รายการบิลทั้งหมด ({paid.length})</SectionTitle>
        {paid.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-lg">
              <thead>
                <tr className="border-b-2 border-stone-200 text-left text-stone-700">
                  <th className="py-2">วันที่</th>
                  <th className="py-2">ลูกค้า</th>
                  <th className="py-2">บริการ</th>
                  <th className="py-2">หมอ</th>
                  <th className="py-2">ชำระ</th>
                  <th className="py-2 text-right">ยอด</th>
                </tr>
              </thead>
              <tbody>
                {visibleBills.map((b) => (
                  <tr key={b.id} className="border-b border-stone-100">
                    <td className="py-2 tabular-nums">
                      {dateShort(b.paidAt)} {timeHM(b.paidAt)}
                    </td>
                    <td className="py-2">{b.customerName}</td>
                    <td className="py-2">{services[b.serviceId]?.title}</td>
                    <td className="py-2">{therapists[b.therapistId]?.name}</td>
                    <td className="py-2">{methodLabel(b)}</td>
                    <td className="py-2 text-right font-bold tabular-nums">{money(b.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paid.length > visibleBills.length ? (
              <Button variant="secondary" className="mt-4 w-full" onClick={() => setShowAll(true)}>
                แสดงทั้งหมด {paid.length} บิล
              </Button>
            ) : null}
          </div>
        ) : (
          <Empty>ยังไม่มีบิลในช่วงนี้</Empty>
        )}
      </Card>
    </div>
  )
}

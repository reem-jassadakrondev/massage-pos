import { useState } from 'react'
import { Banknote, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, HandCoins, History, Landmark, Wallet } from 'lucide-react'
import { Avatar, Button, Card, Choices, Empty, Modal, Pill, SectionTitle, Stat } from '../components/ui'
import { useApp } from '../context/AppContext'
import { dateShort, dateWithDay, money, timeHM } from '../lib/format'
import { CYCLE_LABEL, dayFromKey, payCells, payPeriod, payRows, paySettings, shiftPayPeriod, sumRows } from '../lib/payroll'
import { inRange } from '../lib/selectors'

function PayDialog({ row, onClose }) {
  const { currentShift, therapists, payTherapist } = useApp()
  const [fromDrawer, setFromDrawer] = useState(!!currentShift)

  const submit = () => payTherapist({ therapistId: row.therapistId, days: row.unpaidDays, amount: row.unpaid, fromDrawer }) && onClose()

  return (
    <Modal
      title={`จ่ายค่าหมอ ${row.name}`}
      subtitle={`${row.unpaidDays.length} วันที่ยังไม่ได้จ่าย`}
      onClose={onClose}
      size="max-w-xl"
      footer={
        <Button size="xl" className="w-full" icon={HandCoins} onClick={submit}>
          จ่าย {money(row.unpaid)} บาท
        </Button>
      }
    >
      <div className="flex items-center gap-3">
        <Avatar therapist={therapists[row.therapistId]} size="lg" />
        <p className="text-5xl font-extrabold tabular-nums">{money(row.unpaid)} บาท</p>
      </div>
      <h3 className="mb-3 mt-6 text-xl font-bold">จ่ายด้วย</h3>
      <Choices
        value={fromDrawer}
        onChange={setFromDrawer}
        columns="grid-cols-2"
        size="lg"
        options={[
          { value: true, label: 'เงินสดจากลิ้นชัก', sub: currentShift ? 'หักจากเงินในลิ้นชักรอบนี้' : 'ต้องเปิดรอบก่อน', disabled: !currentShift, badge: <Banknote size={28} className="text-emerald-700" /> },
          { value: false, label: 'โอนจากบัญชีร้าน', sub: 'ไม่กระทบเงินในลิ้นชัก', badge: <Landmark size={28} className="text-sky-700" /> },
        ]}
      />
    </Modal>
  )
}

function DayTable({ cells }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[620px] text-lg">
        <thead>
          <tr className="border-b-2 border-stone-200 text-left text-base text-stone-600">
            <th className="py-2">วัน</th>
            <th className="py-2 text-right">รอบ</th>
            <th className="py-2 text-right">ค่ามือ</th>
            <th className="py-2 text-right">การันตี</th>
            <th className="py-2 text-right">ทิป</th>
            <th className="py-2 text-right">เบิก</th>
            <th className="py-2 text-right">สุทธิ</th>
            <th className="py-2 text-right">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((c) => (
            <tr key={c.key} className="border-b border-stone-100">
              <td className="py-2">{dateWithDay(dayFromKey(c.day))}</td>
              <td className="py-2 text-right tabular-nums">{c.jobs}</td>
              <td className="py-2 text-right tabular-nums">{money(c.commission)}</td>
              <td className="py-2 text-right tabular-nums">{c.topUp ? money(c.topUp) : '—'}</td>
              <td className="py-2 text-right tabular-nums">{money(c.tips)}</td>
              <td className="py-2 text-right tabular-nums">{c.advance ? money(c.advance) : '—'}</td>
              <td className="py-2 text-right font-bold tabular-nums">{money(c.net)}</td>
              <td className="py-2 text-right">{c.paid ? <Pill tone="green">จ่ายแล้ว</Pill> : <Pill tone="amber">ค้าง</Pill>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PayrollPage() {
  const { db, therapists } = useApp()
  const pay = paySettings(db.settings)
  const [anchor, setAnchor] = useState(new Date())
  const [paying, setPaying] = useState(null)
  const [open, setOpen] = useState(null)

  const period = payPeriod(pay.cycle, anchor)
  const rows = payRows(payCells(db, period.from, period.to), db.therapists)
  const advances = db.advances.filter((a) => inRange(a.time, period.from, period.to)).sort((a, b) => new Date(b.time) - new Date(a.time))
  const payouts = db.payouts.filter((p) => inRange(p.paidAt, period.from, period.to)).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
  const isCurrent = period.from.getTime() === payPeriod(pay.cycle).from.getTime()

  const rules = [
    `จ่าย${CYCLE_LABEL[pay.cycle]}`,
    pay.guaranteeEnabled ? `การันตีขั้นต่ำ ${money(pay.guaranteeAmount)} บาท/วัน` : 'ไม่มีการันตี',
    pay.tipMode === 'pooled' ? `ทิปรวมกองกลาง หาร${pay.tipSplit === 'by_jobs' ? 'ตามจำนวนรอบ' : 'เท่ากัน'}` : 'ทิปเป็นของหมอคนที่นวด',
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="lg" icon={ChevronLeft} aria-label="ก่อนหน้า" onClick={() => setAnchor(shiftPayPeriod(pay.cycle, anchor, -1))} />
          <Button variant={isCurrent ? 'dark' : 'secondary'} size="lg" onClick={() => setAnchor(new Date())}>
            {pay.cycle === 'daily' ? 'วันนี้' : pay.cycle === 'weekly' ? 'สัปดาห์นี้' : 'เดือนนี้'}
          </Button>
          <Button variant="secondary" size="lg" icon={ChevronRight} aria-label="ถัดไป" onClick={() => setAnchor(shiftPayPeriod(pay.cycle, anchor, 1))} />
          <h2 className="ml-2 text-2xl font-bold text-stone-900">{period.label}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {rules.map((rule) => (
            <Pill key={rule} tone="violet">
              {rule}
            </Pill>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="ยังค้างจ่าย" value={money(sumRows(rows, (r) => Math.max(0, r.unpaid)))} hint="บาท" tone="amber" big />
        <Stat label="จ่ายแล้ว" value={money(sumRows(rows, (r) => r.paidTotal))} hint="บาท" tone="green" />
        <Stat label="ร้านเติมการันตี" value={money(sumRows(rows, (r) => r.topUp))} hint="บาท" />
        <Stat label="ทิปรวม" value={money(sumRows(rows, (r) => r.tips))} hint="บาท" />
        <Stat label="เบิกรวม" value={money(sumRows(rows, (r) => r.advance))} hint="บาท" />
      </div>

      <section>
        <SectionTitle icon={HandCoins}>ค่าหมอรายคน</SectionTitle>
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((r) => {
              const expanded = open === r.therapistId
              const settled = !r.unpaidDays.length
              return (
                <Card key={r.therapistId} className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Avatar therapist={therapists[r.therapistId]} />
                    <div className="min-w-[220px] flex-1">
                      <p className="text-2xl font-bold">{r.name}</p>
                      <p className="text-lg text-stone-700">
                        มา {r.days} วัน · {r.jobs} รอบ · ค่ามือ {money(r.commission)}
                        {r.topUp ? ` + การันตี ${money(r.topUp)}` : ''} + ทิป {money(r.tips)} − เบิก {money(r.advance)}
                      </p>
                    </div>
                    {settled ? (
                      <Pill tone="green">จ่ายครบแล้ว {money(r.paidTotal)} บาท</Pill>
                    ) : r.unpaid <= 0 ? (
                      <Pill tone="red">ติดร้าน {money(-r.unpaid)} บาท</Pill>
                    ) : (
                      <Button size="lg" icon={Wallet} onClick={() => setPaying(r)}>
                        จ่าย {money(r.unpaid)} บาท
                      </Button>
                    )}
                    <Button variant="ghost" icon={expanded ? ChevronUp : ChevronDown} onClick={() => setOpen(expanded ? null : r.therapistId)}>
                      รายวัน
                    </Button>
                  </div>
                  {expanded ? <DayTable cells={r.cells} /> : null}
                </Card>
              )
            })}
          </div>
        ) : (
          <Empty>ช่วงนี้ยังไม่มีหมอเข้างาน</Empty>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionTitle icon={Banknote}>รายการเบิกเงิน ({advances.length})</SectionTitle>
          {advances.length ? (
            <div className="space-y-2">
              {advances.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3">
                  <div>
                    <p className="text-lg font-bold">
                      {therapists[a.therapistId]?.name} · {a.note}
                    </p>
                    <p className="text-base text-stone-600">
                      {dateShort(a.time)} {timeHM(a.time)} · บันทึกโดย {a.by ?? 'แคชเชียร์'}
                    </p>
                  </div>
                  <span className="text-xl font-extrabold tabular-nums">{money(a.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty>ไม่มีการเบิกเงิน</Empty>
          )}
        </Card>

        <Card>
          <SectionTitle icon={History}>ประวัติการจ่ายค่าหมอ ({payouts.length})</SectionTitle>
          {payouts.length ? (
            <div className="max-h-[480px] space-y-2 overflow-y-auto">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 px-4 py-3">
                  <div>
                    <p className="text-lg font-bold">{therapists[p.therapistId]?.name}</p>
                    <p className="text-base text-stone-600">
                      {dateShort(p.paidAt)} {timeHM(p.paidAt)} · {p.by} · {p.days.length} วัน
                    </p>
                  </div>
                  <span className="text-xl font-extrabold tabular-nums">{money(p.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty>ยังไม่มีการจ่าย</Empty>
          )}
        </Card>
      </div>

      {paying ? <PayDialog row={paying} onClose={() => setPaying(null)} /> : null}
    </div>
  )
}

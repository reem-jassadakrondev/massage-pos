import { useState } from 'react'
import { DoorOpen, HandCoins, Pencil, Plus, RotateCcw, Sparkles, Store, Trash2, Users } from 'lucide-react'
import { Avatar, Button, Card, Choices, ConfirmDialog, Field, Modal, MoneyInput, SectionTitle, TextInput, Toggle } from '../components/ui'
import { useApp } from '../context/AppContext'
import { digitsOnly, minutesText, phoneText } from '../lib/format'
import { paySettings } from '../lib/payroll'
import { isValidPromptPayId } from '../lib/promptpay'

const ROOM_TYPES = [
  { value: 'body', label: 'นวดตัว' },
  { value: 'foot', label: 'นวดเท้า' },
  { value: 'vip', label: 'VIP' },
]

function ServiceForm({ service, onClose }) {
  const { saveService } = useApp()
  const [form, setForm] = useState({
    title: service?.title ?? '',
    duration_minutes: String(service?.duration_minutes ?? 60),
    price: String(service?.price ?? ''),
    therapist_commission: String(service?.therapist_commission ?? ''),
  })
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Modal
      title={service ? 'แก้ไขบริการ' : 'เพิ่มบริการ'}
      onClose={onClose}
      size="max-w-xl"
      footer={
        <Button size="xl" className="w-full" onClick={() => saveService(form, service?.id) && onClose()}>
          บันทึก
        </Button>
      }
    >
      <div className="space-y-5">
        <Field label="ชื่อบริการ">
          <TextInput value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="เช่น นวดแผนไทย" />
        </Field>
        <Field group label="เวลา (นาที)">
          <Choices
            value={form.duration_minutes}
            onChange={set('duration_minutes')}
            columns="grid-cols-3 sm:grid-cols-5"
            options={['30', '60', '90', '120', '180'].map((v) => ({ value: v, label: minutesText(Number(v)) }))}
          />
        </Field>
        <Field label="ราคา">
          <MoneyInput value={form.price} onChange={set('price')} />
        </Field>
        <Field label="ค่ามือหมอ" hint="ถ้านวดเกินหรือขาดเวลา ระบบคิดราคาและค่ามือตามสัดส่วนเวลาให้อัตโนมัติ">
          <MoneyInput value={form.therapist_commission} onChange={set('therapist_commission')} />
        </Field>
      </div>
    </Modal>
  )
}

function TherapistForm({ therapist, onClose }) {
  const { saveTherapist } = useApp()
  const [name, setName] = useState(therapist?.name ?? '')
  const [nickname, setNickname] = useState(therapist?.nickname ?? '')
  return (
    <Modal
      title={therapist ? 'แก้ไขหมอนวด' : 'เพิ่มหมอนวด'}
      onClose={onClose}
      size="max-w-xl"
      footer={
        <Button size="xl" className="w-full" onClick={() => saveTherapist({ name, nickname }, therapist?.id) && onClose()}>
          บันทึก
        </Button>
      }
    >
      <div className="space-y-5">
        <Field label="ชื่อที่ใช้เรียก">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น หมอแดง" />
        </Field>
        <Field label="ชื่อเล่น (ใช้เป็นตัวอักษรในวงกลม)">
          <TextInput value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="เช่น แดง" />
        </Field>
      </div>
    </Modal>
  )
}

function RoomForm({ room, onClose }) {
  const { saveRoom } = useApp()
  const [name, setName] = useState(room?.room_name ?? '')
  const [type, setType] = useState(room?.type ?? 'body')
  return (
    <Modal
      title={room ? 'แก้ไขห้อง' : 'เพิ่มห้อง'}
      onClose={onClose}
      size="max-w-xl"
      footer={
        <Button size="xl" className="w-full" onClick={() => saveRoom({ room_name: name, type }, room?.id) && onClose()}>
          บันทึก
        </Button>
      }
    >
      <div className="space-y-5">
        <Field label="ชื่อห้อง / เตียง">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ห้องนวดไทย 4" />
        </Field>
        <Field group label="ประเภท">
          <Choices value={type} onChange={setType} columns="grid-cols-3" options={ROOM_TYPES} />
        </Field>
      </div>
    </Modal>
  )
}

function ListRow({ leading, title, sub, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-bold text-stone-900">{title}</p>
        {sub ? <p className="text-base text-stone-600">{sub}</p> : null}
      </div>
      <Button variant="secondary" size="sm" icon={Pencil} onClick={onEdit}>
        แก้ไข
      </Button>
      <Button variant="ghost" size="sm" icon={Trash2} className="text-red-700" onClick={onDelete} aria-label={`ลบ ${title}`} />
    </div>
  )
}

function ShopSettings() {
  const { db, saveSettings } = useApp()
  const [shopName, setShopName] = useState(db.settings.shopName)
  const [promptPayId, setPromptPayId] = useState(db.settings.promptPayId)
  const [ownerPin, setOwnerPin] = useState(db.settings.ownerPin)
  const validPromptPay = isValidPromptPayId(promptPayId)

  return (
    <Card>
      <SectionTitle icon={Store}>ข้อมูลร้าน</SectionTitle>
      <div className="grid gap-5 lg:grid-cols-3">
        <Field label="ชื่อร้าน (พิมพ์บนใบเสร็จ)">
          <TextInput value={shopName} onChange={(e) => setShopName(e.target.value)} />
        </Field>
        <Field label="เบอร์พร้อมเพย์ / เลขบัตร ปชช." hint={validPromptPay ? `QR จะโอนเข้า ${phoneText(promptPayId)}` : 'ใส่เบอร์มือถือ 10 หลัก หรือเลข 13 หลัก'}>
          <TextInput inputMode="numeric" value={promptPayId} onChange={(e) => setPromptPayId(digitsOnly(e.target.value).slice(0, 13))} />
        </Field>
        <Field label="รหัส PIN เจ้าของร้าน (4 หลัก)">
          <TextInput inputMode="numeric" value={ownerPin} onChange={(e) => setOwnerPin(digitsOnly(e.target.value).slice(0, 4))} />
        </Field>
      </div>
      <Button size="lg" className="mt-5" onClick={() => saveSettings({ shopName: shopName.trim() || db.settings.shopName, promptPayId, ownerPin })}>
        บันทึกข้อมูลร้าน
      </Button>
    </Card>
  )
}

function PaySettings() {
  const { db, saveSettings } = useApp()
  const [pay, setPay] = useState(() => {
    const current = paySettings(db.settings)
    return { ...current, guaranteeAmount: String(current.guaranteeAmount) }
  })
  const set = (key) => (value) => setPay((p) => ({ ...p, [key]: value }))

  return (
    <Card>
      <SectionTitle icon={HandCoins}>การจ่ายค่าหมอ</SectionTitle>
      <div className="grid gap-8 xl:grid-cols-2">
        <div className="space-y-6">
          <Field group label="จ่ายค่าหมอทุกๆ">
            <Choices
              value={pay.cycle}
              onChange={set('cycle')}
              columns="grid-cols-3"
              options={[
                { value: 'daily', label: 'รายวัน', sub: 'จ่ายตอนปิดรอบ' },
                { value: 'weekly', label: 'รายสัปดาห์', sub: 'จ-อา' },
                { value: 'monthly', label: 'รายเดือน', sub: 'สิ้นเดือน' },
              ]}
            />
          </Field>
          <div>
            <Toggle
              checked={pay.guaranteeEnabled}
              onChange={set('guaranteeEnabled')}
              label="การันตีรายได้ขั้นต่ำต่อวัน"
              sub="วันที่มาทำงาน ถ้าค่ามือไม่ถึง ร้านเติมให้ครบ (ไม่นับทิป)"
            />
            {pay.guaranteeEnabled ? (
              <div className="mt-3">
                <MoneyInput value={pay.guaranteeAmount} onChange={set('guaranteeAmount')} />
                <p className="mt-2 text-base text-stone-600">
                  ตัวอย่าง: ค่ามือวันนี้ 360 → ได้ {Number(pay.guaranteeAmount || 0).toLocaleString('th-TH')} · ค่ามือ 900 → ได้ 900 ตามปกติ
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <Field group label="ทิป">
            <Choices
              value={pay.tipMode}
              onChange={set('tipMode')}
              columns="grid-cols-1 sm:grid-cols-2"
              options={[
                { value: 'personal', label: 'เป็นของหมอคนที่นวด' },
                { value: 'pooled', label: 'รวมทิปทั้งร้าน แล้วหารกัน' },
              ]}
            />
          </Field>
          {pay.tipMode === 'pooled' ? (
            <Field group label="หารทิปกองกลางยังไง (ทุกคนที่มาทำงานวันนั้น)">
              <Choices
                value={pay.tipSplit}
                onChange={set('tipSplit')}
                columns="grid-cols-2"
                options={[
                  { value: 'equal', label: 'หารเท่ากัน' },
                  { value: 'by_jobs', label: 'หารตามจำนวนรอบ', sub: 'นวดมากได้มาก' },
                ]}
              />
            </Field>
          ) : null}
          <Toggle
            checked={pay.cashierSeesPay}
            onChange={set('cashierSeesPay')}
            label="แคชเชียร์เห็นรายได้ของหมอ"
            sub={pay.cashierSeesPay ? 'แคชเชียร์เห็นค่ามือ ทิป ยอดค้างจ่าย' : 'แคชเชียร์เห็นแค่จำนวนรอบและชั่วโมง (แนะนำ)'}
          />
        </div>
      </div>
      <Button size="lg" className="mt-6" onClick={() => saveSettings({ pay: { ...pay, guaranteeAmount: Number(pay.guaranteeAmount) || 0 } })}>
        บันทึกการจ่ายค่าหมอ
      </Button>
    </Card>
  )
}

export default function SettingsPage() {
  const { db, deleteService, deleteTherapist, deleteRoom, resetDemo } = useApp()
  const [editing, setEditing] = useState(null) // { kind, item }
  const [deleting, setDeleting] = useState(null) // { label, run }
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className="space-y-8">
      <ShopSettings key={db.seededAt} />
      <PaySettings key={`pay-${db.seededAt}`} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <SectionTitle icon={Sparkles} action={<Button size="sm" icon={Plus} onClick={() => setEditing({ kind: 'service' })}>เพิ่ม</Button>}>
            บริการ / ราคา
          </SectionTitle>
          <div className="space-y-2">
            {db.services.map((s) => (
              <ListRow
                key={s.id}
                title={s.title}
                sub={`${minutesText(s.duration_minutes)} · ${s.price} บาท · ค่ามือ ${s.therapist_commission}`}
                onEdit={() => setEditing({ kind: 'service', item: s })}
                onDelete={() => setDeleting({ label: s.title, run: () => deleteService(s.id) })}
              />
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle icon={Users} action={<Button size="sm" icon={Plus} onClick={() => setEditing({ kind: 'therapist' })}>เพิ่ม</Button>}>
            หมอนวด
          </SectionTitle>
          <div className="space-y-2">
            {db.therapists.map((t) => (
              <ListRow
                key={t.id}
                leading={<Avatar therapist={t} size="sm" />}
                title={t.name}
                sub={`ชื่อเล่น ${t.nickname}`}
                onEdit={() => setEditing({ kind: 'therapist', item: t })}
                onDelete={() => setDeleting({ label: t.name, run: () => deleteTherapist(t.id) })}
              />
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle icon={DoorOpen} action={<Button size="sm" icon={Plus} onClick={() => setEditing({ kind: 'room' })}>เพิ่ม</Button>}>
            ห้องนวด
          </SectionTitle>
          <div className="space-y-2">
            {db.rooms.map((r) => (
              <ListRow
                key={r.id}
                title={r.room_name}
                sub={ROOM_TYPES.find((t) => t.value === r.type)?.label}
                onEdit={() => setEditing({ kind: 'room', item: r })}
                onDelete={() => setDeleting({ label: r.room_name, run: () => deleteRoom(r.id) })}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card className="border-2 border-dashed border-stone-300 bg-stone-50">
        <SectionTitle icon={RotateCcw}>ข้อมูลเดโม</SectionTitle>
        <p className="text-lg text-stone-700">ข้อมูลทั้งหมดเก็บอยู่ในเครื่องนี้ (รีเฟรชแล้วไม่หาย) กดรีเซ็ตเพื่อกลับไปเป็นข้อมูลตัวอย่างก่อนนำเสนอลูกค้ารายถัดไป</p>
        <Button variant="danger" size="lg" className="mt-4" icon={RotateCcw} onClick={() => setConfirmReset(true)}>
          รีเซ็ตข้อมูลเดโม
        </Button>
      </Card>

      {editing?.kind === 'service' ? <ServiceForm service={editing.item} onClose={() => setEditing(null)} /> : null}
      {editing?.kind === 'therapist' ? <TherapistForm therapist={editing.item} onClose={() => setEditing(null)} /> : null}
      {editing?.kind === 'room' ? <RoomForm room={editing.item} onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <ConfirmDialog
          title={`ลบ "${deleting.label}"?`}
          message="ถ้ามีประวัติการใช้งานแล้ว ระบบจะไม่ให้ลบ (ให้แก้ไขแทน)"
          confirmLabel="ลบ"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleting.run()
            setDeleting(null)
          }}
        />
      ) : null}
      {confirmReset ? (
        <ConfirmDialog
          title="รีเซ็ตข้อมูลเดโม?"
          message="ข้อมูลที่ทดลองกรอกไว้ทั้งหมดจะหายไป และกลับเป็นข้อมูลตัวอย่าง"
          confirmLabel="รีเซ็ต"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            resetDemo()
            setConfirmReset(false)
          }}
        />
      ) : null}
    </div>
  )
}

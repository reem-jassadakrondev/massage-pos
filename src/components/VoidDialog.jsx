import { useState } from 'react'
import { Ban } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Choices, Field, Modal, PinPad, TextInput } from './ui'

const REASONS = ['ลูกค้ายกเลิก', 'เปิดผิดห้อง / ผิดคน', 'คิดเงินผิด', 'อื่นๆ']

/** Cancel a running queue or a paid bill. A reason is required; cashiers need the owner's PIN. */
export default function VoidDialog({ booking, onClose, onDone }) {
  const { isOwner, checkPin, voidBooking } = useApp()
  const [reason, setReason] = useState(null)
  const [other, setOther] = useState('')
  const [askPin, setAskPin] = useState(false)

  const isActive = booking.status === 'active'
  const finalReason = reason === 'อื่นๆ' ? other.trim() : reason

  const run = (by) => {
    if (voidBooking(booking.id, finalReason, by)) {
      onDone?.()
      onClose()
    }
  }

  const submit = () => (isOwner ? run('เจ้าของร้าน') : setAskPin(true))

  if (askPin) {
    return (
      <PinPad
        title="ขออนุมัติจากเจ้าของร้าน"
        subtitle={`${isActive ? 'ยกเลิกคิว' : 'ยกเลิกบิล'} · ${finalReason}`}
        onClose={() => setAskPin(false)}
        onSubmit={(pin) => {
          if (!checkPin(pin)) return false
          run('แคชเชียร์ (เจ้าของอนุมัติ)')
          return true
        }}
      />
    )
  }

  return (
    <Modal
      title={isActive ? 'ยกเลิกคิวนี้' : 'ยกเลิกบิลนี้'}
      subtitle={`${booking.customerName} · ${(booking.total ?? booking.price).toLocaleString('th-TH')} บาท`}
      onClose={onClose}
      size="max-w-xl"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={onClose}>
            ไม่ยกเลิก
          </Button>
          <Button variant="danger" size="lg" icon={Ban} onClick={submit} disabled={!finalReason}>
            ยืนยันยกเลิก
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-lg text-stone-700">เลือกเหตุผล (ระบบจะเก็บประวัติไว้ให้เจ้าของร้านดู)</p>
      <Choices value={reason} onChange={setReason} columns="grid-cols-2" options={REASONS.map((r) => ({ value: r, label: r }))} />
      {reason === 'อื่นๆ' ? (
        <div className="mt-4">
          <Field label="เหตุผล">
            <TextInput value={other} onChange={(e) => setOther(e.target.value)} placeholder="พิมพ์เหตุผล" autoFocus />
          </Field>
        </div>
      ) : null}
      {!isOwner ? <p className="mt-4 text-base text-stone-600">ต้องให้เจ้าของร้านใส่รหัสอนุมัติ</p> : null}
    </Modal>
  )
}

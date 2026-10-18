import { QRCodeSVG } from 'qrcode.react'
import { baht, phoneText } from '../lib/format'
import { isValidPromptPayId, promptPayPayload } from '../lib/promptpay'

export default function PromptPayQR({ promptPayId, amount }) {
  if (!isValidPromptPayId(promptPayId)) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-lg text-amber-900">
        ยังไม่ได้ตั้งเบอร์พร้อมเพย์ของร้าน (เจ้าของร้าน → ตั้งค่า)
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-sky-300 bg-white p-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="rounded-xl border border-stone-200 bg-white p-2">
        <QRCodeSVG value={promptPayPayload(promptPayId, amount)} size={200} level="M" marginSize={1} />
      </div>
      <div className="text-center sm:text-left">
        <p className="text-lg font-bold text-sky-900">พร้อมเพย์ (PromptPay)</p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums text-stone-900">{baht(amount)}</p>
        <p className="mt-1 text-lg text-stone-700">บัญชี {phoneText(promptPayId)}</p>
        <p className="mt-2 text-base text-stone-600">ให้ลูกค้าสแกน ยอดเงินขึ้นเองอัตโนมัติ</p>
      </div>
    </div>
  )
}

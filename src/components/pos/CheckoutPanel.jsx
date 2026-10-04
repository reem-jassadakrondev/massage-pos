import { useState } from 'react'
import { X, Wallet, Smartphone } from 'lucide-react'

export default function CheckoutPanel({ booking, onCheckout, formatCurrency, isModal = false, onClose }) {
  const [selectedMethod, setSelectedMethod] = useState('cash')

  const paymentMethods = [
    { key: 'cash', label: '💵 เงินสด', icon: Wallet },
    { key: 'qr', label: '📱 สแกนโอน (QR)', icon: Smartphone },
  ]

  if (!booking) {
    return (
      <div className="rounded-[28px] border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-stone-500">
        เลือกห้องที่กำลังนวดเพื่อเปิดหน้าจอรับเงิน
      </div>
    )
  }

  return (
    <div className={`rounded-[28px] border bg-white p-4 shadow-sm ${isModal ? 'border-stone-200' : 'border-emerald-100'}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">คิดเงิน</p>
          <h3 className="mt-1 text-xl font-bold text-stone-800">ชำระเงิน</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{booking.customerName}</div>
          {isModal ? (
            <button type="button" onClick={onClose} className="rounded-full bg-stone-100 p-2 text-stone-600 hover:bg-stone-200">
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl bg-stone-100 p-4 text-center">
        <div className="text-sm text-stone-500">ยอดรวม</div>
        <div className="mt-2 text-4xl font-black text-stone-800">{formatCurrency(booking.total)}</div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-stone-600">
        <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-3 py-2">
          <span>ห้อง</span>
          <span className="font-bold text-stone-800">{booking.roomName ?? 'ห้องนวด'}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-3 py-2">
          <span>บริการ</span>
          <span className="font-bold text-stone-800">{booking.serviceTitle ?? 'บริการ'}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {paymentMethods.map(({ key, label, icon: Icon }) => {
          const isSelected = selectedMethod === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedMethod(key)}
              className={`flex min-h-[60px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-base font-bold transition ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onCheckout(booking.id, selectedMethod)}
        className="mt-5 flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-4 text-base font-black text-white shadow-md transition hover:bg-emerald-700"
      >
        บันทึกรับเงิน / เคลียร์ห้อง
      </button>
    </div>
  )
}

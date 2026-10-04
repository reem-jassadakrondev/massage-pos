import { useState } from 'react'
import { PlusCircle } from 'lucide-react'

export default function QuickExpense({ onAdd }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('ค่าใช้จ่ายอื่น')

  const submit = () => {
    onAdd({ title, amount, category })
    setTitle('')
    setAmount('')
    setCategory('ค่าใช้จ่ายอื่น')
  }

  return (
    <div className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <PlusCircle className="text-emerald-700" size={18} />
        <h3 className="text-lg font-bold text-stone-800">บันทึกรายจ่ายเร็ว</h3>
      </div>

      <div className="space-y-3">
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-emerald-500"
        >
          <option value="ค่าใช้จ่ายอื่น">ค่าใช้จ่ายอื่น</option>
          <option value="น้ำ-ไฟ-เช่า">น้ำ-ไฟ-เช่า</option>
          <option value="วัสดุ-อุปกรณ์">วัสดุ-อุปกรณ์</option>
          <option value="ทำความสะอาด">ทำความสะอาด</option>
          <option value="สวัสดิการ">สวัสดิการ</option>
          <option value="อื่นๆ">อื่นๆ</option>
        </select>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="เช่น ซื้อน้ำแข็ง 40 บาท"
          className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-emerald-500"
        />
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="จำนวนเงิน"
          className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-emerald-500"
        />
      </div>

      <button
        type="button"
        onClick={submit}
        className="mt-4 min-h-[56px] w-full rounded-2xl bg-emerald-600 px-4 py-3 text-base font-black text-white hover:bg-emerald-700"
      >
        เพิ่มรายการ
      </button>
    </div>
  )
}

import { useState } from 'react'
import { Sunrise } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { dateLong } from '../../lib/format'
import { Button, MoneyInput } from '../ui'

export default function OpenShiftCard() {
  const { openShift } = useApp()
  const [cash, setCash] = useState('1000')

  return (
    <section className="rounded-3xl border-2 border-emerald-500 bg-emerald-50 p-6 shadow-sm">
      <h2 className="flex items-center gap-3 text-3xl font-extrabold text-stone-900">
        <Sunrise size={36} className="text-emerald-700" aria-hidden="true" /> เปิดร้าน เริ่มรอบใหม่
      </h2>
      <p className="mt-1 text-xl text-stone-700">{dateLong(new Date())}</p>

      <div className="mt-5 max-w-xl">
        <p className="mb-2 text-xl font-bold text-stone-800">เงินทอนในลิ้นชักตอนเปิดร้าน</p>
        <MoneyInput value={cash} onChange={setCash} />
        <div className="mt-3 flex flex-wrap gap-2">
          {[500, 1000, 2000].map((amount) => (
            <Button key={amount} variant="secondary" onClick={() => setCash(String(amount))}>
              {amount.toLocaleString('th-TH')}
            </Button>
          ))}
        </div>
        <Button size="xl" className="mt-5 w-full" icon={Sunrise} onClick={() => openShift(cash)}>
          เปิดรอบ
        </Button>
      </div>
    </section>
  )
}

import { ArrowUpRight, BriefcaseBusiness, CircleDollarSign, HandCoins, ReceiptText } from 'lucide-react'

export default function DailySummary({ bookings, expenses, services, formatCurrency }) {
  const serviceMap = Object.fromEntries(services.map((service) => [service.id, service]))

  const totalCash = bookings
    .filter((booking) => booking.status === 'completed' && booking.paymentMethod === 'cash')
    .reduce((sum, booking) => sum + Number(booking.total || 0), 0)

  const totalQr = bookings
    .filter((booking) => booking.status === 'completed' && booking.paymentMethod === 'qr')
    .reduce((sum, booking) => sum + Number(booking.total || 0), 0)

  const commissionTotal = bookings
    .filter((booking) => booking.status === 'completed')
    .reduce((sum, booking) => {
      const service = serviceMap[booking.serviceId]
      return sum + (service ? Number(service.therapist_commission) : 0)
    }, 0)

  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const totalRevenue = totalCash + totalQr
  const netProfit = totalRevenue - commissionTotal - totalExpenses

  const cards = [
    {
      title: 'รายรับเงินสด',
      amount: formatCurrency(totalCash),
      icon: CircleDollarSign,
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'รายรับโอน/QR',
      amount: formatCurrency(totalQr),
      icon: ArrowUpRight,
      iconBg: 'bg-sky-100 text-sky-700',
    },
    {
      title: 'ค่ามือหมอรวม',
      amount: formatCurrency(commissionTotal),
      icon: HandCoins,
      iconBg: 'bg-violet-100 text-violet-700',
    },
    {
      title: 'รายจ่ายเบ็ดเตล็ด',
      amount: formatCurrency(totalExpenses),
      icon: ReceiptText,
      iconBg: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'กำไรสุทธิ',
      amount: formatCurrency(netProfit),
      icon: BriefcaseBusiness,
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ title, amount, icon: Icon, iconBg }) => (
        <div key={title} className="rounded-[26px] border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-stone-500">{title}</p>
              <p className="mt-3 text-2xl font-black text-stone-800">{amount}</p>
            </div>
            <div className={`rounded-2xl p-2 ${iconBg}`}>
              <Icon size={20} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

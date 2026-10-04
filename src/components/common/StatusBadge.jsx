const palette = {
  available: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  occupied: 'bg-red-100 text-red-700 border border-red-200',
  busy: 'bg-orange-100 text-orange-700 border border-orange-200',
  off_duty: 'bg-stone-200 text-stone-600 border border-stone-300',
  cash: 'bg-amber-100 text-amber-700 border border-amber-200',
  qr: 'bg-sky-100 text-sky-700 border border-sky-200',
  completed: 'bg-slate-200 text-slate-700 border border-slate-300',
}

export default function StatusBadge({ status, label }) {
  const resolvedText = label ?? status

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${palette[status] ?? 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}
    >
      {resolvedText}
    </span>
  )
}

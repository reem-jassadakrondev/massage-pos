export default function NotificationToast({ toast }) {
  if (!toast) return null

  const palette = {
    success: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    error: 'border-red-300 bg-red-50 text-red-800',
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 w-[min(90vw,360px)]">
      <div className={`rounded-2xl border p-4 shadow-xl ${palette[toast.tone] ?? palette.success}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-current" />
          <div>
            <p className="text-sm font-bold">{toast.title}</p>
            <p className="mt-1 text-sm leading-5 opacity-80">{toast.message}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

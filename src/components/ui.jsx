import { useEffect, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, Delete, Minus, Plus, X } from 'lucide-react'

const cx = (...classes) => classes.filter(Boolean).join(' ')

// ---------- Buttons ----------
const VARIANTS = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  warning: 'bg-amber-400 text-stone-900 hover:bg-amber-500',
  blue: 'bg-sky-700 text-white hover:bg-sky-800 shadow-sm',
  dark: 'bg-stone-800 text-white hover:bg-stone-900',
  secondary: 'bg-white text-stone-800 border-2 border-stone-300 hover:bg-stone-100',
  ghost: 'bg-transparent text-stone-700 hover:bg-stone-200/60',
}

const SIZES = {
  xl: 'min-h-[72px] px-6 text-2xl gap-3',
  lg: 'min-h-[60px] px-5 text-xl gap-2',
  md: 'min-h-[52px] px-4 text-lg gap-2',
  sm: 'min-h-[44px] px-3 text-base gap-1.5',
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, className, children, type = 'button', ...props }) {
  const iconSize = size === 'xl' ? 28 : size === 'lg' ? 24 : size === 'sm' ? 18 : 22
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center rounded-2xl font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon size={iconSize} strokeWidth={2.4} aria-hidden="true" /> : null}
      {children}
    </button>
  )
}

// ---------- Layout ----------
export function Card({ className, children, ...props }) {
  return (
    <div className={cx('rounded-3xl border border-stone-200 bg-white p-5 shadow-sm', className)} {...props}>
      {children}
    </div>
  )
}

export function SectionTitle({ icon: Icon, children, action, className }) {
  return (
    <div className={cx('mb-4 flex flex-wrap items-center justify-between gap-3', className)}>
      <h2 className="flex items-center gap-3 text-2xl font-bold text-stone-900">
        {Icon ? <Icon size={28} className="text-emerald-700" aria-hidden="true" /> : null}
        {children}
      </h2>
      {action}
    </div>
  )
}

export function Empty({ children }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center text-lg text-stone-600">
      {children}
    </div>
  )
}

const STAT_TONES = {
  default: 'bg-white border-stone-200',
  green: 'bg-emerald-50 border-emerald-200',
  amber: 'bg-amber-50 border-amber-200',
  blue: 'bg-sky-50 border-sky-200',
  red: 'bg-red-50 border-red-200',
}

export function Stat({ label, value, hint, tone = 'default', big = false }) {
  return (
    <div className={cx('rounded-2xl border-2 p-4', STAT_TONES[tone])}>
      <p className="text-base font-semibold text-stone-700">{label}</p>
      <p className={cx('mt-1 font-extrabold leading-tight text-stone-900 tabular-nums', big ? 'text-4xl' : 'text-3xl')}>{value}</p>
      {hint ? <p className="mt-1 text-sm text-stone-600">{hint}</p> : null}
    </div>
  )
}

// ---------- Therapist avatar ----------
const AVATAR = {
  rose: 'bg-rose-100 text-rose-800 ring-rose-300',
  sky: 'bg-sky-100 text-sky-800 ring-sky-300',
  amber: 'bg-amber-100 text-amber-800 ring-amber-300',
  violet: 'bg-violet-100 text-violet-800 ring-violet-300',
  teal: 'bg-teal-100 text-teal-800 ring-teal-300',
  lime: 'bg-lime-100 text-lime-800 ring-lime-300',
  orange: 'bg-orange-100 text-orange-800 ring-orange-300',
  indigo: 'bg-indigo-100 text-indigo-800 ring-indigo-300',
}

export function Avatar({ therapist, size = 'md' }) {
  const sizes = { sm: 'h-10 w-10 text-lg', md: 'h-14 w-14 text-2xl', lg: 'h-16 w-16 text-3xl' }
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-extrabold ring-2',
        AVATAR[therapist?.color] ?? AVATAR.teal,
        sizes[size],
      )}
      aria-hidden="true"
    >
      {(therapist?.nickname || therapist?.name || '?').slice(0, 1)}
    </span>
  )
}

// ---------- Status pill ----------
const PILL = {
  green: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  amber: 'bg-amber-100 text-amber-900 border-amber-300',
  red: 'bg-red-100 text-red-900 border-red-300',
  blue: 'bg-sky-100 text-sky-900 border-sky-300',
  gray: 'bg-stone-100 text-stone-700 border-stone-300',
  violet: 'bg-violet-100 text-violet-900 border-violet-300',
}

export function Pill({ tone = 'gray', children, className }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-base font-bold', PILL[tone], className)}>
      {children}
    </span>
  )
}

// ---------- Form controls ----------
/** Labelled control. Use `group` around a set of buttons (Choices) so the label does not bind to the first one. */
export function Field({ label, hint, group = false, children }) {
  if (group) {
    return (
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-2 block p-0 text-lg font-bold text-stone-800">{label}</legend>
        {children}
        {hint ? <span className="mt-1 block text-base text-stone-600">{hint}</span> : null}
      </fieldset>
    )
  }
  return (
    <label className="block">
      <span className="mb-2 block text-lg font-bold text-stone-800">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-base text-stone-600">{hint}</span> : null}
    </label>
  )
}

const INPUT = 'min-h-[60px] w-full rounded-2xl border-2 border-stone-300 bg-white px-4 text-xl text-stone-900 outline-none placeholder:text-stone-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100'

export function TextInput({ className, ...props }) {
  return <input className={cx(INPUT, className)} {...props} />
}

export function MoneyInput({ value, onChange, placeholder = '0', className, ...props }) {
  return (
    <div className={cx('relative', className)}>
      <input
        inputMode="numeric"
        className={cx(INPUT, 'pr-16 text-2xl font-bold tabular-nums')}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
        {...props}
      />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-stone-500">บาท</span>
    </div>
  )
}

/** Big tappable options. options: [{ value, label, sub, disabled, badge }] */
export function Choices({ options, value, onChange, columns = 'grid-cols-2 sm:grid-cols-3', size = 'md' }) {
  return (
    <div className={cx('grid gap-3', columns)}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            disabled={option.disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              'relative flex flex-col items-start justify-center rounded-2xl border-2 px-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40',
              size === 'lg' ? 'min-h-[84px] py-3' : 'min-h-[60px] py-2',
              selected ? 'border-emerald-600 bg-emerald-50 ring-4 ring-emerald-100' : 'border-stone-300 bg-white hover:border-stone-400',
            )}
          >
            {selected ? (
              <span className="absolute right-2 top-2 rounded-full bg-emerald-600 p-0.5 text-white">
                <Check size={16} strokeWidth={3} />
              </span>
            ) : null}
            {option.badge ? <span className="mb-1">{option.badge}</span> : null}
            <span className="pr-6 text-xl font-bold leading-tight text-stone-900">{option.label}</span>
            {option.sub ? <span className="mt-0.5 text-base text-stone-600">{option.sub}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export function Stepper({ value, onChange, step = 30, min = 30, max = 600, format = (v) => v }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" size="lg" icon={Minus} onClick={() => onChange(Math.max(min, value - step))} disabled={value - step < min} aria-label={`ลด ${step}`}>
        {step}
      </Button>
      <div className="min-w-[140px] flex-1 rounded-2xl bg-stone-100 px-4 py-3 text-center text-2xl font-extrabold tabular-nums text-stone-900">
        {format(value)}
      </div>
      <Button variant="secondary" size="lg" icon={Plus} onClick={() => onChange(Math.min(max, value + step))} disabled={value + step > max} aria-label={`เพิ่ม ${step}`}>
        {step}
      </Button>
    </div>
  )
}

export function Toggle({ checked, onChange, label, sub }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        'flex min-h-[64px] w-full items-center gap-4 rounded-2xl border-2 px-4 py-2 text-left transition',
        checked ? 'border-emerald-600 bg-emerald-50' : 'border-stone-300 bg-white',
      )}
    >
      <span className={cx('relative h-8 w-14 shrink-0 rounded-full transition', checked ? 'bg-emerald-600' : 'bg-stone-300')}>
        <span className={cx('absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-7' : 'left-1')} />
      </span>
      <span>
        <span className="block text-lg font-bold text-stone-900">{label}</span>
        {sub ? <span className="block text-base text-stone-600">{sub}</span> : null}
      </span>
    </button>
  )
}

// ---------- Modal ----------
export function Modal({ title, subtitle, onClose, children, footer, size = 'max-w-2xl' }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-stone-950/55 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-stone-50 shadow-2xl sm:max-h-[94vh] sm:rounded-3xl', size)}>
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-2xl font-extrabold text-stone-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-lg text-stone-600">{subtitle}</p> : null}
          </div>
          {onClose ? (
            <Button variant="secondary" size="sm" icon={X} onClick={onClose}>
              ปิด
            </Button>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-stone-200 bg-white px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'ยืนยัน', tone = 'danger', onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="max-w-lg"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={onCancel}>
            ไม่ใช่
          </Button>
          <Button variant={tone} size="lg" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-xl leading-relaxed text-stone-800">{message}</p>
    </Modal>
  )
}

// ---------- PIN pad ----------
export function PinPad({ title = 'ใส่รหัสเจ้าของร้าน', subtitle, onSubmit, onClose }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const press = (digit) => {
    if (pin.length >= 4) return
    const next = pin + digit
    setError(false)
    setPin(next)
    if (next.length === 4) {
      window.setTimeout(() => {
        if (!onSubmit(next)) {
          setError(true)
          setPin('')
        }
      }, 120)
    }
  }

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose} size="max-w-sm">
      <div className="flex justify-center gap-4 py-2" aria-live="polite">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cx('h-6 w-6 rounded-full border-2', i < pin.length ? 'border-stone-900 bg-stone-900' : 'border-stone-400 bg-white')} />
        ))}
      </div>
      <p className={cx('mt-2 min-h-[28px] text-center text-lg font-bold', error ? 'text-red-700' : 'text-stone-500')}>
        {error ? 'รหัสไม่ถูกต้อง ลองใหม่' : 'รหัสเดโม 1234'}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button key={digit} type="button" onClick={() => press(digit)} className="min-h-[72px] rounded-2xl border-2 border-stone-300 bg-white text-3xl font-bold text-stone-900 active:bg-stone-200">
            {digit}
          </button>
        ))}
        <span />
        <button type="button" onClick={() => press('0')} className="min-h-[72px] rounded-2xl border-2 border-stone-300 bg-white text-3xl font-bold text-stone-900 active:bg-stone-200">
          0
        </button>
        <button type="button" onClick={() => setPin(pin.slice(0, -1))} aria-label="ลบ" className="flex min-h-[72px] items-center justify-center rounded-2xl bg-stone-200 text-stone-800 active:bg-stone-300">
          <Delete size={30} />
        </button>
      </div>
    </Modal>
  )
}

// ---------- Toast ----------
export function Toast({ toast }) {
  if (!toast) return null
  const isError = toast.tone === 'error'
  const Icon = isError ? AlertTriangle : CheckCircle2
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4" role="status" aria-live="assertive">
      <div
        key={toast.key}
        className={cx(
          'toast-in flex w-full max-w-xl items-center gap-4 rounded-2xl border-2 px-5 py-4 shadow-2xl',
          isError ? 'border-red-400 bg-red-50 text-red-900' : 'border-emerald-400 bg-emerald-50 text-emerald-900',
        )}
      >
        <Icon size={36} className="shrink-0" strokeWidth={2.4} />
        <div>
          <p className="text-xl font-extrabold">{toast.title}</p>
          {toast.message ? <p className="text-lg">{toast.message}</p> : null}
        </div>
      </div>
    </div>
  )
}

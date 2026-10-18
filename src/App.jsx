import { useState } from 'react'
import { BarChart3, CalendarDays, HandCoins, LayoutGrid, Lock, LockOpen, Settings, Users, Wallet } from 'lucide-react'
import { PinPad, Toast } from './components/ui'
import { AppProvider, useApp } from './context/AppContext'
import useNow from './hooks/useNow'
import { dateWithDay, isSameDay, timeHM } from './lib/format'
import { upcomingReservations } from './lib/selectors'
import PayrollPage from './pages/PayrollPage'
import PosPage from './pages/PosPage'
import ReportsPage from './pages/ReportsPage'
import ReservationsPage from './pages/ReservationsPage'
import SettingsPage from './pages/SettingsPage'
import ShiftPage from './pages/ShiftPage'
import StaffPage from './pages/StaffPage'

const TABS = [
  { id: 'pos', label: 'หน้าร้าน', icon: LayoutGrid },
  { id: 'reservations', label: 'จองคิว', icon: CalendarDays },
  { id: 'staff', label: 'หมอนวด', icon: Users },
  { id: 'shift', label: 'ปิดรอบ', icon: Wallet },
]

const OWNER_TABS = [
  { id: 'reports', label: 'รายงาน', icon: BarChart3 },
  { id: 'payroll', label: 'ค่าหมอ', icon: HandCoins },
  { id: 'settings', label: 'ตั้งค่า', icon: Settings },
]

function Shell() {
  const { db, toast, isOwner, unlockOwner, lockOwner } = useApp()
  const now = useNow(15000)
  const [tab, setTab] = useState('pos')
  const [askPin, setAskPin] = useState(false)

  const tabs = isOwner ? [...TABS, ...OWNER_TABS] : TABS
  const current = tabs.some((t) => t.id === tab) ? tab : 'pos'
  const badges = {
    reservations: upcomingReservations(db.reservations, now, 30, 30).length || null,
    shift: db.shifts.some((s) => s.status === 'open' && !isSameDay(s.openedAt, now)) ? '!' : null,
  }

  const go = (id) => {
    setTab(id)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pt-3">
          <div className="min-w-0">
            <p className="truncate text-2xl font-extrabold text-stone-900">{db.settings.shopName}</p>
            <p className="text-lg text-stone-600">{dateWithDay(now)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-extrabold tabular-nums text-stone-900" aria-label="เวลาตอนนี้">
              {timeHM(now)}
            </span>
            {isOwner ? (
              <button
                type="button"
                onClick={lockOwner}
                className="flex min-h-[52px] items-center gap-2 rounded-2xl bg-violet-100 px-4 text-lg font-bold text-violet-900 ring-2 ring-violet-300"
              >
                <LockOpen size={22} aria-hidden="true" /> เจ้าของร้าน · ออก
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAskPin(true)}
                className="flex min-h-[52px] items-center gap-2 rounded-2xl border-2 border-stone-300 bg-white px-4 text-lg font-bold text-stone-700"
              >
                <Lock size={22} aria-hidden="true" /> เจ้าของร้าน
              </button>
            )}
          </div>
        </div>

        <nav className="mx-auto max-w-7xl overflow-x-auto px-2 pb-2 pt-2" aria-label="เมนูหลัก">
          <ul className="flex min-w-max gap-2 px-2 sm:min-w-0">
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = id === current
              const owner = OWNER_TABS.some((t) => t.id === id)
              return (
                <li key={id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => go(id)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex min-h-[64px] w-full min-w-[100px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 text-xl font-bold transition ${
                      active
                        ? owner
                          ? 'bg-violet-700 text-white shadow'
                          : 'bg-emerald-700 text-white shadow'
                        : owner
                          ? 'bg-violet-50 text-violet-900 hover:bg-violet-100'
                          : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                    }`}
                  >
                    <Icon size={26} aria-hidden="true" />
                    {label}
                    {badges[id] ? (
                      <span className="absolute -right-1 -top-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-1.5 text-base font-extrabold text-white">
                        {badges[id]}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {current === 'pos' ? <PosPage /> : null}
        {current === 'reservations' ? <ReservationsPage /> : null}
        {current === 'staff' ? <StaffPage /> : null}
        {current === 'shift' ? <ShiftPage onGoPos={() => go('pos')} /> : null}
        {current === 'reports' ? <ReportsPage /> : null}
        {current === 'payroll' ? <PayrollPage /> : null}
        {current === 'settings' ? <SettingsPage /> : null}
      </main>

      {askPin ? (
        <PinPad
          subtitle="ดูรายงาน กำไร และตั้งค่าร้าน"
          onClose={() => setAskPin(false)}
          onSubmit={(pin) => {
            if (!unlockOwner(pin)) return false
            setAskPin(false)
            go('reports')
            return true
          }}
        />
      ) : null}

      <Toast toast={toast} />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

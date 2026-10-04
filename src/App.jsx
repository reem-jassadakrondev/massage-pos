import { useMemo, useState } from 'react'
import { CalendarRange, LayoutGrid, LockKeyhole, LogOut, Printer, Settings, UserCog, Users } from 'lucide-react'
import { AppProvider, useAppContext } from './context/AppContext'
import NotificationToast from './components/common/NotificationToast'
import SectionHeader from './components/common/SectionHeader'
import StatusBadge from './components/common/StatusBadge'
import BookingFlow from './components/pos/BookingFlow'
import CheckoutPanel from './components/pos/CheckoutPanel'
import RoomCard from './components/pos/RoomCard'
import QuickExpense from './components/admin/QuickExpense'
import SettingsPanel from './components/admin/SettingsPanel'
import TherapistPayroll from './components/admin/TherapistPayroll'

const REPORT_LIMIT_MAP = {
  day: 5,
  week: 15,
  month: 30,
}

function AppContent() {
  const {
    therapists,
    services,
    rooms,
    bookings,
    expenses,
    toast,
    paidTherapists,
    formatCurrency,
    beginBooking,
    addExtension,
    clockInTherapist,
    clockOutTherapist,
    checkoutBooking,
    addExpense,
    addService,
    updateService,
    deleteService,
    addTherapist,
    updateTherapist,
    deleteTherapist,
    addRoom,
    updateRoom,
    deleteRoom,
    markTherapistPaid,
  } = useAppContext()

  const [activeTab, setActiveTab] = useState('pos')
  const [ownerReportView, setOwnerReportView] = useState('day')
  const [customDuration, setCustomDuration] = useState(60)
  const [selectedTherapistId, setSelectedTherapistId] = useState('t1')
  const [selectedServiceId, setSelectedServiceId] = useState('s1')
  const [selectedRoomId, setSelectedRoomId] = useState('r1')
  const [selectedBookingId, setSelectedBookingId] = useState(null)
  const [ownerLoggedIn, setOwnerLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [bookingCustomerName, setBookingCustomerName] = useState('')
  const [attendanceForm, setAttendanceForm] = useState({
    therapistId: 't1',
    checkinTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
  })

  const navItems = [
    { id: 'pos', label: 'แคชเชียร์', icon: LayoutGrid },
    { id: 'work', label: 'งานวันนี้', icon: Users },
    { id: 'owner', label: 'เจ้าของร้าน', icon: UserCog },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings },
  ]

  const todaysActiveBookings = bookings.filter((booking) => booking.status === 'active')
  const selectedBooking =
    bookings.find((booking) => booking.id === selectedBookingId) ??
    bookings.find((booking) => booking.roomId === selectedRoomId && booking.status === 'active') ??
    todaysActiveBookings[0] ??
    null

  const checkoutBookingDetails = selectedBooking
    ? {
        ...selectedBooking,
        roomName: rooms.find((room) => room.id === selectedBooking.roomId)?.room_name ?? 'ห้องนวด',
        serviceTitle: services.find((service) => service.id === selectedBooking.serviceId)?.title ?? 'บริการ',
      }
    : null

  const attendanceList = useMemo(
    () =>
      therapists.map((therapist) => {
        const todaysActiveBookings = bookings
          .filter(
            (booking) =>
              booking.therapistId === therapist.id &&
              booking.status === 'active' &&
              new Date(booking.start).toDateString() === new Date().toDateString(),
          )
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

        const queueNumber = bookings
          .filter((booking) => booking.status === 'active')
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
          .findIndex((booking) => booking.therapistId === therapist.id)

        const activeBooking = todaysActiveBookings[0]
        const checkinTime = activeBooking
          ? new Date(activeBooking.start).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
          : therapist.checkinTime ?? '—'

        return {
          ...therapist,
          checkinTime,
          queueNumber: queueNumber >= 0 ? queueNumber + 1 : therapist.queueNumber ?? 0,
          isWorkingToday: !!activeBooking || therapist.status === 'busy' || therapist.status === 'available',
        }
      }),
    [bookings, therapists],
  )

  const workLog = useMemo(
    () =>
      bookings
        .filter((booking) => booking.status === 'active' || booking.status === 'completed')
        .map((booking) => {
          const therapist = therapists.find((item) => item.id === booking.therapistId)
          const service = services.find((item) => item.id === booking.serviceId)
          const room = rooms.find((item) => item.id === booking.roomId)
          const start = new Date(booking.start)
          const end = new Date(booking.end)
          const durationHours = Math.max(0.5, (end.getTime() - start.getTime()) / 3600000)

          return {
            ...booking,
            therapistName: therapist?.name ?? 'ไม่ระบุ',
            serviceTitle: service?.title ?? 'ไม่ระบุ',
            roomName: room?.room_name ?? 'ไม่ระบุ',
            durationHours,
          }
        })
        .slice(0, 8),
    [bookings, rooms, services, therapists],
  )

  const cashflowSummary = useMemo(() => {
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const todaysCompletedBookings = bookings.filter((booking) => {
      const bookingDate = new Date(booking.start)
      return booking.status === 'completed' && bookingDate >= startOfToday && bookingDate < endOfToday
    })

    const revenueToday = todaysCompletedBookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0)

    const commissionToday = todaysCompletedBookings.reduce((sum, booking) => {
      const service = services.find((item) => item.id === booking.serviceId)
      return sum + (service ? Number(service.therapist_commission || 0) : 0)
    }, 0)

    const expenseToday = expenses
      .filter((item) => {
        const itemTime = new Date(item.time)
        return itemTime >= startOfToday && itemTime < endOfToday
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)

    return {
      revenueToday,
      commissionToday,
      expenseToday,
      netProfitToday: revenueToday - commissionToday - expenseToday,
    }
  }, [bookings, expenses, services])

  const reportWindowBookings = useMemo(() => {
    const now = new Date()
    const msRange = ownerReportView === 'day' ? 24 * 60 * 60 * 1000 : ownerReportView === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000
    const startWindow = new Date(now.getTime() - msRange)

    return bookings
      .filter((booking) => {
        const bookingDate = new Date(booking.start)
        return booking.status === 'completed' && bookingDate >= startWindow
      })
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      .slice(0, REPORT_LIMIT_MAP[ownerReportView] || 15)
  }, [bookings, ownerReportView])

  const reportData = useMemo(() => {
    const now = new Date()
    const msRange = ownerReportView === 'day' ? 24 * 60 * 60 * 1000 : ownerReportView === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000
    const startWindow = new Date(now.getTime() - msRange)

    const totalRevenue = reportWindowBookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0)
    const totalCommission = reportWindowBookings.reduce((sum, booking) => {
      const service = services.find((item) => item.id === booking.serviceId)
      return sum + (service ? Number(service.therapist_commission || 0) : 0)
    }, 0)
    const totalExpense = expenses
      .filter((item) => new Date(item.time) >= startWindow)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const netBalance = totalRevenue - totalCommission - totalExpense

    return {
      totalRevenue,
      totalCommission,
      totalExpense,
      netBalance,
      bookingCount: reportWindowBookings.length,
      averageTicket: reportWindowBookings.length ? totalRevenue / reportWindowBookings.length : 0,
      bookings: reportWindowBookings,
    }
  }, [expenses, ownerReportView, reportWindowBookings, services])

  const handleCreateBooking = ({ therapistId, serviceId, roomId, customMinutes, customerName }) => {
    beginBooking({
      therapistId,
      serviceId,
      roomId,
      customDuration: customMinutes,
      customerName: customerName || bookingCustomerName || 'ลูกค้าใหม่',
    })
    setSelectedBookingId(null)
    setBookingCustomerName('')
    setBookingModalOpen(false)
  }

  const handleCheckout = (bookingId, paymentMethod) => {
    checkoutBooking(bookingId, paymentMethod)
    setSelectedBookingId(null)
    setCheckoutModalOpen(false)
  }

  const handleRoomSelect = (roomId, bookingId) => {
    setSelectedRoomId(roomId)
    setSelectedBookingId(bookingId ?? null)
    if (bookingId) {
      setCheckoutModalOpen(true)
      setBookingModalOpen(false)
      return
    }

    setCheckoutModalOpen(false)
    setBookingModalOpen(true)
  }

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    const rows = reportData.bookings
      .map((booking) => {
        const service = services.find((item) => item.id === booking.serviceId)
        const therapist = therapists.find((item) => item.id === booking.therapistId)
        return `
          <tr>
            <td>${new Date(booking.start).toLocaleDateString('th-TH')}</td>
            <td>${booking.customerName}</td>
            <td>${service?.title ?? 'บริการ'}</td>
            <td>${therapist?.name ?? 'หมอ'}</td>
            <td>${booking.paymentMethod === 'qr' ? 'QR' : 'เงินสด'}</td>
            <td>${formatCurrency(booking.total)}</td>
          </tr>
        `
      })
      .join('')

    const html = `
      <!doctype html>
      <html lang="th">
        <head>
          <meta charset="UTF-8" />
          <title>Owner Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #1f2937; }
            .summary { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)); gap: 12px; margin-bottom: 20px; }
            .card { border: 1px solid #e7e5e4; border-radius: 12px; padding: 12px; }
            .label { font-size: 12px; color: #6b7280; }
            .value { font-size: 24px; font-weight: 700; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border-bottom: 1px solid #e7e5e4; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #f5f5f4; }
            h2 { margin: 0 0 12px; }
          </style>
        </head>
        <body>
          <h2>สรุปรายงานร้านนวด</h2>
          <div class="summary">
            <div class="card"><div class="label">รายรับรวม</div><div class="value">${formatCurrency(reportData.totalRevenue)}</div></div>
            <div class="card"><div class="label">ค่ามือหมอ</div><div class="value">${formatCurrency(reportData.totalCommission)}</div></div>
            <div class="card"><div class="label">รายจ่ายอื่น</div><div class="value">${formatCurrency(reportData.totalExpense)}</div></div>
            <div class="card"><div class="label">ใบเสร็จ</div><div class="value">${reportData.bookingCount}</div></div>
            <div class="card"><div class="label">กำไรสุทธิ</div><div class="value">${formatCurrency(reportData.netBalance)}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>วันที่</th><th>ลูกค้า</th><th>บริการ</th><th>หมอนวด</th><th>ชำระ</th><th>ยอดเงิน</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 300)
  }

  const handleClockIn = () => {
    const time = attendanceForm.checkinTime || '08:00'
    clockInTherapist(attendanceForm.therapistId, time)
  }

  const handleClockOut = () => {
    clockOutTherapist(attendanceForm.therapistId)
  }

  const handleOwnerNav = (tab) => {
    if (tab === 'owner' && !ownerLoggedIn) {
      setActiveTab('owner-login')
      return
    }

    setActiveTab(tab)
  }

  const handleLogin = (event) => {
    event.preventDefault()

    if (loginForm.username === 'admin' && loginForm.password === '1234') {
      setOwnerLoggedIn(true)
      setLoginError('')
      setActiveTab('owner')
      return
    }

    setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
  }

  const handleLogout = () => {
    setOwnerLoggedIn(false)
    setLoginForm({ username: '', password: '' })
    setActiveTab('pos')
  }

  const renderOwnerGuard = () => (
    <div className="premium-panel mx-auto mt-8 max-w-md p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 shadow-inner shadow-emerald-200"><LockKeyhole size={20} /></div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.20em] text-stone-500">Owner access</p>
          <h3 className="text-2xl font-black tracking-[-0.05em] text-stone-800">เข้าสู่ระบบเจ้าของร้าน</h3>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-bold text-stone-700">User</label>
          <input
            value={loginForm.username}
            onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
            className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-stone-50/80 px-4 text-base text-stone-800 outline-none transition focus:border-emerald-500 focus:bg-white"
            placeholder="admin"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-stone-700">Password</label>
          <input
            type="password"
            value={loginForm.password}
            onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
            className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-stone-50/80 px-4 text-base text-stone-800 outline-none transition focus:border-emerald-500 focus:bg-white"
            placeholder="1234"
          />
        </div>

        {loginError ? <p className="text-sm font-medium text-red-600">{loginError}</p> : null}

        <button type="submit" className="primary-button flex min-h-[56px] w-full items-center justify-center rounded-2xl px-4 py-3 text-base font-black text-white">
          เข้าสู่ระบบ
        </button>
      </form>
    </div>
  )

  const renderOwnerReport = () => (
    <main className="print-report owner-report-shell mt-6 p-4 md:p-6">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">OWNER REPORTS</p>
          <h3 className="text-4xl font-black tracking-[-0.06em] text-stone-900">สรุปทางการเงิน</h3>
          <p className="text-sm text-stone-500">สรุปรายได้ รายจ่าย และยอดคงเหลือแบบสัปดาห์ / เดือน</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOwnerReportView('day')}
            className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-bold ${
              ownerReportView === 'day' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
            }`}
          >
            รายวัน
          </button>
          <button
            type="button"
            onClick={() => setOwnerReportView('week')}
            className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-bold ${
              ownerReportView === 'week' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
            }`}
          >
            รายสัปดาห์
          </button>
          <button
            type="button"
            onClick={() => setOwnerReportView('month')}
            className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-bold ${
              ownerReportView === 'month' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
            }`}
          >
            รายเดือน
          </button>
          <button
            type="button"
            onClick={handlePrintReport}
            className="flex min-h-[44px] items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-emerald-200"
          >
            <Printer size={16} /> ปริ้น
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="summary-card">
          <p className="text-sm text-stone-500">รายรับรวม</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-stone-900">{formatCurrency(reportData.totalRevenue)}</p>
        </div>
        <div className="summary-card">
          <p className="text-sm text-stone-500">ค่ามือหมอ</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-stone-900">{formatCurrency(reportData.totalCommission)}</p>
        </div>
        <div className="summary-card">
          <p className="text-sm text-stone-500">รายจ่ายอื่น</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-stone-900">{formatCurrency(reportData.totalExpense)}</p>
        </div>
        <div className="summary-card">
          <p className="text-sm text-stone-500">ใบเสร็จ</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-stone-900">{reportData.bookingCount}</p>
        </div>
        <div className="summary-card summary-card--accent">
          <p className="text-sm text-emerald-700">กำไรสุทธิ</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-stone-900">{formatCurrency(reportData.netBalance)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="mini-card">
          <p className="text-xs uppercase tracking-[0.12em] text-stone-500">ค่าใช้จ่าย</p>
          <p className="mt-2 text-2xl font-black text-stone-900">{formatCurrency(reportData.totalExpense)}</p>
        </div>
        <div className="mini-card">
          <p className="text-xs uppercase tracking-[0.12em] text-stone-500">ลูกค้า</p>
          <p className="mt-2 text-2xl font-black text-stone-900">{reportData.bookingCount}</p>
        </div>
        <div className="mini-card">
          <p className="text-xs uppercase tracking-[0.12em] text-stone-500">กำไรสุทธิ</p>
          <p className="mt-2 text-2xl font-black text-emerald-700">{formatCurrency(reportData.netBalance)}</p>
        </div>
        <div className="mini-card">
          <p className="text-xs uppercase tracking-[0.12em] text-stone-500">ค่าเฉลี่ยต่อบิล</p>
          <p className="mt-2 text-2xl font-black text-stone-900">{formatCurrency(reportData.averageTicket)}</p>
        </div>
        <div className="mini-card mini-card--soft">
          <p className="text-xs uppercase tracking-[0.12em] text-stone-500">สรุป</p>
          <p className="mt-2 text-2xl font-black text-stone-900">{ownerReportView === 'day' ? 'รายวัน' : ownerReportView === 'week' ? 'รายสัปดาห์' : 'รายเดือน'}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="table-shell">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
              <CalendarRange size={15} />
              รายงาน {ownerReportView === 'day' ? 'รายวัน' : ownerReportView === 'week' ? 'รายสัปดาห์' : 'รายเดือน'}
            </div>
          </div>

          <div className="simple-list">
            {reportData.bookings.length ? reportData.bookings.map((booking) => {
              const service = services.find((item) => item.id === booking.serviceId)
              const therapist = therapists.find((item) => item.id === booking.therapistId)

              return (
                <div key={booking.id} className="simple-list__row">
                  <div className="simple-list__meta">
                    <span className="simple-list__date">{new Date(booking.start).toLocaleDateString('th-TH')}</span>
                    <strong>{booking.customerName}</strong>
                  </div>

                  <div className="simple-list__details">
                    <span>{service?.title ?? 'บริการ'}</span>
                    <span>{therapist?.name ?? 'หมอ'}</span>
                  </div>

                  <div className="simple-list__total">
                    <span className={`simple-list__tag ${booking.paymentMethod === 'qr' ? 'is-qr' : 'is-cash'}`}>
                      {booking.paymentMethod === 'qr' ? 'QR' : 'เงินสด'}
                    </span>
                    <strong>{formatCurrency(booking.total)}</strong>
                  </div>
                </div>
              )
            }) : (
              <div className="simple-list__empty">
                ยังไม่มีข้อมูลในช่วงเวลา {ownerReportView === 'day' ? 'รายวัน' : ownerReportView === 'week' ? 'รายสัปดาห์' : 'รายเดือน'} นี้
              </div>
            )}
          </div>
        </div>

        <div className="side-stack space-y-4">
          <QuickExpense onAdd={addExpense} />

          <div className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-lg font-black text-stone-800">รายการค่าใช้จ่ายอื่น</h3>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">{expenses.length}</span>
            </div>
            <div className="space-y-2">
              {expenses.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-stone-700">{item.title}</p>
                    <p className="text-xs text-stone-500">{item.category} • {new Date(item.time).toLocaleDateString('th-TH')}</p>
                  </div>
                  <span className="font-black text-stone-800">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[30px] border border-stone-200 bg-white p-4 shadow-sm">
        <SectionHeader title="ค่ามือหมอ" subtitle="สรุปรายจ่ายให้หมอนวดตามงานที่เสร็จสิ้น" />
        <div className="mt-4">
          <TherapistPayroll
            therapists={therapists}
            services={services}
            bookings={reportWindowBookings}
            paidTherapists={paidTherapists}
            markTherapistPaid={markTherapistPaid}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>
    </main>
  )

  return (
    <div className="app-shell min-h-screen text-stone-800">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <header className="app-header premium-panel rounded-[30px] p-4 lg:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-stone-500">Massage Shop</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-stone-800 md:text-4xl">POS & Operations</h1>
            </div>

            <div className="nav-shell flex flex-wrap gap-2 rounded-full p-2">
              {navItems.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleOwnerNav(id)}
                    className={`nav-pill min-h-[56px] rounded-full px-4 py-3 text-sm font-bold transition md:text-base ${
                      isActive ? 'active' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2"><Icon size={16} /> {label}</span>
                  </button>
                )
              })}

              {ownerLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="nav-pill nav-pill--ghost min-h-[56px] rounded-full px-4 py-3 text-sm font-bold"
                >
                  <span className="flex items-center gap-2"><LogOut size={16} /> ออกจากระบบ</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="premium-stat premium-stat--soft premium-stat--emerald">
              <p className="text-xs uppercase tracking-[0.12em] text-emerald-700">ห้องว่าง</p>
              <p className="mt-2 text-3xl font-black text-stone-800">{rooms.filter((room) => room.status === 'available').length}</p>
            </div>
            <div className="premium-stat premium-stat--soft premium-stat--amber">
              <p className="text-xs uppercase tracking-[0.12em] text-amber-700">กำลังนวด</p>
              <p className="mt-2 text-3xl font-black text-stone-800">{todaysActiveBookings.length}</p>
            </div>
            <div className="premium-stat premium-stat--soft premium-stat--violet">
              <p className="text-xs uppercase tracking-[0.12em] text-violet-700">รายรับวันนี้</p>
              <p className="mt-2 text-3xl font-black text-stone-800">{formatCurrency(cashflowSummary.revenueToday)}</p>
            </div>
          </div>
        </header>

        {activeTab === 'owner-login' ? renderOwnerGuard() : null}

        {activeTab === 'pos' ? (
          <main className="mt-6 w-full">
            <section className="space-y-5">
              <SectionHeader
                title="Room & Staff Dashboard"
                subtitle="ติดตามสถานะห้องและหมอนวดแบบ real-time"
                action={<StatusBadge status="available" label="พร้อมรับงาน" />}
              />

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {rooms.map((room) => {
                  const booking = bookings.find((item) => item.roomId === room.id && item.status === 'active')
                  return (
                    <RoomCard
                      key={room.id}
                      room={room}
                      booking={booking}
                      therapists={therapists}
                      services={services}
                      onSelect={handleRoomSelect}
                      onExtend={(bookingId, minutes) => addExtension(bookingId, minutes)}
                    />
                  )
                })}
              </div>
            </section>
          </main>
        ) : null}

        {bookingModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-3 sm:p-4">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-stone-200 bg-white p-3 shadow-2xl sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">เปิดคิวใหม่</p>
                  <h3 className="mt-1 text-xl font-black text-stone-800">ห้อง {rooms.find((room) => room.id === selectedRoomId)?.room_name ?? 'ที่เลือก'}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(false)}
                  className="min-h-[44px] rounded-full border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-bold text-stone-700"
                >
                  ปิด
                </button>
              </div>
              <BookingFlow
                therapists={therapists}
                services={services}
                rooms={rooms}
                bookings={bookings}
                selectedTherapistId={selectedTherapistId}
                selectedServiceId={selectedServiceId}
                selectedRoomId={selectedRoomId}
                customDuration={customDuration}
                setCustomDuration={setCustomDuration}
                customerName={bookingCustomerName}
                setCustomerName={setBookingCustomerName}
                onSelectTherapist={setSelectedTherapistId}
                onSelectService={setSelectedServiceId}
                onCreateBooking={handleCreateBooking}
              />
            </div>
          </div>
        ) : null}

        {activeTab === 'work' ? (
          <main className="mt-6 rounded-[30px] border border-stone-200 bg-white p-4 shadow-sm">
            <SectionHeader title="Work Log" subtitle="หมอที่เข้าทำงาน • เวลาขึ้นนวด • ห้อง • รายการที่นวด" />

            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="mb-4 grid gap-3 md:grid-cols-[1.2fr_1fr_auto_auto] md:items-end">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-stone-500">เลือกหมอนวด</label>
                  <select
                    value={attendanceForm.therapistId}
                    onChange={(event) => setAttendanceForm((current) => ({ ...current, therapistId: event.target.value }))}
                    className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-white px-4 text-base outline-none focus:border-emerald-500"
                  >
                    {therapists.map((therapist) => (
                      <option key={therapist.id} value={therapist.id}>{therapist.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-stone-500">เวลาเข้างาน</label>
                  <input
                    type="time"
                    value={attendanceForm.checkinTime}
                    onChange={(event) => setAttendanceForm((current) => ({ ...current, checkinTime: event.target.value }))}
                    className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-white px-4 text-base outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleClockIn}
                  className="min-h-[52px] rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white"
                >
                  เปิดงาน
                </button>
                <button
                  type="button"
                  onClick={handleClockOut}
                  className="min-h-[52px] rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-black text-stone-700"
                >
                  ปิดงาน
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {attendanceList.map((therapist) => (
                <div key={therapist.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-stone-800">{therapist.name}</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                      therapist.status === 'off_duty' ? 'bg-stone-200 text-stone-600' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {therapist.status === 'off_duty' ? 'OFF' : 'WORK'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{therapist.nickname}</p>
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="font-semibold text-stone-700">มาถึง: <span className="text-emerald-700">{therapist.checkinTime}</span></p>
                    <p className="font-semibold text-stone-700">คิวหมอนวด: <span className="text-amber-700">#{therapist.queueNumber}</span></p>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-emerald-700">
                    {therapist.status === 'off_duty' ? 'ไม่เข้าทำงาน' : 'เข้าทำงานวันนี้'}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {workLog.map((booking) => (
                <div key={booking.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-black text-stone-800">{booking.therapistName}</p>
                    <p className="text-sm text-stone-600">{booking.serviceTitle}</p>
                  </div>
                  <div className="grid gap-2 text-sm text-stone-600 sm:grid-cols-3">
                    <span>ห้อง: {booking.roomName}</span>
                    <span>เริ่ม: {new Date(booking.start).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>สิ้นสุด: {new Date(booking.end).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700">
                    {booking.durationHours.toFixed(1)} ชั่วโมง
                  </div>
                </div>
              ))}
            </div>
          </main>
        ) : null}

        {activeTab === 'owner' ? (
          ownerLoggedIn ? (
            renderOwnerReport()
          ) : (
            renderOwnerGuard()
          )
        ) : null}

        {activeTab === 'settings' ? (
          <main className="mt-6">
            {ownerLoggedIn ? (
              <SettingsPanel
                services={services}
                therapists={therapists}
                rooms={rooms}
                onAddService={addService}
                onUpdateService={updateService}
                onDeleteService={deleteService}
                onAddTherapist={addTherapist}
                onUpdateTherapist={updateTherapist}
                onDeleteTherapist={deleteTherapist}
                onAddRoom={addRoom}
                onUpdateRoom={updateRoom}
                onDeleteRoom={deleteRoom}
              />
            ) : (
              renderOwnerGuard()
            )}
          </main>
        ) : null}
      </div>

      {checkoutModalOpen && selectedBooking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-3 sm:p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px]">
            <CheckoutPanel
              booking={checkoutBookingDetails}
              onCheckout={handleCheckout}
              formatCurrency={formatCurrency}
              isModal
              onClose={() => setCheckoutModalOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <NotificationToast toast={toast} />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

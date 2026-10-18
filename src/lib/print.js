import { baht, dateLong, escapeHtml, minutesText, money, timeHM } from './format'
import { discountLabel } from './pricing'

const SLIP_CSS = `
  @page { size: 80mm auto; margin: 3mm; }
  body { width: 72mm; margin: 0 auto; font-family: 'Sarabun', Tahoma, sans-serif; font-size: 13px; color: #000; }
  h1 { font-size: 18px; text-align: center; margin: 0 0 2px; }
  .center { text-align: center; }
  .muted { color: #333; font-size: 12px; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
  .big { font-size: 18px; font-weight: 700; }
  hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; }
`

const PAGE_CSS = `
  @page { size: A4; margin: 14mm; }
  body { font-family: 'Sarabun', Tahoma, sans-serif; font-size: 13px; color: #111; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .muted { color: #555; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0; }
  .card { border: 1px solid #ccc; border-radius: 8px; padding: 8px 10px; }
  .card b { display: block; font-size: 18px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border-bottom: 1px solid #ddd; padding: 6px; text-align: left; }
  th { background: #f2f2f2; }
  td.num, th.num { text-align: right; }
  h2 { font-size: 16px; margin: 20px 0 0; }
`

/** Print through a hidden iframe so popup blockers never get in the way. */
export const printDocument = (title, body, paper = 'slip') => {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  document.body.appendChild(frame)

  const doc = frame.contentDocument
  doc.open()
  doc.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style>${paper === 'slip' ? SLIP_CSS : PAGE_CSS}</style></head><body>${body}</body></html>`)
  doc.close()

  const run = () => {
    frame.contentWindow.focus()
    frame.contentWindow.print()
    setTimeout(() => frame.remove(), 1000)
  }
  // Give the web font a moment; print anyway if it never arrives.
  setTimeout(run, 400)
}

const row = (label, value, className = '') =>
  `<div class="row ${className}"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`

export const printReceipt = ({ shopName, booking, therapistName, serviceTitle, roomName }) => {
  const discount = discountLabel(booking.discount)
  const body = `
    <h1>${escapeHtml(shopName)}</h1>
    <div class="center muted">ใบเสร็จรับเงิน</div>
    <div class="center muted">${escapeHtml(dateLong(booking.paidAt))} เวลา ${timeHM(booking.paidAt)}</div>
    <div class="center muted">เลขที่ ${escapeHtml(booking.id.slice(-6).toUpperCase())}</div>
    <hr>
    ${row('ลูกค้า', booking.customerName)}
    ${row('หมอนวด', therapistName)}
    ${row('ห้อง', roomName)}
    <hr>
    ${row(`${serviceTitle} (${minutesText(booking.minutes)})`, money(booking.price))}
    ${booking.discountBaht ? row(discount || 'ส่วนลด', `-${money(booking.discountBaht)}`) : ''}
    ${booking.tip ? row('ทิป', money(booking.tip)) : ''}
    <hr>
    ${row('รวมทั้งสิ้น', baht(booking.total), 'big')}
    ${booking.payCash ? row('เงินสด', money(booking.payCash)) : ''}
    ${booking.payQr ? row('โอน / QR', money(booking.payQr)) : ''}
    ${booking.received > booking.payCash ? row('รับเงินมา', money(booking.received)) : ''}
    ${booking.received > booking.payCash ? row('เงินทอน', money(booking.received - booking.payCash)) : ''}
    <hr>
    <div class="center">ขอบคุณที่ใช้บริการค่ะ</div>
  `
  printDocument('ใบเสร็จ', body)
}

export const printShiftSlip = ({ shopName, shift, showProfit, showPay }) => {
  const s = shift.summary
  const payouts = shift.payouts
    .filter((p) => p.paid)
    .map((p) => `<tr><td>${escapeHtml(p.name)} (${p.jobs} รอบ)</td><td class="num">${money(p.unpaid)}</td></tr>`)
    .join('')

  const body = `
    <h1>${escapeHtml(shopName)}</h1>
    <div class="center">ใบสรุปปิดรอบ</div>
    <div class="center muted">${escapeHtml(dateLong(shift.openedAt))}</div>
    <div class="center muted">เปิด ${timeHM(shift.openedAt)} – ปิด ${timeHM(shift.closedAt)}</div>
    <hr>
    ${row('จำนวนบิล', `${s.bills} บิล`)}
    ${s.voided ? row('บิลที่ยกเลิก', `${s.voided} บิล`) : ''}
    ${row('ยอดขาย (หลังส่วนลด)', money(s.revenue))}
    ${s.discount ? row('ส่วนลดรวม', money(s.discount)) : ''}
    ${row('รับเงินสด', money(s.cash))}
    ${row('รับโอน / QR', money(s.qr))}
    ${s.tips ? row('ทิป (ของหมอ)', money(s.tips)) : ''}
    <hr>
    ${row('เงินทอนตั้งต้น', money(shift.openingCash))}
    ${row('รายจ่ายจากลิ้นชัก', `-${money(s.expenseTotal)}`)}
    ${s.advanceTotal ? row('หมอเบิกล่วงหน้า', `-${money(s.advanceTotal)}`) : ''}
    ${s.payoutTotal ? row('จ่ายค่าหมอระหว่างวัน', `-${money(s.payoutTotal)}`) : ''}
    ${row('จ่ายค่าหมอตอนปิดรอบ', `-${money(shift.payoutsPaid)}`)}
    ${row('เงินสดที่ควรมี', money(shift.expectedCash), 'big')}
    ${row('นับได้จริง', money(shift.countedCash), 'big')}
    ${row(shift.difference === 0 ? 'ยอดตรง' : shift.difference > 0 ? 'เงินเกิน' : 'เงินขาด', money(Math.abs(shift.difference)), 'big')}
    ${shift.note ? `<div class="muted">หมายเหตุ: ${escapeHtml(shift.note)}</div>` : ''}
    <hr>
    ${showPay ? `<div><b>จ่ายค่าหมอ (ค่ามือ+การันตี+ทิป−เบิก)</b></div><table>${payouts || '<tr><td>—</td></tr>'}</table>` : ''}
    ${showProfit ? `<hr>${row('ค่ามือหมอรวม', money(s.commission))}${s.topUp ? row('ร้านเติมการันตี', money(s.topUp)) : ''}${row('กำไรสุทธิ', baht(s.profit), 'big')}` : ''}
    <hr>
    <div class="row"><span>ผู้ปิดรอบ ..................</span><span>ผู้ตรวจ ..................</span></div>
  `
  printDocument('ปิดรอบ', body)
}

export const printReport = ({ shopName, title, summary, payouts, rows }) => {
  const body = `
    <h1>${escapeHtml(shopName)} — ${escapeHtml(title)}</h1>
    <div class="muted">พิมพ์เมื่อ ${escapeHtml(dateLong(new Date()))} ${timeHM(new Date())}</div>
    <div class="cards">
      <div class="card">ยอดขาย<b>${baht(summary.revenue)}</b></div>
      <div class="card">ค่ามือหมอ (+การันตี)<b>${baht(summary.commission + summary.topUp)}</b></div>
      <div class="card">รายจ่ายอื่น<b>${baht(summary.expenseTotal)}</b></div>
      <div class="card">จำนวนบิล<b>${summary.bills} บิล</b></div>
      <div class="card">เฉลี่ยต่อบิล<b>${baht(summary.averageBill)}</b></div>
      <div class="card">กำไรสุทธิ<b>${baht(summary.profit)}</b></div>
    </div>
    <h2>ค่ามือหมอ</h2>
    <table>
      <thead><tr><th>หมอนวด</th><th class="num">วัน</th><th class="num">รอบ</th><th class="num">ค่ามือ</th><th class="num">การันตี</th><th class="num">ทิป</th><th class="num">เบิก</th><th class="num">สุทธิ</th></tr></thead>
      <tbody>${payouts
        .map((p) => `<tr><td>${escapeHtml(p.name)}</td><td class="num">${p.days}</td><td class="num">${p.jobs}</td><td class="num">${money(p.commission)}</td><td class="num">${money(p.topUp)}</td><td class="num">${money(p.tips)}</td><td class="num">${money(p.advance)}</td><td class="num">${money(p.net)}</td></tr>`)
        .join('')}</tbody>
    </table>
    <h2>รายการบิล</h2>
    <table>
      <thead><tr><th>วันที่</th><th>เวลา</th><th>ลูกค้า</th><th>บริการ</th><th>หมอนวด</th><th>ชำระ</th><th class="num">ยอด</th></tr></thead>
      <tbody>${rows
        .map((r) => `<tr><td>${escapeHtml(r.date)}</td><td>${r.time}</td><td>${escapeHtml(r.customer)}</td><td>${escapeHtml(r.service)}</td><td>${escapeHtml(r.therapist)}</td><td>${escapeHtml(r.method)}</td><td class="num">${money(r.amount)}</td></tr>`)
        .join('')}</tbody>
    </table>
  `
  printDocument(title, body, 'page')
}

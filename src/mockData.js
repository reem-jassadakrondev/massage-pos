const now = new Date()
const createTime = (minutesOffset) => new Date(now.getTime() + minutesOffset * 60000).toISOString()

export const initialTherapists = [
  { id: 't1', name: 'ป้าพร', nickname: 'พร', status: 'busy', checkinTime: '08:15', queueNumber: 1 },
  { id: 't2', name: 'พี่น้อย', nickname: 'น้อย', status: 'busy', checkinTime: '08:45', queueNumber: 2 },
  { id: 't3', name: 'หมอแดง', nickname: 'แดง', status: 'available', checkinTime: '09:10', queueNumber: 3 },
  { id: 't4', name: 'หมอนก', nickname: 'นก', status: 'off_duty', checkinTime: '—', queueNumber: 0 },
]

export const initialServices = [
  { id: 's1', title: 'นวดแผนไทย', duration_minutes: 60, price: 300, therapist_commission: 120 },
  { id: 's2', title: 'นวดแผนไทย', duration_minutes: 120, price: 550, therapist_commission: 230 },
  { id: 's3', title: 'นวดฝ่าเท้า', duration_minutes: 60, price: 300, therapist_commission: 120 },
  { id: 's4', title: 'นวดน้ำมันอโรม่า', duration_minutes: 90, price: 650, therapist_commission: 260 },
]

export const initialRooms = [
  { id: 'r1', room_name: 'เตียงเท้า 1', type: 'foot', status: 'available' },
  { id: 'r2', room_name: 'เตียงเท้า 2', type: 'foot', status: 'available' },
  { id: 'r3', room_name: 'ห้องนวดไทย 1', type: 'body', status: 'occupied' },
  { id: 'r4', room_name: 'ห้องนวดไทย 2', type: 'body', status: 'occupied' },
  { id: 'r5', room_name: 'ห้อง VIP', type: 'body', status: 'available' },
]

const customerNames = [
  'คุณจันทร์', 'คุณลัดดา', 'คุณวรรณ', 'คุณเมฆ', 'คุณแอน', 'คุณพร', 'คุณกานต์', 'คุณอุไร',
  'คุณปริม', 'คุณสกุล', 'คุณส้ม', 'คุณเบญ', 'คุณศิริ', 'คุณใบเตย', 'คุณอ้อม', 'คุณพรทิพย์',
  'คุณกิ่งกาญจน์', 'คุณศรี', 'คุณนิภา', 'คุณสุนีย์', 'คุณไปรมา', 'คุณวราภรณ์', 'คุณสุชาดา',
  'คุณอังคณา', 'คุณลัดดาวัลย์', 'คุณสายฝน', 'คุณพิม', 'คุณเกษรา', 'คุณริน', 'คุณชนากานต์',
]

const servicePool = ['s1', 's2', 's3', 's4']
const therapistPool = ['t1', 't2', 't3']
const paymentPool = ['cash', 'qr']
const reportMinuteOffsets = [
  35, 90, 180, 360, 540,
  1500, 1700, 2040, 2385, 2760,
  3400, 3900, 4800, 5600, 6400,
  7200, 8900, 10500, 12150, 13800,
  15450, 17100, 18750, 20400, 22050,
  24600, 26700, 29300, 31800, 34200,
]

const buildCompletedBooking = (index, minutesAgo, override = {}) => {
  const customerName = customerNames[index % customerNames.length]
  const serviceId = servicePool[(index + 2) % servicePool.length]
  const therapistId = therapistPool[index % therapistPool.length]
  const roomId = ['r1', 'r2', 'r3', 'r4', 'r5'][(index + 1) % 5]
  const service = initialServices.find((item) => item.id === serviceId)
  const total = service ? service.price : 300
  const durationMinutes = service ? service.duration_minutes : 60

  return {
    id: `b${index + 10}`,
    customerName,
    therapistId,
    serviceId,
    roomId,
    status: 'completed',
    paymentMethod: paymentPool[index % paymentPool.length],
    total,
    start: createTime(-minutesAgo),
    end: createTime(-(minutesAgo - durationMinutes)),
    duration_minutes: durationMinutes,
    ...override,
  }
}

export const initialBookings = [
  {
    id: 'b1',
    customerName: 'คุณจันทร์',
    therapistId: 't2',
    serviceId: 's1',
    roomId: 'r3',
    status: 'active',
    paymentMethod: 'cash',
    total: 300,
    start: createTime(-45),
    end: createTime(45),
    duration_minutes: 90,
  },
  {
    id: 'b2',
    customerName: 'คุณลัดดา',
    therapistId: 't1',
    serviceId: 's2',
    roomId: 'r4',
    status: 'active',
    paymentMethod: 'qr',
    total: 550,
    start: createTime(-60),
    end: createTime(60),
    duration_minutes: 120,
  },
  ...Array.from({ length: reportMinuteOffsets.length }, (_, index) =>
    buildCompletedBooking(index, reportMinuteOffsets[index]),
  ),
]

export const initialExpenses = [
  { id: 'e1', title: 'ซื้อแผ่นกดไอศครีม', amount: 80, time: createTime(-210) },
  { id: 'e2', title: 'ค่าน้ำยาทำความสะอาด', amount: 120, time: createTime(-120) },
  { id: 'e3', title: 'ซื้อน้ำแข็ง 10 กก.', amount: 40, time: createTime(-40) },
  { id: 'e4', title: 'ค่าส่งของแต่งหน้า', amount: 180, time: createTime(-320) },
  { id: 'e5', title: 'ค่าน้ำมันหล่อลื่น', amount: 260, time: createTime(-540) },
  { id: 'e6', title: 'ค่าไฟฟ้าร้าน', amount: 1500, time: createTime(-720) },
  { id: 'e7', title: 'ซื้อตัวอย่างอุปกรณ์', amount: 420, time: createTime(-1080) },
  { id: 'e8', title: 'ค่าวัสดุทำความสะอาด', amount: 90, time: createTime(-1440) },
]

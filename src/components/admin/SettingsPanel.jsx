import { PencilLine, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPanel({
  services,
  therapists,
  rooms,
  onAddService,
  onUpdateService,
  onDeleteService,
  onAddTherapist,
  onUpdateTherapist,
  onDeleteTherapist,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
}) {
  const [serviceForm, setServiceForm] = useState({ title: '', price: 300, therapist_commission: 120 })
  const [editingServiceId, setEditingServiceId] = useState(null)
  const [therapistForm, setTherapistForm] = useState({ name: '', nickname: '' })
  const [editingTherapistId, setEditingTherapistId] = useState(null)
  const [roomForm, setRoomForm] = useState({ room_name: '', type: 'body' })
  const [editingRoomId, setEditingRoomId] = useState(null)

  const handleServiceSubmit = () => {
    if (editingServiceId) {
      onUpdateService(editingServiceId, serviceForm)
    } else {
      onAddService(serviceForm)
    }

    setServiceForm({ title: '', price: 300, therapist_commission: 120 })
    setEditingServiceId(null)
  }

  const handleTherapistSubmit = () => {
    if (editingTherapistId) {
      onUpdateTherapist(editingTherapistId, therapistForm)
    } else {
      onAddTherapist(therapistForm)
    }

    setTherapistForm({ name: '', nickname: '' })
    setEditingTherapistId(null)
  }

  const handleRoomSubmit = () => {
    if (editingRoomId) {
      onUpdateRoom(editingRoomId, roomForm)
    } else {
      onAddRoom(roomForm)
    }

    setRoomForm({ room_name: '', type: 'body' })
    setEditingRoomId(null)
  }

  const beginEditService = (service) => {
    setEditingServiceId(service.id)
    setServiceForm({
      title: service.title,
      price: service.price,
      therapist_commission: service.therapist_commission,
    })
  }

  const beginEditTherapist = (therapist) => {
    setEditingTherapistId(therapist.id)
    setTherapistForm({ name: therapist.name, nickname: therapist.nickname })
  }

  const beginEditRoom = (room) => {
    setEditingRoomId(room.id)
    setRoomForm({ room_name: room.room_name, type: room.type })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-lg font-bold text-stone-800">จัดการคอร์ส</h3>
          <div className="space-y-3">
            <input value={serviceForm.title} onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })} placeholder="ชื่อคอร์ส" className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-emerald-500" />
            <div className="grid grid-cols-1 gap-3">
              <input type="number" value={serviceForm.price} onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })} placeholder="ราคา" className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-emerald-500" />
            </div>
            <input type="number" value={serviceForm.therapist_commission} onChange={(event) => setServiceForm({ ...serviceForm, therapist_commission: event.target.value })} placeholder="ค่ามือ" className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-emerald-500" />
            <button type="button" onClick={handleServiceSubmit} className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-base font-black text-white hover:bg-emerald-700">
              {editingServiceId ? 'บันทึกการแก้ไขคอร์ส' : 'เพิ่มคอร์ส'}
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {services.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                <div>
                  <p className="font-bold text-stone-800">{service.title}</p>
                  <p className="text-sm text-stone-500">{service.price} บาท</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => beginEditService(service)} className="rounded-xl bg-amber-100 p-2 text-amber-700"><PencilLine size={16} /></button>
                  <button type="button" onClick={() => onDeleteService(service.id)} className="rounded-xl bg-red-100 p-2 text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-lg font-bold text-stone-800">จัดการหมอนวด</h3>
          <div className="space-y-3">
            <input value={therapistForm.name} onChange={(event) => setTherapistForm({ ...therapistForm, name: event.target.value })} placeholder="ชื่อ-นามสกุล" className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-emerald-500" />
            <input value={therapistForm.nickname} onChange={(event) => setTherapistForm({ ...therapistForm, nickname: event.target.value })} placeholder="ชื่อเล่น" className="min-h-[52px] w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-emerald-500" />
            <button type="button" onClick={handleTherapistSubmit} className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-base font-black text-white hover:bg-emerald-700">
              {editingTherapistId ? 'บันทึกการแก้ไขหมอนวด' : 'เพิ่มหมอนวด'}
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {therapists.map((therapist) => (
              <div key={therapist.id} className="flex items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                <div>
                  <p className="font-bold text-stone-800">{therapist.name}</p>
                  <p className="text-sm text-stone-500">{therapist.nickname}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => beginEditTherapist(therapist)} className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><PencilLine size={16} /></button>
                  <button type="button" onClick={() => onDeleteTherapist(therapist.id)} className="rounded-xl bg-red-100 p-2 text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-bold text-stone-800">จัดการห้องนวด</h3>
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.7fr_auto]">
          <input
            value={roomForm.room_name}
            onChange={(event) => setRoomForm({ ...roomForm, room_name: event.target.value })}
            placeholder="ชื่อห้องนวด"
            className="min-h-[52px] rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-emerald-500"
          />
          <select
            value={roomForm.type}
            onChange={(event) => setRoomForm({ ...roomForm, type: event.target.value })}
            className="min-h-[52px] rounded-2xl border border-stone-200 bg-stone-50 px-4 text-base outline-none focus:border-emerald-500"
          >
            <option value="body">นวดตัว</option>
            <option value="foot">นวดเท้า</option>
            <option value="vip">VIP</option>
          </select>
          <button type="button" onClick={handleRoomSubmit} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-base font-black text-white hover:bg-emerald-700">
            {editingRoomId ? 'บันทึก' : 'เพิ่มห้อง'}
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <div>
                <p className="font-bold text-stone-800">{room.room_name}</p>
                <p className="text-sm text-stone-500">{room.type === 'foot' ? 'นวดเท้า' : room.type === 'vip' ? 'VIP' : 'นวดตัว'} • {room.status === 'occupied' ? 'กำลังใช้งาน' : 'ว่าง'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => beginEditRoom(room)} className="rounded-xl bg-amber-100 p-2 text-amber-700"><PencilLine size={16} /></button>
                <button type="button" onClick={() => onDeleteRoom(room.id)} className="rounded-xl bg-red-100 p-2 text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

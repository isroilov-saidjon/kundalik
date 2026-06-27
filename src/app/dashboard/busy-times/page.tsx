'use client'

import { useState, useEffect } from 'react'
import { Clock, Search, Send, X, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { uz } from 'date-fns/locale'

interface Profile { id: string; email: string; full_name?: string; avatar_url?: string }
interface BusySlot { start_time: string; end_time: string }

export default function BusyTimesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Profile | null>(null)
  const [busySlots, setBusySlots] = useState<BusySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const [newRequest, setNewRequest] = useState({ title: '', date: '', time: '', duration_minutes: 60 })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    fetch('/api/profiles').then(r => r.json()).then(d => setProfiles(Array.isArray(d) ? d : []))
  }, [])

  const filtered = profiles.filter(p =>
    (p.full_name || p.email).toLowerCase().includes(search.toLowerCase())
  )

  const selectUser = async (profile: Profile) => {
    setSelected(profile)
    setBusySlots([])
    setLoadingSlots(true)
    const r = await fetch(`/api/busy-times?user_id=${profile.id}`)
    const slots = await r.json()
    setBusySlots(Array.isArray(slots) ? slots : [])
    setLoadingSlots(false)
  }

  const sendRequest = async () => {
    if (!selected || !newRequest.title || !newRequest.date || !newRequest.time) return
    setSending(true)
    const proposed_time = new Date(`${newRequest.date}T${newRequest.time}:00+05:00`).toISOString()
    const res = await fetch('/api/meeting-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_email: selected.email,
        title: newRequest.title,
        proposed_time,
        duration_minutes: newRequest.duration_minutes,
      }),
    })
    setSending(false)
    if (res.ok) {
      setSent(true)
      setShowRequest(false)
      setNewRequest({ title: '', date: '', time: '', duration_minutes: 60 })
      setTimeout(() => setSent(false), 3000)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-100 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Band Vaqtlar</h1>
        <p className="text-sm text-gray-500">Foydalanuvchi tanlang va band vaqtlarini ko'ring</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: user list */}
        <div className="w-64 border-r border-gray-100 flex flex-col bg-white">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                placeholder="Qidirish..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-8">Foydalanuvchi topilmadi</p>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectUser(p)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${selected?.id === p.id ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''}`}
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700 flex-shrink-0">
                      {(p.full_name || p.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.full_name || p.email}</p>
                    {p.full_name && <p className="text-xs text-gray-400 truncate">{p.email}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: busy slots */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Clock className="w-12 h-12 mb-3 opacity-30" />
              <p>Chap tomonda foydalanuvchi tanlang</p>
            </div>
          ) : (
            <div className="max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selected.avatar_url ? (
                    <img src={selected.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-medium text-indigo-700">
                      {(selected.full_name || selected.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{selected.full_name || selected.email}</p>
                    <p className="text-xs text-gray-400">Band vaqtlari (rejalar ko'rinmaydi)</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRequest(true)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  <Send className="w-3.5 h-3.5" />
                  Uchrashuv so'ra
                </button>
              </div>

              {sent && (
                <div className="mb-4 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200">
                  So'rov muvaffaqiyatli yuborildi!
                </div>
              )}

              {loadingSlots ? (
                <p className="text-sm text-gray-400">Yuklanmoqda...</p>
              ) : busySlots.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                  Yaqin kunda band vaqtlar yo'q — bo'sh!
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">{busySlots.length} ta band vaqt</p>
                  {busySlots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-2 bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-sm text-gray-700">
                      <Clock className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>
                        {format(parseISO(slot.start_time), 'd MMM, HH:mm', { locale: uz })}
                        {' – '}
                        {format(parseISO(slot.end_time), 'HH:mm', { locale: uz })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Send Request Modal */}
      {showRequest && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Uchrashuv so'rovi</h3>
              <button onClick={() => setShowRequest(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Kimga: <b>{selected.full_name || selected.email}</b></p>
            <div className="space-y-3">
              <input
                placeholder="Sarlavha"
                value={newRequest.title}
                onChange={e => setNewRequest({ ...newRequest, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Sana</label>
                  <input
                    type="date"
                    value={newRequest.date}
                    onChange={e => setNewRequest({ ...newRequest, date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Vaqt</label>
                  <input
                    type="time"
                    value={newRequest.time}
                    onChange={e => setNewRequest({ ...newRequest, time: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Davomiyligi (daqiqa)</label>
                <div className="flex gap-2">
                  {[30, 60, 90, 120].map(m => (
                    <button
                      key={m}
                      onClick={() => setNewRequest({ ...newRequest, duration_minutes: m })}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${newRequest.duration_minutes === m ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowRequest(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Bekor</button>
              <button
                onClick={sendRequest}
                disabled={!newRequest.title || !newRequest.date || !newRequest.time || sending}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {sending ? 'Yuborilmoqda...' : 'Yuborish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

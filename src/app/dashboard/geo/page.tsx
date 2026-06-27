'use client'

import { useState, useEffect } from 'react'
import { MapPin, Plus, X, Bell, Plane, Calendar } from 'lucide-react'
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns'
import { uz } from 'date-fns/locale'

interface GeoReminder {
  id: string
  title: string
  destination: string
  trip_date: string
  reminder_sent: boolean
  created_at: string
}

function getDaysLabel(dateStr: string) {
  const date = parseISO(dateStr)
  if (isPast(date) && !isToday(date)) return { label: 'O\'tib ketdi', color: 'text-gray-400' }
  if (isToday(date)) return { label: 'Bugun!', color: 'text-red-600' }
  if (isTomorrow(date)) return { label: 'Ertaga', color: 'text-orange-500' }
  const days = differenceInDays(date, new Date())
  return { label: `${days} kun qoldi`, color: 'text-green-600' }
}

export default function GeoPage() {
  const [reminders, setReminders] = useState<GeoReminder[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newReminder, setNewReminder] = useState({ title: '', destination: '', trip_date: '' })
  const [loading, setLoading] = useState(false)

  const fetchReminders = async () => {
    const res = await fetch('/api/geo-reminders')
    const data = await res.json()
    setReminders(Array.isArray(data) ? data : [])
  }

  useEffect(() => { fetchReminders() }, [])

  const addReminder = async () => {
    if (!newReminder.title || !newReminder.destination || !newReminder.trip_date) return
    setLoading(true)
    await fetch('/api/geo-reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReminder),
    })
    setLoading(false)
    setShowAdd(false)
    setNewReminder({ title: '', destination: '', trip_date: '' })
    fetchReminders()
  }

  const deleteReminder = async (id: string) => {
    await fetch('/api/geo-reminders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchReminders()
  }

  const upcoming = reminders.filter((r) => !isPast(parseISO(r.trip_date)) || isToday(parseISO(r.trip_date)))
  const past = reminders.filter((r) => isPast(parseISO(r.trip_date)) && !isToday(parseISO(r.trip_date)))

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Geo Eslatmalar</h1>
          <p className="text-sm text-gray-500">Safar rejalari — 1 kun oldin eslatma</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Safar qo'shish
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {reminders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Plane className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Hali safar rejasi yo'q</p>
            <button onClick={() => setShowAdd(true)} className="text-indigo-600 text-sm mt-2 hover:underline">
              Birinchi safarni rejalashtiring
            </button>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Kelayotgan safarlar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {upcoming.map((r) => {
                    const { label, color } = getDaysLabel(r.trip_date)
                    return (
                      <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{r.title}</h3>
                              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                <Plane className="w-3.5 h-3.5" />
                                {r.destination}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(parseISO(r.trip_date), 'd MMMM yyyy', { locale: uz })}
                                </span>
                                <span className={`text-xs font-medium ${color}`}>{label}</span>
                              </div>
                              {r.reminder_sent && (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full mt-2">
                                  <Bell className="w-3 h-3" />
                                  Eslatma yuborildi
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteReminder(r.id)}
                            className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">O'tgan safarlar</h2>
                <div className="space-y-2">
                  {past.map((r) => (
                    <div key={r.id} className="bg-gray-50 rounded-lg px-4 py-3 flex items-center gap-3 opacity-60">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-700">{r.title}</span>
                        <span className="text-xs text-gray-400 ml-2">→ {r.destination}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(parseISO(r.trip_date), 'd MMM yyyy', { locale: uz })}
                      </span>
                      <button onClick={() => deleteReminder(r.id)} className="text-gray-300 hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Yangi safar rejasi</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input
                autoFocus
                placeholder="Sarlavha (masalan: Toshkent safari)"
                value={newReminder.title}
                onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <input
                placeholder="Manzil (masalan: Samarqand)"
                value={newReminder.destination}
                onChange={(e) => setNewReminder({ ...newReminder, destination: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Safar sanasi</label>
                <input
                  type="date"
                  value={newReminder.trip_date}
                  onChange={(e) => setNewReminder({ ...newReminder, trip_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
                <Bell className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">Safardan 1 kun oldin avtomatik eslatma yuboriladi</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Bekor</button>
              <button
                onClick={addReminder}
                disabled={!newReminder.title || !newReminder.destination || !newReminder.trip_date || loading}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

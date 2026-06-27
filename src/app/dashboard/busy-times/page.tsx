'use client'

import { useState, useEffect } from 'react'
import { Clock, Send, Check, X, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { uz } from 'date-fns/locale'

interface BusySlot { start_time: string; end_time: string }
interface MeetingRequest {
  id: string
  title: string
  proposed_time: string
  duration_minutes: number
  status: 'pending' | 'accepted' | 'declined'
  from_profile: { email: string; full_name?: string; avatar_url?: string }
  to_profile: { email: string; full_name?: string }
  from_user_id: string
  to_user_id: string
}

export default function BusyTimesPage() {
  const [requests, setRequests] = useState<MeetingRequest[]>([])
  const [busySlots, setBusySlots] = useState<BusySlot[]>([])
  const [checkEmail, setCheckEmail] = useState('')
  const [showRequest, setShowRequest] = useState(false)
  const [newRequest, setNewRequest] = useState({ to_email: '', title: '', proposed_time: '', duration_minutes: 60 })
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const fetchRequests = async () => {
    const res = await fetch('/api/meeting-requests')
    const data = await res.json()
    setRequests(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    fetchRequests()
    // Get current user id from the first request
    fetch('/api/meeting-requests').then(r => r.json()).then(data => {
      if (data.length > 0) {
        setCurrentUserId(data[0].from_user_id || data[0].to_user_id)
      }
    })
  }, [])

  const checkBusyTimes = async () => {
    if (!checkEmail) return
    // First get user by email via groups
    const res = await fetch('/api/groups')
    const groups = await res.json()
    let userId = ''
    for (const g of groups) {
      for (const m of (g.group_members || [])) {
        if (m.profiles?.email === checkEmail) { userId = m.profiles.id; break }
      }
    }
    if (!userId) { alert('Bu foydalanuvchi guruhingizda yo\'q'); return }

    const r = await fetch(`/api/busy-times?user_id=${userId}`)
    const slots = await r.json()
    setBusySlots(Array.isArray(slots) ? slots : [])
  }

  const sendRequest = async () => {
    setLoading(true)
    const res = await fetch('/api/meeting-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRequest),
    })
    setLoading(false)
    if (res.ok) {
      setShowRequest(false)
      setNewRequest({ to_email: '', title: '', proposed_time: '', duration_minutes: 60 })
      fetchRequests()
    }
  }

  const respond = async (id: string, status: 'accepted' | 'declined') => {
    await fetch('/api/meeting-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    fetchRequests()
  }

  const incoming = requests.filter((r) => r.to_user_id === currentUserId && r.status === 'pending')
  const outgoing = requests.filter((r) => r.from_user_id === currentUserId)

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Band Vaqtlar</h1>
          <p className="text-sm text-gray-500">A'zoning band soatlarini ko'ring, uchrashuv so'rang</p>
        </div>
        <button
          onClick={() => setShowRequest(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Send className="w-4 h-4" />
          So'rov yuborish
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Check busy times */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            Band vaqtlarni tekshirish
          </h2>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="A'zo email manzili"
              value={checkEmail}
              onChange={(e) => setCheckEmail(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button onClick={checkBusyTimes} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-200">
              Ko'rish
            </button>
          </div>
          {busySlots.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-500">{busySlots.length} ta band vaqt topildi (rejalar ko'rinmaydi)</p>
              {busySlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-red-50 px-3 py-2 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-red-400" />
                  {format(parseISO(slot.start_time), 'd MMM, HH:mm', { locale: uz })} –{' '}
                  {format(parseISO(slot.end_time), 'HH:mm', { locale: uz })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming requests */}
        {incoming.length > 0 && (
          <div className="bg-white rounded-xl border border-yellow-100 p-5 shadow-sm">
            <h2 className="font-medium text-gray-900 mb-3">Kiruvchi so'rovlar ({incoming.length})</h2>
            <div className="space-y-3">
              {incoming.map((req) => (
                <div key={req.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{req.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {req.from_profile?.full_name || req.from_profile?.email} •{' '}
                        {format(parseISO(req.proposed_time), 'd MMM HH:mm', { locale: uz })} •{' '}
                        {req.duration_minutes} daqiqa
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => respond(req.id, 'accepted')} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => respond(req.id, 'declined')} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing requests */}
        {outgoing.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-medium text-gray-900 mb-3">Yuborilgan so'rovlar</h2>
            <div className="space-y-3">
              {outgoing.map((req) => (
                <div key={req.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{req.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {req.to_profile?.full_name || req.to_profile?.email} •{' '}
                      {format(parseISO(req.proposed_time), 'd MMM HH:mm', { locale: uz })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    req.status === 'accepted' ? 'bg-green-50 text-green-700' :
                    req.status === 'declined' ? 'bg-red-50 text-red-600' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>
                    {req.status === 'accepted' ? 'Qabul qilindi' : req.status === 'declined' ? 'Rad etildi' : 'Kutilmoqda'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Send Request Modal */}
      {showRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Uchrashuv so'rovi</h3>
              <button onClick={() => setShowRequest(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Kimga (email)"
                value={newRequest.to_email}
                onChange={(e) => setNewRequest({ ...newRequest, to_email: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <input
                placeholder="Sarlavha"
                value={newRequest.title}
                onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <input
                type="datetime-local"
                value={newRequest.proposed_time}
                onChange={(e) => setNewRequest({ ...newRequest, proposed_time: new Date(e.target.value).toISOString() })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  placeholder="Davomiyligi (daqiqa)"
                  value={newRequest.duration_minutes}
                  onChange={(e) => setNewRequest({ ...newRequest, duration_minutes: parseInt(e.target.value) })}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowRequest(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Bekor</button>
              <button
                onClick={sendRequest}
                disabled={!newRequest.to_email || !newRequest.title || !newRequest.proposed_time || loading}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Yuborilmoqda...' : 'Yuborish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

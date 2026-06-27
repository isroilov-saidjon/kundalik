'use client'

import { useState, useEffect } from 'react'
import { Check, X, Clock, Bell } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { uz } from 'date-fns/locale'

interface MeetingRequest {
  id: string
  title: string
  proposed_time: string
  duration_minutes: number
  status: 'pending' | 'accepted' | 'declined'
  from_profile: { id: string; email: string; full_name?: string; avatar_url?: string }
  to_profile: { id: string; email: string; full_name?: string }
  from_user_id: string
  to_user_id: string
}

export default function MessagesPage() {
  const [requests, setRequests] = useState<MeetingRequest[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [loading, setLoading] = useState(true)

  const fetchRequests = async () => {
    const res = await fetch('/api/meeting-requests')
    const data = await res.json()
    if (Array.isArray(data)) {
      setRequests(data)
      if (data.length > 0) {
        // figure out current user from the data
        const r = data[0]
        // We'll determine from the profile fetch
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    // Get current user id
    fetch('/api/profiles').then(r => r.json()).then(() => {
      // profiles API returns OTHER users, so we need to get self from meeting_requests
    })
    // Get current user id via supabase
    fetch('/api/events').then(() => {}) // just to warm up auth

    // Get user id from a dedicated endpoint — use meeting_requests context
    fetchRequests()

    // Also get self user id
    fetch('/api/busy-times?user_id=self').catch(() => {})
  }, [])

  useEffect(() => {
    // Determine current user from requests
    if (requests.length > 0 && !currentUserId) {
      setCurrentUserId(requests[0].from_user_id)
    }
  }, [requests])

  // Better: get current user via a simple approach — fetch self profile
  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.id) setCurrentUserId(d.id)
    }).catch(() => {})
  }, [])

  const respond = async (id: string, status: 'accepted' | 'declined') => {
    await fetch('/api/meeting-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    fetchRequests()
  }

  const incoming = requests.filter(r => r.to_user_id === currentUserId)
  const outgoing = requests.filter(r => r.from_user_id === currentUserId)
  const pendingCount = incoming.filter(r => r.status === 'pending').length

  const statusBadge = (status: string) => {
    if (status === 'accepted') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">Qabul qilindi</span>
    if (status === 'declined') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Rad etildi</span>
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-medium">Kutilmoqda</span>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-600" />
          <h1 className="text-lg font-semibold text-gray-900">Xabarlar</h1>
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">{pendingCount}</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Uchrashuv so'rovlari</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white px-6">
        <button
          onClick={() => setTab('incoming')}
          className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${tab === 'incoming' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Kiruvchi
          {pendingCount > 0 && <span className="ml-1.5 bg-red-100 text-red-600 text-xs rounded-full px-1.5">{pendingCount}</span>}
        </button>
        <button
          onClick={() => setTab('outgoing')}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'outgoing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Yuborilgan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-sm text-gray-400">Yuklanmoqda...</p>
        ) : tab === 'incoming' ? (
          incoming.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Kiruvchi so'rovlar yo'q</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-lg">
              {incoming.map(req => (
                <div key={req.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {req.from_profile?.avatar_url ? (
                        <img src={req.from_profile.avatar_url} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-700 flex-shrink-0">
                          {(req.from_profile?.full_name || req.from_profile?.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{req.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {req.from_profile?.full_name || req.from_profile?.email}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {format(parseISO(req.proposed_time), 'd MMM yyyy, HH:mm', { locale: uz })}
                          <span className="text-gray-400">•</span>
                          {req.duration_minutes} daqiqa
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {req.status === 'pending' ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => respond(req.id, 'accepted')}
                            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                            title="Qabul qilish"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => respond(req.id, 'declined')}
                            className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                            title="Rad etish"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : statusBadge(req.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          outgoing.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Yuborilgan so'rovlar yo'q</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-lg">
              {outgoing.map(req => (
                <div key={req.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{req.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Kimga: {req.to_profile?.full_name || req.to_profile?.email}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {format(parseISO(req.proposed_time), 'd MMM yyyy, HH:mm', { locale: uz })}
                        <span className="text-gray-400">•</span>
                        {req.duration_minutes} daqiqa
                      </div>
                    </div>
                    {statusBadge(req.status)}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, UserPlus, X, Crown } from 'lucide-react'

interface Member {
  id: string
  role: string
  user_id: string
  profiles: { id: string; email: string; full_name?: string; avatar_url?: string }
}

interface Group {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  group_members: Member[]
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showAddMember, setShowAddMember] = useState<string | null>(null)
  const [newGroup, setNewGroup] = useState({ name: '', description: '' })
  const [memberEmail, setMemberEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchGroups = async () => {
    const res = await fetch('/api/groups')
    const data = await res.json()
    setGroups(Array.isArray(data) ? data : [])
  }

  useEffect(() => { fetchGroups() }, [])

  const createGroup = async () => {
    if (!newGroup.name) return
    setLoading(true)
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGroup),
    })
    setLoading(false)
    setShowCreate(false)
    setNewGroup({ name: '', description: '' })
    fetchGroups()
  }

  const addMember = async (groupId: string) => {
    if (!memberEmail) return
    setLoading(true)
    const res = await fetch('/api/groups/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, email: memberEmail }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setShowAddMember(null)
      setMemberEmail('')
      fetchGroups()
    } else {
      alert(data.error === 'Foydalanuvchi topilmadi'
        ? 'Bu email bilan foydalanuvchi topilmadi. Avval u ilovaga kirib ro\'yxatdan o\'tishi kerak.'
        : data.error || 'Xatolik yuz berdi')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Guruhlar</h1>
          <p className="text-sm text-gray-500">A'zolar va guruh voqealarini boshqaring</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Guruh yaratish
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {groups.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Hali guruh yo'q</p>
            <button onClick={() => setShowCreate(true)} className="text-indigo-600 text-sm mt-2 hover:underline">
              Birinchi guruhni yarating
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <div key={group.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{group.name}</h3>
                      {group.description && <p className="text-xs text-gray-500">{group.description}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddMember(group.id)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="A'zo qo'shish"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">A'zolar ({group.group_members?.length || 0})</p>
                  {group.group_members?.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      {member.profiles?.avatar_url ? (
                        <img src={member.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                          {(member.profiles?.full_name || member.profiles?.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-gray-700 flex-1">
                        {member.profiles?.full_name || member.profiles?.email}
                      </span>
                      {member.role === 'admin' && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Yangi guruh</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input
                autoFocus
                placeholder="Guruh nomi"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <textarea
                placeholder="Tavsif (ixtiyoriy)"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Bekor</button>
              <button onClick={createGroup} disabled={!newGroup.name || loading} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Yaratilmoqda...' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">A'zo qo'shish</h3>
              <button onClick={() => setShowAddMember(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <input
              autoFocus
              type="email"
              placeholder="Email manzil"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddMember(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Bekor</button>
              <button onClick={() => addMember(showAddMember)} disabled={!memberEmail || loading} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

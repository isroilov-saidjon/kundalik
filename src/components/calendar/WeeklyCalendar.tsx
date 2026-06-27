'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, User, Users, MapPin } from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns'
import { uz } from 'date-fns/locale'
import type { Event } from '@/lib/types'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0:00 - 23:00
const TYPE_COLORS = {
  personal: 'bg-blue-500 border-blue-600',
  group: 'bg-green-500 border-green-600',
  geo: 'bg-orange-500 border-orange-600',
}

const OVERLAP_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-teal-500',
  'bg-indigo-500',
]
const TYPE_ICONS = { personal: User, group: Users, geo: MapPin }

export default function WeeklyCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null)
  const [newEvent, setNewEvent] = useState({ title: '', type: 'personal', description: '', location: '' })
  const [loading, setLoading] = useState(false)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const fetchEvents = useCallback(async () => {
    const res = await fetch('/api/events')
    const data = await res.json()
    setEvents(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 10000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  const handleCellClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour })
    setShowAddModal(true)
  }

  const handleAddEvent = async () => {
    if (!newEvent.title || !selectedSlot) return
    setLoading(true)
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newEvent,
        date: format(selectedSlot.date, 'yyyy-MM-dd'),
        time: `${selectedSlot.hour.toString().padStart(2, '0')}:00`,
      }),
    })
    setLoading(false)
    setShowAddModal(false)
    setNewEvent({ title: '', type: 'personal', description: '', location: '' })
    fetchEvents()
  }

  const handleDeleteEvent = async (id: string) => {
    await fetch('/api/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchEvents()
  }

  const HOUR_HEIGHT = 56 // px per hour (h-14 = 3.5rem = 56px)

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseISO(e.start_time), day))

  const getEventStyle = (ev: Event, colIndex = 0, colCount = 1) => {
    const start = parseISO(ev.start_time)
    const end = parseISO(ev.end_time)
    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const endMinutes = end.getHours() * 60 + end.getMinutes()
    const duration = Math.max(endMinutes - startMinutes, 30)
    const offsetMinutes = (HOURS[0]) * 60
    const width = 100 / colCount
    return {
      top: `${((startMinutes - offsetMinutes) / 60) * HOUR_HEIGHT}px`,
      height: `${(duration / 60) * HOUR_HEIGHT}px`,
      left: `${colIndex * width + 1}%`,
      right: `${100 - (colIndex + 1) * width + 1}%`,
    }
  }

  const getLayoutForDay = (dayEvents: Event[]) => {
    return dayEvents.map((ev, i) => {
      const start = parseISO(ev.start_time)
      const end = parseISO(ev.end_time)
      const overlaps = dayEvents.filter((other, j) => {
        if (i === j) return false
        const oStart = parseISO(other.start_time)
        const oEnd = parseISO(other.end_time)
        return start < oEnd && end > oStart
      })
      const colCount = overlaps.length + 1
      const colIndex = dayEvents.slice(0, i).filter((other) => {
        const oStart = parseISO(other.start_time)
        const oEnd = parseISO(other.end_time)
        return start < oEnd && end > oStart
      }).length
      return { ev, colIndex, colCount }
    })
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {format(weekStart, 'd MMM', { locale: uz })} – {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: uz })}
          </span>
          <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button onClick={() => setCurrentDate(new Date())} className="text-xs text-indigo-600 font-medium hover:underline">
          Bugun
        </button>
      </div>

      {/* Days header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100">
        <div />
        {days.map((day) => {
          const isToday = isSameDay(day, new Date())
          return (
            <div key={day.toISOString()} className="text-center py-2 border-l border-gray-100">
              <p className="text-xs text-gray-400">{format(day, 'EEE', { locale: uz })}</p>
              <p className={cn('text-sm font-medium', isToday && 'text-indigo-600')}>
                {format(day, 'd')}
              </p>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="flex">
          {/* Hour labels */}
          <div className="w-[60px] flex-shrink-0">
            {HOURS.map((hour) => (
              <div key={hour} className="h-14 text-right pr-2 pt-1 text-xs text-gray-400 border-b border-gray-50">
                {`${String(hour).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => (
            <div key={day.toISOString()} className="flex-1 border-l border-gray-100 relative">
              {/* Hour cells (background) */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  onClick={() => handleCellClick(new Date(day), hour)}
                  className="h-14 border-b border-gray-100 hover:bg-indigo-50/30 cursor-pointer relative group transition-colors"
                >
                  <Plus className="w-3 h-3 text-indigo-300 absolute top-1 right-1 opacity-0 group-hover:opacity-100" />
                </div>
              ))}

              {/* Events (absolutely positioned over the background) */}
              {getLayoutForDay(getEventsForDay(day)).map(({ ev, colIndex, colCount }) => {
                const Icon = TYPE_ICONS[ev.type as keyof typeof TYPE_ICONS] || User
                const style = getEventStyle(ev, colIndex, colCount)
                return (
                  <div
                    key={ev.id}
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: style.top, height: style.height, left: style.left, right: style.right }}
                    className={cn(
                      'rounded text-white text-xs px-1.5 py-1 flex flex-col overflow-hidden group/ev z-10',
                      colCount > 1
                        ? OVERLAP_COLORS[colIndex % OVERLAP_COLORS.length]
                        : TYPE_COLORS[ev.type as keyof typeof TYPE_COLORS] || 'bg-gray-500'
                    )}
                  >
                    <div className="flex items-start gap-1">
                      <Icon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="truncate flex-1 font-medium">{ev.title}</span>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="opacity-0 group-hover/ev:opacity-100 hover:text-red-200 flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {ev.location && <span className="text-white/70 text-xs mt-0.5 truncate">📍 {ev.location}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Yangi voqea</h3>
            {selectedSlot && (
              <p className="text-sm text-gray-500 mb-4">
                {format(selectedSlot.date, 'd MMMM', { locale: uz })}, {selectedSlot.hour}:00
              </p>
            )}
            <div className="space-y-3">
              <input
                autoFocus
                placeholder="Sarlavha"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <select
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="personal">Shaxsiy</option>
                <option value="group">Guruh</option>
                <option value="geo">Geo / Safar</option>
              </select>
              <input
                placeholder="Joy (ixtiyoriy)"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <textarea
                placeholder="Tavsif (ixtiyoriy)"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Bekor
              </button>
              <button
                onClick={handleAddEvent}
                disabled={!newEvent.title || loading}
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

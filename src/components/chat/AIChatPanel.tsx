'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Send, Loader2, User, MapPin, Users, CheckCircle } from 'lucide-react'
import type { ParsedTask } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  tasks?: ParsedTask[]
}

const taskTypeConfig = {
  personal: { label: 'Shaxsiy', icon: User, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  group: { label: 'Guruh', icon: Users, color: 'bg-green-50 text-green-700 border-green-200' },
  geo: { label: 'Geo', icon: MapPin, color: 'bg-orange-50 text-orange-700 border-orange-200' },
}

export default function AIChatPanel() {
  const [pendingTasks, setPendingTasks] = useState<{ task: ParsedTask; conflict: string }[]>([])

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [{
      id: '0',
      role: 'assistant',
      content: 'Salom! Men sizning shaxsiy yordamchingizman. Istalgan narsani gaplashing — rejalaringiz, savollaringiz yoki shunchaki suhbat. Agar biror vazifa yoki uchrashuv aytgan bo\'lsangiz, avtomatik kalendarga saqlayman.',
    }]
    const saved = localStorage.getItem('kundalik-chat')
    if (saved) return JSON.parse(saved)
    return [{
      id: '0',
      role: 'assistant',
      content: 'Salom! Men sizning shaxsiy yordamchingizman. Istalgan narsani gaplashing — rejalaringiz, savollaringiz yoki shunchaki suhbat. Agar biror vazifa yoki uchrashuv aytgan bo\'lsangiz, avtomatik kalendarga saqlayman.',
    }]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const isFirstMount = useRef(true)

  useLayoutEffect(() => {
    if (isFirstMount.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      isFirstMount.current = false
    }
  }, [])

  useEffect(() => {
    if (!isFirstMount.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    localStorage.setItem('kundalik-chat', JSON.stringify(messages))
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    const currentInput = input
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const history = messages
      .filter((m) => m.id !== '0')
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const now = new Date()
      const localDate = now.toLocaleDateString('en-CA') // YYYY-MM-DD
      const localTime = now.toTimeString().slice(0, 5) // HH:MM

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, history, localDate, localTime }),
      })
      const data = await res.json()

      const msgId = (Date.now() + 1).toString()
      const assistantMsg: Message = {
        id: msgId,
        role: 'assistant',
        content: data.reply || 'Tushundim!',
        tasks: data.tasks?.length > 0 ? data.tasks : undefined,
      }
      setMessages((prev) => [...prev, assistantMsg])

      if (data.tasks && data.tasks.length > 0) {
        const existingRes = await fetch('/api/events')
        const existing: import('@/lib/types').Event[] = await existingRes.json()

        for (const task of data.tasks as ParsedTask[]) {
          if (task.action === 'delete') {
            await fetch('/api/events', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: task.title, date: task.date }),
            })
            continue
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyTask = task as any
          if (task.action === 'delete_range') {
            await fetch('/api/events', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ date_from: anyTask.date_from, date_to: anyTask.date_to }),
            })
            continue
          }

          if (task.action === 'clarify') continue

          if (task.date && task.time) {
            const taskStart = new Date(`${task.date}T${task.time}:00`)
            const taskEnd = task.end_time
              ? new Date(`${task.date}T${task.end_time}:00`)
              : new Date(taskStart.getTime() + 60 * 60 * 1000)

            const conflict = existing.find((ev) => {
              const evStart = new Date(ev.start_time)
              const evEnd = new Date(ev.end_time)
              return evStart < taskEnd && evEnd > taskStart
            })

            if (conflict) {
              setPendingTasks((prev) => [...prev, { task, conflict: conflict.title }])
              continue
            }
          }

          await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task),
          })
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const confirmPending = async (task: ParsedTask) => {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    })
    setPendingTasks((prev) => prev.filter((p) => p.task !== task))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className="max-w-2xl w-full">
              <div
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm ml-auto w-fit max-w-full'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
                )}
              >
                {msg.content}
              </div>

              {msg.tasks && msg.tasks.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-gray-400 ml-1">Avtomatik saqlandi:</p>
                  {msg.tasks.map((task, i) => {
                    const cfg = taskTypeConfig[task.type] || taskTypeConfig.personal
                    return (
                      <div key={i} className={cn('border rounded-xl p-3 text-sm', cfg.color)}>
                        <div className="flex items-center gap-2 mb-1">
                          <cfg.icon className="w-3.5 h-3.5" />
                          <span className="font-medium text-xs uppercase tracking-wide">{cfg.label}</span>
                          <CheckCircle className="w-3.5 h-3.5 ml-auto text-green-600" />
                        </div>
                        <p className="font-semibold">{task.title}</p>
                        {task.description && <p className="text-xs opacity-75 mt-0.5">{task.description}</p>}
                        <div className="flex gap-3 mt-1.5 text-xs opacity-70">
                          {task.date && <span>📅 {task.date}</span>}
                          {task.time && <span>🕐 {task.time}</span>}
                          {task.location && <span>📍 {task.location}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {pendingTasks.length > 0 && (
        <div className="border-t border-amber-100 bg-amber-50 px-4 py-3 space-y-2">
          {pendingTasks.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-amber-800">
                ⚠️ <b>{p.task.title}</b> — bu vaqtda <b>{p.conflict}</b> bor. Qo'shayinmi?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => confirmPending(p.task)}
                  className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-medium"
                >
                  Ha
                </button>
                <button
                  onClick={() => setPendingTasks((prev) => prev.filter((_, j) => j !== i))}
                  className="px-3 py-1 border border-amber-300 text-amber-700 rounded-lg text-xs font-medium"
                >
                  Yo'q
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 bg-white p-4">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Yozing... (masalan: Ertaga Alisher bilan uchrashuv bor, yoki shunchaki suhbat)"
            className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[48px] max-h-32"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

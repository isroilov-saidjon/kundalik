import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ParsedTask } from '@/lib/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const task: ParsedTask & { group_id: string } = body

  const startDate = task.date || new Date().toISOString().split('T')[0]
  const startTime = task.time || '09:00'
  const startISO = new Date(`${startDate}T${startTime}:00+05:00`).toISOString()
  const endISO = task.end_time
    ? new Date(`${startDate}T${task.end_time}:00+05:00`).toISOString()
    : new Date(new Date(startISO).getTime() + 60 * 60 * 1000).toISOString()

  // Get all group members
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', task.group_id)

  if (!members || members.length === 0) {
    return NextResponse.json({ error: 'Guruh a\'zolari topilmadi' }, { status: 404 })
  }

  const events = members.map((m) => ({
    title: task.title,
    description: task.description,
    start_time: startISO,
    end_time: endISO,
    type: 'group',
    user_id: m.user_id,
    location: task.location,
    group_id: task.group_id,
  }))

  const { error } = await supabase.from('events').insert(events)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, count: events.length })
}

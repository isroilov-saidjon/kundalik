import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ParsedTask } from '@/lib/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .order('start_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const task: ParsedTask = await request.json()

  const startDate = task.date || new Date().toISOString().split('T')[0]
  const startTime = task.time || '09:00'
  const startISO = new Date(`${startDate}T${startTime}:00+05:00`).toISOString()
  const endISO = task.end_time
    ? new Date(`${startDate}T${task.end_time}:00+05:00`).toISOString()
    : new Date(new Date(startISO).getTime() + 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: task.title,
      description: task.description,
      start_time: startISO,
      end_time: endISO,
      type: task.type,
      user_id: user.id,
      location: task.location,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, title, date, date_from, date_to } = await request.json()

  if (id) {
    const { error } = await supabase.from('events').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Sana oralig'ida o'chirish (UTC+5 hisobga olingan)
  if (date_from && date_to) {
    const fromISO = new Date(`${date_from}T00:00:00+05:00`).toISOString()
    const toISO = new Date(`${date_to}T23:59:59+05:00`).toISOString()
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('user_id', user.id)
      .gte('start_time', fromISO)
      .lte('start_time', toISO)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Title + date orqali qidirish
  if (title) {
    let query = supabase.from('events').delete().eq('user_id', user.id).ilike('title', `%${title}%`)
    if (date) {
      query = query.gte('start_time', `${date}T00:00:00`).lte('start_time', `${date}T23:59:59`)
    }
    const { error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'id yoki title kerak' }, { status: 400 })
}

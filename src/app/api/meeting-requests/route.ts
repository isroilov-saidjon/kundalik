import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('meeting_requests')
    .select(`
      *,
      from_profile:profiles!meeting_requests_from_user_id_fkey(id, email, full_name, avatar_url),
      to_profile:profiles!meeting_requests_to_user_id_fkey(id, email, full_name, avatar_url)
    `)
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to_email, proposed_time, duration_minutes, title } = await request.json()

  const { data: toProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', to_email)
    .single()

  if (!toProfile) return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 })

  const { data, error } = await supabase
    .from('meeting_requests')
    .insert({ from_user_id: user.id, to_user_id: toProfile.id, proposed_time, duration_minutes: duration_minutes || 60, title })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await request.json()

  const { data: mr } = await supabase.from('meeting_requests').select('*').eq('id', id).single()
  if (!mr) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 })

  await supabase.from('meeting_requests').update({ status }).eq('id', id)

  // If accepted, create events for both users
  if (status === 'accepted') {
    const endTime = new Date(new Date(mr.proposed_time).getTime() + mr.duration_minutes * 60000).toISOString()
    const baseEvent = { title: mr.title, start_time: mr.proposed_time, end_time: endTime, type: 'personal' }
    await supabase.from('events').insert([
      { ...baseEvent, user_id: mr.from_user_id },
      { ...baseEvent, user_id: mr.to_user_id },
    ])
  }

  return NextResponse.json({ success: true })
}

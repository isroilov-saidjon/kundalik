import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group_id,
      role,
      groups (
        id, name, description, created_by, created_at,
        group_members (
          id, role, user_id,
          profiles (id, email, full_name, avatar_url)
        )
      )
    `)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.map((d) => d.groups) || [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await request.json()

  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name, description, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'admin' })

  return NextResponse.json(group)
}

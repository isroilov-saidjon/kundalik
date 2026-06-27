export type TaskType = 'personal' | 'group' | 'geo'

export interface ParsedTask {
  action?: 'create' | 'delete' | 'delete_range' | 'clarify'
  type: TaskType
  title: string
  description?: string
  date?: string
  time?: string
  end_time?: string
  location?: string
  groupId?: string
  reminder?: string
}

export interface AIResponse {
  tasks: ParsedTask[]
  summary: string
}

export interface Event {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  type: TaskType
  user_id: string
  group_id?: string
  location?: string
  google_event_id?: string
  created_at: string
}

export interface Group {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  profile?: Profile
}

export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

export interface BusySlot {
  user_id: string
  start_time: string
  end_time: string
}

export interface MeetingRequest {
  id: string
  from_user_id: string
  to_user_id: string
  proposed_time: string
  duration_minutes: number
  title: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export interface GeoReminder {
  id: string
  user_id: string
  title: string
  destination: string
  trip_date: string
  reminder_sent: boolean
  created_at: string
}

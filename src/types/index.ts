export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  role: 'client' | 'worker' | 'admin'
  phone_verified: boolean
  avatar_url?: string
  created_at: string
}

export interface WorkerProfile {
  id: string
  user_id: string
  full_name: string
  phone: string
  city: string
  nationality: string
  bio: string
  skills: string[]
  id_number: string
  id_image_url?: string
  id_verified: boolean
  is_approved: boolean
  is_online: boolean
  availability_status: 'online' | 'offline' | 'busy'
  rating: number
  total_tasks: number
  schedule: Record<string, { from: string; to: string; active: boolean }>
  created_at: string
  profiles?: Profile
}

export interface Task {
  id: string
  client_id: string
  user_id?: string
  worker_id?: string
  title: string
  description: string
  category: string
  city: string
  status: 'open' | 'accepted' | 'in_progress' | 'pending_confirmation' | 'completed' | 'cancelled' | 'disputed'
  price_suggested?: number
  price_final?: number
  worker_price?: number
  negotiation_status?: 'pending' | 'accepted' | 'rejected'
  completion_proof?: string
  completion_note?: string
  use_ai: boolean
  created_at: string
  profiles?: Profile
  worker_profiles?: WorkerProfile
}

export interface Message {
  id: string
  task_id: string
  sender_id: string
  content: string
  is_blocked: boolean
  created_at: string
  profiles?: Profile
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  read: boolean
  created_at: string
}

export interface SupportMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

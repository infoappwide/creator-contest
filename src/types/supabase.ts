export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          timezone: string | null
          email: string | null
          is_pro: boolean | null
          push_token: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          username: string
          timezone?: string | null
          email?: string | null
          is_pro?: boolean | null
          push_token?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          timezone?: string | null
          email?: string | null
          is_pro?: boolean | null
          push_token?: string | null
          updated_at?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          start_date: string | null
          is_completed: boolean | null
          snooze_duration: number | null
          is_recurring: boolean | null
          recurrence_rule: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          start_date?: string | null
          is_completed?: boolean | null
          snooze_duration?: number | null
          is_recurring?: boolean | null
          recurrence_rule?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          start_date?: string | null
          is_completed?: boolean | null
          snooze_duration?: number | null
          is_recurring?: boolean | null
          recurrence_rule?: string | null
          created_at?: string
        }
      }
    }
  }
}
// Database types for Supabase
// Run `npx supabase gen types typescript --project-id your-project-id > lib/database.types.ts` to generate

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
      app_users: {
        Row: {
          id: string
          telegram_id: string
          telegram_username: string | null
          telegram_first_name: string | null
          telegram_last_name: string | null
          telegram_language_code: string | null
          telegram_photo_url: string | null
          username: string | null
          first_name: string | null
          last_name: string | null
          photo_url: string | null
          language: string
          email: string | null
          phone: string | null
          email_verified: string | null
          phone_verified: string | null
          day: number
          streak: number
          points: number
          auth_provider: string | null
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          telegram_id: string
          telegram_username?: string | null
          telegram_first_name?: string | null
          telegram_last_name?: string | null
          telegram_language_code?: string | null
          telegram_photo_url?: string | null
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          photo_url?: string | null
          language?: string
          email?: string | null
          phone?: string | null
          email_verified?: string | null
          phone_verified?: string | null
          day?: number
          streak?: number
          points?: number
          auth_provider?: string | null
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          telegram_id?: string
          telegram_username?: string | null
          telegram_first_name?: string | null
          telegram_last_name?: string | null
          telegram_language_code?: string | null
          telegram_photo_url?: string | null
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          photo_url?: string | null
          language?: string
          email?: string | null
          phone?: string | null
          email_verified?: string | null
          phone_verified?: string | null
          day?: number
          streak?: number
          points?: number
          auth_provider?: string | null
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          weight: number | null
          height: number | null
          age: number | null
          sex: string | null
          target_weight: number | null
          target_calories: number | null
          work_profile: string | null
          water_baseline: number
          waist: number | null
          hips: number | null
          chest: number | null
          bicep: number | null
          thigh: number | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          weight?: number | null
          height?: number | null
          age?: number | null
          sex?: string | null
          target_weight?: number | null
          target_calories?: number | null
          work_profile?: string | null
          water_baseline?: number
          waist?: number | null
          hips?: number | null
          chest?: number | null
          bicep?: number | null
          thigh?: number | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          weight?: number | null
          height?: number | null
          age?: number | null
          sex?: string | null
          target_weight?: number | null
          target_calories?: number | null
          work_profile?: string | null
          water_baseline?: number
          waist?: number | null
          hips?: number | null
          chest?: number | null
          bicep?: number | null
          thigh?: number | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      daily_wellbeing: {
        Row: {
          id: string
          user_id: string
          date: string
          preset: string
          answers: string
          scores: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          preset: string
          answers: string
          scores?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          preset?: string
          answers?: string
          scores?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      weekly_wellbeing: {
        Row: {
          id: string
          user_id: string
          year: number
          week: number
          preset: string
          answers: string
          scores: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          week: number
          preset: string
          answers: string
          scores?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          year?: number
          week?: number
          preset?: string
          answers?: string
          scores?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      daily_state: {
        Row: {
          id: string
          user_id: string
          date: string
          mood: number | null
          energy: number | null
          notes: string | null
          stress: number | null
          sleep_hours: number | null
          sleep_quality: number | null
          is_failure_day: boolean
          failure_reasons: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          mood?: number | null
          energy?: number | null
          notes?: string | null
          stress?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          is_failure_day?: boolean
          failure_reasons?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          mood?: number | null
          energy?: number | null
          notes?: string | null
          stress?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          is_failure_day?: boolean
          failure_reasons?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type AppUser = Database['public']['Tables']['app_users']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type DailyWellbeing = Database['public']['Tables']['daily_wellbeing']['Row']
export type WeeklyWellbeing = Database['public']['Tables']['weekly_wellbeing']['Row']
export type DailyState = Database['public']['Tables']['daily_state']['Row']

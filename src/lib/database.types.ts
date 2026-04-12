// Database types for Supabase
// Run `npx supabase gen types typescript --project-id your-project-id > lib/database.types.ts` to generate

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          telegram_id: string | null;
          telegram_username: string | null;
          telegram_first_name: string | null;
          telegram_last_name: string | null;
          telegram_language_code: string | null;
          telegram_photo_url: string | null;
          username: string | null;
          first_name: string | null;
          last_name: string | null;
          photo_url: string | null;
          language: string;
          email: string | null;
          phone: string | null;
          email_verified: string | null;
          phone_verified: string | null;
          day: number;
          streak: number;
          points: number;
          auth_provider: string | null;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          telegram_id?: string | null;
          telegram_username?: string | null;
          telegram_first_name?: string | null;
          telegram_last_name?: string | null;
          telegram_language_code?: string | null;
          telegram_photo_url?: string | null;
          username?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          photo_url?: string | null;
          language?: string;
          email?: string | null;
          phone?: string | null;
          email_verified?: string | null;
          phone_verified?: string | null;
          day?: number;
          streak?: number;
          points?: number;
          auth_provider?: string | null;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          telegram_id?: string | null;
          telegram_username?: string | null;
          telegram_first_name?: string | null;
          telegram_last_name?: string | null;
          telegram_language_code?: string | null;
          telegram_photo_url?: string | null;
          username?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          photo_url?: string | null;
          language?: string;
          email?: string | null;
          phone?: string | null;
          email_verified?: string | null;
          phone_verified?: string | null;
          day?: number;
          streak?: number;
          points?: number;
          auth_provider?: string | null;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          weight: number | null;
          height: number | null;
          age: number | null;
          sex: string | null;
          target_weight: number | null;
          target_calories: number | null;
          work_profile: string | null;
          water_baseline: number;
          waist: number | null;
          hips: number | null;
          chest: number | null;
          bicep: number | null;
          thigh: number | null;
          bio: string | null;
          weight_start: number | null;
          weight_start_at: string | null;
          weight_deadline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          weight?: number | null;
          height?: number | null;
          age?: number | null;
          sex?: string | null;
          target_weight?: number | null;
          target_calories?: number | null;
          work_profile?: string | null;
          water_baseline?: number;
          waist?: number | null;
          hips?: number | null;
          chest?: number | null;
          bicep?: number | null;
          thigh?: number | null;
          bio?: string | null;
          weight_start?: number | null;
          weight_start_at?: string | null;
          weight_deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          weight?: number | null;
          height?: number | null;
          age?: number | null;
          sex?: string | null;
          target_weight?: number | null;
          target_calories?: number | null;
          work_profile?: string | null;
          water_baseline?: number;
          waist?: number | null;
          hips?: number | null;
          chest?: number | null;
          bicep?: number | null;
          thigh?: number | null;
          bio?: string | null;
          weight_start?: number | null;
          weight_start_at?: string | null;
          weight_deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_wellbeing: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          preset: string;
          answers: string;
          scores: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          preset: string;
          answers: string;
          scores?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          preset?: string;
          answers?: string;
          scores?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      weekly_wellbeing: {
        Row: {
          id: string;
          user_id: string;
          year: number;
          week: number;
          preset: string;
          answers: string;
          scores: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year: number;
          week: number;
          preset: string;
          answers: string;
          scores?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          year?: number;
          week?: number;
          preset?: string;
          answers?: string;
          scores?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_state: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          mood: number | null;
          energy: number | null;
          notes: string | null;
          stress: number | null;
          sleep_hours: number | null;
          sleep_quality: number | null;
          is_failure_day: boolean;
          failure_reasons: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          mood?: number | null;
          energy?: number | null;
          notes?: string | null;
          stress?: number | null;
          sleep_hours?: number | null;
          sleep_quality?: number | null;
          is_failure_day?: boolean;
          failure_reasons?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          mood?: number | null;
          energy?: number | null;
          notes?: string | null;
          stress?: number | null;
          sleep_hours?: number | null;
          sleep_quality?: number | null;
          is_failure_day?: boolean;
          failure_reasons?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Journey Tables
      journey_lessons: {
        Row: {
          id: string;
          day: number;
          week: number;
          week_name: string | null;
          title: string;
          story: string | null;
          description: string | null;
          tasks: string;
          quote: string | null;
          tip: string | null;
          reward_xp: number;
          unlocks: string | null;
          achievement: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          day: number;
          week?: number;
          week_name?: string | null;
          title: string;
          story?: string | null;
          description?: string | null;
          tasks?: string;
          quote?: string | null;
          tip?: string | null;
          reward_xp?: number;
          unlocks?: string | null;
          achievement?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          day?: number;
          week?: number;
          week_name?: string | null;
          title?: string;
          story?: string | null;
          description?: string | null;
          tasks?: string;
          quote?: string | null;
          tip?: string | null;
          reward_xp?: number;
          unlocks?: string | null;
          achievement?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      journey_progress: {
        Row: {
          id: string;
          user_id: string;
          goal: string | null;
          current_day: number;
          total_xp: number;
          streak: number;
          started_at: string;
          last_active_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal?: string | null;
          current_day?: number;
          total_xp?: number;
          streak?: number;
          started_at?: string;
          last_active_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal?: string | null;
          current_day?: number;
          total_xp?: number;
          streak?: number;
          started_at?: string;
          last_active_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      journey_tasks: {
        Row: {
          id: string;
          progress_id: string;
          day: number;
          task_id: string;
          completed: boolean;
          completed_at: string | null;
          xp_earned: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          progress_id: string;
          day: number;
          task_id: string;
          completed?: boolean;
          completed_at?: string | null;
          xp_earned?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          progress_id?: string;
          day?: number;
          task_id?: string;
          completed?: boolean;
          completed_at?: string | null;
          xp_earned?: number;
          created_at?: string;
        };
      };
      journey_unlocks: {
        Row: {
          id: string;
          progress_id: string;
          feature: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          progress_id: string;
          feature: string;
          unlocked_at?: string;
        };
        Update: {
          id?: string;
          progress_id?: string;
          feature?: string;
          unlocked_at?: string;
        };
      };
      journey_achievements: {
        Row: {
          id: string;
          progress_id: string;
          code: string;
          obtained_at: string;
        };
        Insert: {
          id?: string;
          progress_id: string;
          code: string;
          obtained_at?: string;
        };
        Update: {
          id?: string;
          progress_id?: string;
          code?: string;
          obtained_at?: string;
        };
      };
      journey_reflections: {
        Row: {
          id: string;
          progress_id: string;
          day: number;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          progress_id: string;
          day: number;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          progress_id?: string;
          day?: number;
          text?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience type aliases
export type AppUser = Database["public"]["Tables"]["app_users"]["Row"];
export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type DailyWellbeing = Database["public"]["Tables"]["daily_wellbeing"]["Row"];
export type WeeklyWellbeing = Database["public"]["Tables"]["weekly_wellbeing"]["Row"];
export type DailyState = Database["public"]["Tables"]["daily_state"]["Row"];

// Journey type aliases
export type JourneyLesson = Database["public"]["Tables"]["journey_lessons"]["Row"];
export type JourneyProgress = Database["public"]["Tables"]["journey_progress"]["Row"];
export type JourneyTask = Database["public"]["Tables"]["journey_tasks"]["Row"];
export type JourneyUnlock = Database["public"]["Tables"]["journey_unlocks"]["Row"];
export type JourneyAchievement = Database["public"]["Tables"]["journey_achievements"]["Row"];
export type JourneyReflection = Database["public"]["Tables"]["journey_reflections"]["Row"];

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
      parshiyot: {
        Row: {
          id: number
          name_hebrew: string
          name_english: string
          book_hebrew: string
          book_english: string
          week_number: number
          start_reference: string | null
          end_reference: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name_hebrew: string
          name_english: string
          book_hebrew: string
          book_english: string
          week_number: number
          start_reference?: string | null
          end_reference?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name_hebrew?: string
          name_english?: string
          book_hebrew?: string
          book_english?: string
          week_number?: number
          start_reference?: string | null
          end_reference?: string | null
          created_at?: string
        }
      }
      aliyot: {
        Row: {
          id: number
          parasha_id: number
          aliyah_number: number
          name_hebrew: string
          name_english: string
          start_reference: string | null
          end_reference: string | null
          summary_hebrew: string | null
        }
        Insert: {
          id?: number
          parasha_id: number
          aliyah_number: number
          name_hebrew: string
          name_english: string
          start_reference?: string | null
          end_reference?: string | null
          summary_hebrew?: string | null
        }
        Update: {
          id?: number
          parasha_id?: number
          aliyah_number?: number
          name_hebrew?: string
          name_english?: string
          start_reference?: string | null
          end_reference?: string | null
          summary_hebrew?: string | null
        }
      }
      groups: {
        Row: {
          id: number
          name: string
          group_type: 'synagogue' | 'school' | 'class' | 'minyan' | 'custom'
          institution: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          group_type: 'synagogue' | 'school' | 'class' | 'minyan' | 'custom'
          institution?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          group_type?: 'synagogue' | 'school' | 'class' | 'minyan' | 'custom'
          institution?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          display_name: string
          hebrew_name: string | null
          email: string | null
          grade: number | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          hebrew_name?: string | null
          email?: string | null
          grade?: number | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          hebrew_name?: string | null
          email?: string | null
          grade?: number | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      group_memberships: {
        Row: {
          id: number
          user_id: string
          group_id: number
          role: 'member' | 'admin' | 'teacher'
          joined_at: string
          is_active: boolean
        }
        Insert: {
          id?: number
          user_id: string
          group_id: number
          role?: 'member' | 'admin' | 'teacher'
          joined_at?: string
          is_active?: boolean
        }
        Update: {
          id?: number
          user_id?: string
          group_id?: number
          role?: 'member' | 'admin' | 'teacher'
          joined_at?: string
          is_active?: boolean
        }
      }
      group_invitations: {
        Row: {
          id: number
          group_id: number
          invite_code: string
          created_by: string
          max_uses: number | null
          times_used: number
          expires_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          group_id: number
          invite_code: string
          created_by: string
          max_uses?: number | null
          times_used?: number
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          group_id?: number
          invite_code?: string
          created_by?: string
          max_uses?: number | null
          times_used?: number
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      invitation_uses: {
        Row: {
          id: number
          invitation_id: number
          user_id: string
          used_at: string
        }
        Insert: {
          id?: number
          invitation_id: number
          user_id: string
          used_at?: string
        }
        Update: {
          id?: number
          invitation_id?: number
          user_id?: string
          used_at?: string
        }
      }
      quizzes: {
        Row: {
          id: number
          parasha_id: number
          title_hebrew: string
          title_english: string | null
          description_hebrew: string | null
          max_attempts: number
          time_limit_seconds: number | null
          points_per_question: number
          passing_score_percent: number | null
          is_published: boolean
          available_from: string | null
          available_until: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          parasha_id: number
          title_hebrew: string
          title_english?: string | null
          description_hebrew?: string | null
          max_attempts?: number
          time_limit_seconds?: number | null
          points_per_question?: number
          passing_score_percent?: number | null
          is_published?: boolean
          available_from?: string | null
          available_until?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          parasha_id?: number
          title_hebrew?: string
          title_english?: string | null
          description_hebrew?: string | null
          max_attempts?: number
          time_limit_seconds?: number | null
          points_per_question?: number
          passing_score_percent?: number | null
          is_published?: boolean
          available_from?: string | null
          available_until?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: number
          quiz_id: number
          aliyah_id: number
          question_text_hebrew: string
          question_text_english: string | null
          question_type: 'multiple_choice' | 'true_false'
          difficulty: number
          points: number
          explanation_hebrew: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: number
          quiz_id: number
          aliyah_id: number
          question_text_hebrew: string
          question_text_english?: string | null
          question_type?: 'multiple_choice' | 'true_false'
          difficulty?: number
          points?: number
          explanation_hebrew?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: number
          quiz_id?: number
          aliyah_id?: number
          question_text_hebrew?: string
          question_text_english?: string | null
          question_type?: 'multiple_choice' | 'true_false'
          difficulty?: number
          points?: number
          explanation_hebrew?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      answer_choices: {
        Row: {
          id: number
          question_id: number
          choice_text_hebrew: string
          choice_text_english: string | null
          is_correct: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: number
          question_id: number
          choice_text_hebrew: string
          choice_text_english?: string | null
          is_correct?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: number
          question_id?: number
          choice_text_hebrew?: string
          choice_text_english?: string | null
          is_correct?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      quiz_attempts: {
        Row: {
          id: number
          quiz_id: number
          user_id: string
          attempt_number: number
          started_at: string
          completed_at: string | null
          time_spent_seconds: number | null
          total_score: number
          max_possible_score: number | null
          score_percent: number | null
          is_best_attempt: boolean
          created_at: string
        }
        Insert: {
          id?: number
          quiz_id: number
          user_id: string
          attempt_number: number
          started_at?: string
          completed_at?: string | null
          time_spent_seconds?: number | null
          total_score?: number
          max_possible_score?: number | null
          score_percent?: number | null
          is_best_attempt?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          quiz_id?: number
          user_id?: string
          attempt_number?: number
          started_at?: string
          completed_at?: string | null
          time_spent_seconds?: number | null
          total_score?: number
          max_possible_score?: number | null
          score_percent?: number | null
          is_best_attempt?: boolean
          created_at?: string
        }
      }
      question_responses: {
        Row: {
          id: number
          attempt_id: number
          question_id: number
          selected_choice_id: number | null
          is_correct: boolean | null
          points_earned: number
          time_spent_seconds: number | null
          answered_at: string
        }
        Insert: {
          id?: number
          attempt_id: number
          question_id: number
          selected_choice_id?: number | null
          is_correct?: boolean | null
          points_earned?: number
          time_spent_seconds?: number | null
          answered_at?: string
        }
        Update: {
          id?: number
          attempt_id?: number
          question_id?: number
          selected_choice_id?: number | null
          is_correct?: boolean | null
          points_earned?: number
          time_spent_seconds?: number | null
          answered_at?: string
        }
      }
      user_stats: {
        Row: {
          id: number
          user_id: string
          total_quizzes_completed: number
          total_questions_answered: number
          total_correct_answers: number
          total_points: number
          average_score_percent: number
          current_streak_weeks: number
          best_streak_weeks: number
          last_quiz_at: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          total_quizzes_completed?: number
          total_questions_answered?: number
          total_correct_answers?: number
          total_points?: number
          average_score_percent?: number
          current_streak_weeks?: number
          best_streak_weeks?: number
          last_quiz_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          total_quizzes_completed?: number
          total_questions_answered?: number
          total_correct_answers?: number
          total_points?: number
          average_score_percent?: number
          current_streak_weeks?: number
          best_streak_weeks?: number
          last_quiz_at?: string | null
          updated_at?: string
        }
      }
      group_stats: {
        Row: {
          id: number
          group_id: number
          total_members: number
          active_members: number
          total_quizzes_taken: number
          average_score_percent: number
          updated_at: string
        }
        Insert: {
          id?: number
          group_id: number
          total_members?: number
          active_members?: number
          total_quizzes_taken?: number
          average_score_percent?: number
          updated_at?: string
        }
        Update: {
          id?: number
          group_id?: number
          total_members?: number
          active_members?: number
          total_quizzes_taken?: number
          average_score_percent?: number
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

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Common entity types
export type Parasha = Tables<'parshiyot'>
export type Aliyah = Tables<'aliyot'>
export type Group = Tables<'groups'>
export type Profile = Tables<'profiles'>
export type GroupMembership = Tables<'group_memberships'>
export type GroupInvitation = Tables<'group_invitations'>
export type Quiz = Tables<'quizzes'>
export type Question = Tables<'questions'>
export type AnswerChoice = Tables<'answer_choices'>
export type QuizAttempt = Tables<'quiz_attempts'>
export type QuestionResponse = Tables<'question_responses'>
export type UserStats = Tables<'user_stats'>
export type GroupStats = Tables<'group_stats'>

// Extended types with relations
export type QuestionWithChoices = Question & {
  answer_choices: AnswerChoice[]
  aliyot: Aliyah
}

export type QuizWithQuestions = Quiz & {
  questions: QuestionWithChoices[]
  parshiyot: Parasha
}

export type QuizAttemptWithDetails = QuizAttempt & {
  quizzes: Quiz & { parshiyot: Parasha }
  question_responses: (QuestionResponse & {
    questions: Question
    answer_choices: AnswerChoice | null
  })[]
}

export type GroupWithStats = Group & {
  group_stats: GroupStats | null
  member_count?: number
}

export type ProfileWithStats = Profile & {
  user_stats: UserStats | null
}

export type HabitType = 'daily' | 'weekly'

export interface Habit {
  id: string
  user_id: string
  name: string
  type: HabitType
  goal: number
  month: number
  year: number
  sort_order: number
  created_at: string
}

export interface Completion {
  id: string
  habit_id: string
  user_id: string
  date: string        // ISO date string e.g. "2026-05-20"
  created_at: string
}

export interface HabitWithCompletions extends Habit {
  completions: Completion[]
  completed_count: number
  completion_rate: number
}

export interface DayStatus {
  date: string
  completed: boolean
}

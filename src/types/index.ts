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

// ── Calorie tracking ───────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface CalorieEntry {
  id: string
  user_id: string
  date: string
  meal_type: MealType
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  created_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  daily_calorie_goal: number
  protein_goal: number
  created_at: string
  updated_at: string
}

// ── Gym tracking ───────────────────────────────────────────────────────

export interface WorkoutSession {
  id: string
  user_id: string
  date: string
  name: string
  notes: string
  created_at: string
}

export interface WorkoutExercise {
  id: string
  session_id: string
  user_id: string
  name: string
  sets: number
  reps: number
  weight_kg: number
  created_at: string
}

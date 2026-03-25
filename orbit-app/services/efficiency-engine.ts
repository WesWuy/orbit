/**
 * Efficiency Engine — Merope as Life Architect.
 *
 * Sub-arm of Guide mode. Instead of navigating physical space,
 * Merope helps you navigate your day — scheduling, habits,
 * routines, and life-improving systems.
 *
 * "I guide your steps outside. Let me guide your hours too."
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

// ── Types ──

export interface TimeBlock {
  id: string
  title: string
  startHour: number    // 0-23
  startMin: number     // 0-59
  durationMin: number  // in minutes
  category: BlockCategory
  completed: boolean
  notes?: string
}

export type BlockCategory =
  | 'deep-work'     // 🧠 Focus work, coding, writing
  | 'meeting'       // 🤝 Calls, meetings
  | 'health'        // 💪 Exercise, meals, meditation
  | 'errand'        // 🏃 Tasks, errands
  | 'learning'      // 📚 Study, reading
  | 'creative'      // 🎨 Art, music, hobby
  | 'rest'          // 😌 Break, nap, downtime
  | 'social'        // 🫂 Friends, family
  | 'routine'       // ⚙️ Morning/evening routines

export interface Habit {
  id: string
  name: string
  icon: string
  frequency: 'daily' | 'weekday' | 'weekly'
  streak: number
  bestStreak: number
  completedToday: boolean
  lastCompleted: string | null  // ISO date string
  createdAt: string
}

export interface DailyPlan {
  date: string  // YYYY-MM-DD
  blocks: TimeBlock[]
  habits: Habit[]
  reflection?: string
  score?: number  // 0-100 completion score
}

export interface EfficiencyState {
  todayPlan: DailyPlan
  habits: Habit[]
  weeklyScore: number[]  // last 7 days
}

// ── Category config ──

export const CATEGORY_CONFIG: Record<BlockCategory, { icon: string; label: string; color: string }> = {
  'deep-work':  { icon: '🧠', label: 'Deep Work',  color: '#8b5cf6' },
  'meeting':    { icon: '🤝', label: 'Meeting',     color: '#3b82f6' },
  'health':     { icon: '💪', label: 'Health',      color: '#10b981' },
  'errand':     { icon: '🏃', label: 'Errand',      color: '#f59e0b' },
  'learning':   { icon: '📚', label: 'Learning',    color: '#6366f1' },
  'creative':   { icon: '🎨', label: 'Creative',    color: '#ec4899' },
  'rest':       { icon: '😌', label: 'Rest',        color: '#6b7280' },
  'social':     { icon: '🫂', label: 'Social',      color: '#f97316' },
  'routine':    { icon: '⚙️', label: 'Routine',     color: '#14b8a6' },
}

// ── Storage keys ──

const STORAGE_KEYS = {
  habits: 'orbit_efficiency_habits',
  todayBlocks: 'orbit_efficiency_blocks',
  weeklyScores: 'orbit_efficiency_weekly',
}

// ── Default habits (starter set) ──

const DEFAULT_HABITS: Habit[] = [
  {
    id: 'h1', name: 'Morning Walk', icon: '🌅', frequency: 'daily',
    streak: 0, bestStreak: 0, completedToday: false, lastCompleted: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h2', name: 'Read 20 min', icon: '📖', frequency: 'daily',
    streak: 0, bestStreak: 0, completedToday: false, lastCompleted: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h3', name: 'Hydrate', icon: '💧', frequency: 'daily',
    streak: 0, bestStreak: 0, completedToday: false, lastCompleted: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h4', name: 'No phone after 10pm', icon: '📵', frequency: 'daily',
    streak: 0, bestStreak: 0, completedToday: false, lastCompleted: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'h5', name: 'Workout', icon: '🏋️', frequency: 'weekday',
    streak: 0, bestStreak: 0, completedToday: false, lastCompleted: null,
    createdAt: new Date().toISOString(),
  },
]

// ── Template routines ──

export interface RoutineTemplate {
  name: string
  description: string
  icon: string
  blocks: Omit<TimeBlock, 'id' | 'completed'>[]
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    name: 'Morning Power',
    description: 'Start strong: meditate, move, plan',
    icon: '🌅',
    blocks: [
      { title: 'Wake + Meditate', startHour: 6, startMin: 0, durationMin: 20, category: 'health' },
      { title: 'Exercise', startHour: 6, startMin: 20, durationMin: 40, category: 'health' },
      { title: 'Shower + Prep', startHour: 7, startMin: 0, durationMin: 30, category: 'routine' },
      { title: 'Plan Today', startHour: 7, startMin: 30, durationMin: 15, category: 'deep-work' },
    ],
  },
  {
    name: 'Deep Focus Block',
    description: '2-hour deep work with break',
    icon: '🧠',
    blocks: [
      { title: 'Deep Work Sprint 1', startHour: 9, startMin: 0, durationMin: 50, category: 'deep-work' },
      { title: 'Break', startHour: 9, startMin: 50, durationMin: 10, category: 'rest' },
      { title: 'Deep Work Sprint 2', startHour: 10, startMin: 0, durationMin: 50, category: 'deep-work' },
      { title: 'Review + Stretch', startHour: 10, startMin: 50, durationMin: 10, category: 'rest' },
    ],
  },
  {
    name: 'Evening Wind-Down',
    description: 'Decompress, reflect, rest well',
    icon: '🌙',
    blocks: [
      { title: 'Light Walk / Stretch', startHour: 19, startMin: 0, durationMin: 30, category: 'health' },
      { title: 'Dinner', startHour: 19, startMin: 30, durationMin: 45, category: 'rest' },
      { title: 'Reading / Learning', startHour: 20, startMin: 15, durationMin: 45, category: 'learning' },
      { title: 'Journal + Reflect', startHour: 21, startMin: 0, durationMin: 20, category: 'routine' },
      { title: 'Wind Down (no screens)', startHour: 21, startMin: 20, durationMin: 40, category: 'rest' },
    ],
  },
  {
    name: 'Creative Session',
    description: 'Warm up, create, review',
    icon: '🎨',
    blocks: [
      { title: 'Inspiration Gather', startHour: 14, startMin: 0, durationMin: 15, category: 'creative' },
      { title: 'Create', startHour: 14, startMin: 15, durationMin: 75, category: 'creative' },
      { title: 'Review + Iterate', startHour: 15, startMin: 30, durationMin: 30, category: 'creative' },
    ],
  },
  {
    name: 'Learning Block',
    description: 'Study, practice, review',
    icon: '📚',
    blocks: [
      { title: 'Study / Course', startHour: 10, startMin: 0, durationMin: 45, category: 'learning' },
      { title: 'Practice / Apply', startHour: 10, startMin: 45, durationMin: 30, category: 'learning' },
      { title: 'Break + Notes', startHour: 11, startMin: 15, durationMin: 15, category: 'rest' },
    ],
  },
]

// ── Helpers ──

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function getHour(): number {
  return new Date().getHours()
}

function getMinute(): number {
  return new Date().getMinutes()
}

// ── Persistence ──

export async function loadHabits(): Promise<Habit[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.habits)
    if (raw) {
      const habits: Habit[] = JSON.parse(raw)
      // Reset completedToday if it's a new day
      const today = todayStr()
      return habits.map((h) => ({
        ...h,
        completedToday: h.lastCompleted === today,
      }))
    }
  } catch {}
  return [...DEFAULT_HABITS]
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.habits, JSON.stringify(habits))
  } catch {}
}

export async function loadTodayBlocks(): Promise<TimeBlock[]> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEYS.todayBlocks}_${todayStr()}`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export async function saveTodayBlocks(blocks: TimeBlock[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${STORAGE_KEYS.todayBlocks}_${todayStr()}`, JSON.stringify(blocks))
  } catch {}
}

export async function loadWeeklyScores(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.weeklyScores)
    if (raw) return JSON.parse(raw)
  } catch {}
  return [0, 0, 0, 0, 0, 0, 0]
}

export async function saveWeeklyScores(scores: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.weeklyScores, JSON.stringify(scores.slice(-7)))
  } catch {}
}

// ── Core Operations ──

export function toggleHabit(habits: Habit[], habitId: string): Habit[] {
  const today = todayStr()
  return habits.map((h) => {
    if (h.id !== habitId) return h
    const completing = !h.completedToday
    const newStreak = completing
      ? h.streak + 1
      : Math.max(0, h.streak - 1)
    return {
      ...h,
      completedToday: completing,
      lastCompleted: completing ? today : h.lastCompleted,
      streak: newStreak,
      bestStreak: Math.max(h.bestStreak, newStreak),
    }
  })
}

export function addHabit(habits: Habit[], name: string, icon: string, frequency: Habit['frequency'] = 'daily'): Habit[] {
  return [
    ...habits,
    {
      id: generateId(),
      name,
      icon,
      frequency,
      streak: 0,
      bestStreak: 0,
      completedToday: false,
      lastCompleted: null,
      createdAt: new Date().toISOString(),
    },
  ]
}

export function removeHabit(habits: Habit[], habitId: string): Habit[] {
  return habits.filter((h) => h.id !== habitId)
}

export function addTimeBlock(
  blocks: TimeBlock[],
  title: string,
  startHour: number,
  startMin: number,
  durationMin: number,
  category: BlockCategory,
): TimeBlock[] {
  const block: TimeBlock = {
    id: generateId(),
    title,
    startHour,
    startMin,
    durationMin,
    category,
    completed: false,
  }
  return [...blocks, block].sort((a, b) => {
    const aMin = a.startHour * 60 + a.startMin
    const bMin = b.startHour * 60 + b.startMin
    return aMin - bMin
  })
}

export function toggleBlock(blocks: TimeBlock[], blockId: string): TimeBlock[] {
  return blocks.map((b) =>
    b.id === blockId ? { ...b, completed: !b.completed } : b
  )
}

export function removeBlock(blocks: TimeBlock[], blockId: string): TimeBlock[] {
  return blocks.filter((b) => b.id !== blockId)
}

export function applyTemplate(existing: TimeBlock[], template: RoutineTemplate): TimeBlock[] {
  const newBlocks = template.blocks.map((b) => ({
    ...b,
    id: generateId(),
    completed: false,
  }))
  return [...existing, ...newBlocks].sort((a, b) => {
    const aMin = a.startHour * 60 + a.startMin
    const bMin = b.startHour * 60 + b.startMin
    return aMin - bMin
  })
}

// ── Score calculation ──

export function calculateDayScore(blocks: TimeBlock[], habits: Habit[]): number {
  const totalItems = blocks.length + habits.length
  if (totalItems === 0) return 0
  const completedItems = blocks.filter((b) => b.completed).length + habits.filter((h) => h.completedToday).length
  return Math.round((completedItems / totalItems) * 100)
}

// ── Context-aware suggestions (Merope's coaching) ──

export interface EfficiencySuggestion {
  icon: string
  text: string
  action?: 'add-block' | 'template' | 'habit'
  payload?: any
}

export function getEfficiencySuggestion(
  blocks: TimeBlock[],
  habits: Habit[],
  timeOfDay: string,
): EfficiencySuggestion | null {
  const hour = getHour()
  const completedHabits = habits.filter((h) => h.completedToday).length
  const totalHabits = habits.length
  const completedBlocks = blocks.filter((b) => b.completed).length
  const currentBlock = getCurrentBlock(blocks)

  // Morning — no blocks yet
  if (hour >= 6 && hour < 10 && blocks.length === 0) {
    return {
      icon: '🌅',
      text: "Morning! Let's build your day. Want me to set up a morning routine?",
      action: 'template',
      payload: ROUTINE_TEMPLATES[0],
    }
  }

  // Mid-morning — no deep work scheduled
  if (hour >= 9 && hour < 12 && !blocks.some((b) => b.category === 'deep-work')) {
    return {
      icon: '🧠',
      text: 'Peak focus hours! Want to add a deep work block?',
      action: 'template',
      payload: ROUTINE_TEMPLATES[1],
    }
  }

  // Afternoon slump
  if (hour >= 13 && hour < 15 && !blocks.some((b) => b.category === 'rest' && b.startHour >= 12 && b.startHour < 15)) {
    return {
      icon: '😌',
      text: "Post-lunch energy dip — a 10-min walk or stretch does wonders.",
      action: 'add-block',
      payload: { title: 'Energy Walk', category: 'health', durationMin: 15 },
    }
  }

  // Evening — habits not done
  if (hour >= 18 && completedHabits < totalHabits && totalHabits > 0) {
    const remaining = habits.filter((h) => !h.completedToday)
    return {
      icon: '✅',
      text: `${remaining.length} habit${remaining.length > 1 ? 's' : ''} left today: ${remaining.map((h) => h.icon).join(' ')}`,
      action: 'habit',
    }
  }

  // Night — wind down
  if (hour >= 20 && !blocks.some((b) => b.category === 'routine' && b.startHour >= 20)) {
    return {
      icon: '🌙',
      text: "Winding down? A short reflection helps tomorrow start stronger.",
      action: 'template',
      payload: ROUTINE_TEMPLATES[2],
    }
  }

  // Current block reminder
  if (currentBlock && !currentBlock.completed) {
    const endMin = currentBlock.startHour * 60 + currentBlock.startMin + currentBlock.durationMin
    const nowMin = hour * 60 + getMinute()
    const remaining = endMin - nowMin
    if (remaining > 0 && remaining <= 10) {
      return {
        icon: '⏰',
        text: `${remaining} min left on "${currentBlock.title}" — finish strong!`,
      }
    }
  }

  // Good progress
  if (blocks.length > 0 && completedBlocks / blocks.length > 0.7) {
    return {
      icon: '🔥',
      text: `${Math.round((completedBlocks / blocks.length) * 100)}% of today's blocks done. You're on fire!`,
    }
  }

  return null
}

export function getCurrentBlock(blocks: TimeBlock[]): TimeBlock | null {
  const hour = getHour()
  const min = getMinute()
  const nowMin = hour * 60 + min
  return blocks.find((b) => {
    const start = b.startHour * 60 + b.startMin
    const end = start + b.durationMin
    return nowMin >= start && nowMin < end
  }) ?? null
}

export function getNextBlock(blocks: TimeBlock[]): TimeBlock | null {
  const hour = getHour()
  const min = getMinute()
  const nowMin = hour * 60 + min
  return blocks.find((b) => {
    const start = b.startHour * 60 + b.startMin
    return start > nowMin && !b.completed
  }) ?? null
}

// ── Format helpers ──

export function formatTime(hour: number, min: number): string {
  return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

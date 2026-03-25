/**
 * Efficiency Mode — Merope as Life Architect.
 *
 * Sub-arm of Guide. Navigate your day instead of physical space.
 * Time blocks, habit tracking, routine templates, and Merope coaching.
 *
 * "I guide your steps outside. Let me guide your hours too."
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput, Animated, Easing } from 'react-native'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'expo-router'
import { OrbitStatusBar } from '../components/StatusBar'
import { Starfield } from '../components/Starfield'
import { GlassCard } from '../components/GlassCard'
import { FloatingMerope } from '../components/FloatingMerope'
import { useOrbitEngine } from '../hooks/useOrbitEngine'
import { Mode } from '../engine/mode-manager'
import { MODE_EXPERTISE } from '../engine/merope'
import { playTone } from '../services/sound-engine'
import { tapLight, tapMedium, notifySuccess, selectionTick } from '../services/haptics'
import {
  type TimeBlock, type Habit, type BlockCategory, type EfficiencySuggestion,
  CATEGORY_CONFIG, ROUTINE_TEMPLATES, type RoutineTemplate,
  loadHabits, saveHabits, loadTodayBlocks, saveTodayBlocks,
  toggleHabit, addTimeBlock, toggleBlock, removeBlock, applyTemplate,
  calculateDayScore, getEfficiencySuggestion, getCurrentBlock, getNextBlock,
  formatTime, formatDuration,
} from '../services/efficiency-engine'

// Efficiency uses Guide's green but slightly shifted — a teal-green for "Life Architect"
const EFFICIENCY_COLOR = '#0ea5e9' // Sky blue — clarity, planning, flow
const GUIDE_COLOR = MODE_EXPERTISE[Mode.GUIDE].color

type Tab = 'timeline' | 'habits' | 'routines'

export default function EfficiencyScreen() {
  const router = useRouter()
  const { state } = useOrbitEngine()
  const [tab, setTab] = useState<Tab>('timeline')
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [suggestion, setSuggestion] = useState<EfficiencySuggestion | null>(null)
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [newBlockTitle, setNewBlockTitle] = useState('')
  const [newBlockCategory, setNewBlockCategory] = useState<BlockCategory>('deep-work')
  const [newBlockHour, setNewBlockHour] = useState('')
  const [newBlockDuration, setNewBlockDuration] = useState('30')
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitIcon, setNewHabitIcon] = useState('✨')
  const scoreAnim = useRef(new Animated.Value(0)).current

  const dayScore = calculateDayScore(blocks, habits)
  const currentBlock = getCurrentBlock(blocks)
  const nextBlock = getNextBlock(blocks)

  // Load data on mount
  useEffect(() => {
    (async () => {
      const [h, b] = await Promise.all([loadHabits(), loadTodayBlocks()])
      setHabits(h)
      setBlocks(b)
    })()
  }, [])

  // Animate score
  useEffect(() => {
    Animated.timing(scoreAnim, {
      toValue: dayScore,
      duration: 800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start()
  }, [dayScore, scoreAnim])

  // Check for suggestions periodically
  useEffect(() => {
    const check = () => setSuggestion(getEfficiencySuggestion(blocks, habits, state.context.time_of_day))
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [blocks, habits, state.context.time_of_day])

  // ── Handlers ──

  const handleToggleBlock = useCallback((blockId: string) => {
    selectionTick()
    setBlocks((prev) => {
      const updated = toggleBlock(prev, blockId)
      saveTodayBlocks(updated)
      return updated
    })
  }, [])

  const handleRemoveBlock = useCallback((blockId: string) => {
    tapLight()
    setBlocks((prev) => {
      const updated = removeBlock(prev, blockId)
      saveTodayBlocks(updated)
      return updated
    })
  }, [])

  const handleAddBlock = useCallback(() => {
    if (!newBlockTitle.trim()) return
    const hour = parseInt(newBlockHour) || new Date().getHours()
    const duration = parseInt(newBlockDuration) || 30
    playTone('navigate')
    tapMedium()
    setBlocks((prev) => {
      const updated = addTimeBlock(prev, newBlockTitle.trim(), hour, 0, duration, newBlockCategory)
      saveTodayBlocks(updated)
      return updated
    })
    setNewBlockTitle('')
    setNewBlockHour('')
    setNewBlockDuration('30')
    setShowAddBlock(false)
  }, [newBlockTitle, newBlockHour, newBlockDuration, newBlockCategory])

  const handleToggleHabit = useCallback((habitId: string) => {
    playTone('capture')
    notifySuccess()
    setHabits((prev) => {
      const updated = toggleHabit(prev, habitId)
      saveHabits(updated)
      return updated
    })
  }, [])

  const handleAddHabit = useCallback(() => {
    if (!newHabitName.trim()) return
    playTone('navigate')
    tapMedium()
    setHabits((prev) => {
      const updated = [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: newHabitName.trim(),
        icon: newHabitIcon,
        frequency: 'daily' as const,
        streak: 0,
        bestStreak: 0,
        completedToday: false,
        lastCompleted: null,
        createdAt: new Date().toISOString(),
      }]
      saveHabits(updated)
      return updated
    })
    setNewHabitName('')
    setNewHabitIcon('✨')
    setShowAddHabit(false)
  }, [newHabitName, newHabitIcon])

  const handleApplyTemplate = useCallback((template: RoutineTemplate) => {
    playTone('wake')
    notifySuccess()
    setBlocks((prev) => {
      const updated = applyTemplate(prev, template)
      saveTodayBlocks(updated)
      return updated
    })
    setTab('timeline')
  }, [])

  const handleSuggestionAction = useCallback(() => {
    if (!suggestion) return
    tapMedium()
    if (suggestion.action === 'template' && suggestion.payload) {
      handleApplyTemplate(suggestion.payload)
    } else if (suggestion.action === 'habit') {
      setTab('habits')
    } else if (suggestion.action === 'add-block' && suggestion.payload) {
      const { title, category, durationMin } = suggestion.payload
      setBlocks((prev) => {
        const updated = addTimeBlock(prev, title, new Date().getHours(), 0, durationMin, category)
        saveTodayBlocks(updated)
        return updated
      })
    }
    setSuggestion(null)
  }, [suggestion, handleApplyTemplate])

  // ── Render ──

  return (
    <Starfield modeColor={EFFICIENCY_COLOR} starCount={25}>
      <View style={styles.container}>
        <OrbitStatusBar
          mode="Efficiency"
          modeColor={EFFICIENCY_COLOR}
          statusLine={state.statusLine}
          onBack={() => router.back()}
        />

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>

          {/* Hero — Merope as Life Architect */}
          <View style={styles.heroSection}>
            <FloatingMerope modeColor={EFFICIENCY_COLOR} size="medium" emotion="guiding" />
            <Text style={[styles.heroTitle, { color: EFFICIENCY_COLOR }]}>Life Architect</Text>
            <Text style={styles.heroSub}>Navigate your day with intention</Text>
          </View>

          {/* Day Score */}
          <GlassCard glowColor={EFFICIENCY_COLOR} intensity="medium" style={styles.scoreCard}>
            <View style={styles.scoreRow}>
              <View style={styles.scoreLeft}>
                <Text style={styles.scoreLabel}>TODAY'S SCORE</Text>
                <Animated.Text style={[styles.scoreValue, { color: EFFICIENCY_COLOR }]}>
                  {dayScore}%
                </Animated.Text>
              </View>
              <View style={styles.scoreRight}>
                <View style={styles.scoreBarBg}>
                  <View style={[styles.scoreBarFill, { width: `${dayScore}%`, backgroundColor: EFFICIENCY_COLOR }]} />
                </View>
                <Text style={styles.scoreDetail}>
                  {blocks.filter((b) => b.completed).length}/{blocks.length} blocks · {habits.filter((h) => h.completedToday).length}/{habits.length} habits
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Current / Next Block */}
          {(currentBlock || nextBlock) && (
            <GlassCard glowColor={EFFICIENCY_COLOR} intensity="light" style={styles.nowCard}>
              {currentBlock ? (
                <View style={styles.nowRow}>
                  <Text style={styles.nowLabel}>NOW</Text>
                  <Text style={styles.nowIcon}>{CATEGORY_CONFIG[currentBlock.category].icon}</Text>
                  <Text style={styles.nowTitle}>{currentBlock.title}</Text>
                  <Text style={[styles.nowTime, { color: EFFICIENCY_COLOR }]}>
                    {formatTime(currentBlock.startHour, currentBlock.startMin)}
                  </Text>
                </View>
              ) : nextBlock ? (
                <View style={styles.nowRow}>
                  <Text style={[styles.nowLabel, { color: '#ffffff40' }]}>NEXT</Text>
                  <Text style={styles.nowIcon}>{CATEGORY_CONFIG[nextBlock.category].icon}</Text>
                  <Text style={styles.nowTitle}>{nextBlock.title}</Text>
                  <Text style={[styles.nowTime, { color: '#ffffff50' }]}>
                    {formatTime(nextBlock.startHour, nextBlock.startMin)}
                  </Text>
                </View>
              ) : null}
            </GlassCard>
          )}

          {/* Merope Suggestion */}
          {suggestion && (
            <TouchableOpacity onPress={handleSuggestionAction} activeOpacity={0.8}>
              <GlassCard glowColor={EFFICIENCY_COLOR} intensity="light" style={styles.suggestionCard}>
                <View style={styles.suggestionRow}>
                  <Text style={styles.suggestionIcon}>{suggestion.icon}</Text>
                  <Text style={styles.suggestionText}>{suggestion.text}</Text>
                </View>
                {suggestion.action && (
                  <Text style={[styles.suggestionAction, { color: EFFICIENCY_COLOR }]}>
                    Tap to apply →
                  </Text>
                )}
              </GlassCard>
            </TouchableOpacity>
          )}

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            {(['timeline', 'habits', 'routines'] as Tab[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && { borderBottomColor: EFFICIENCY_COLOR, borderBottomWidth: 2 }]}
                onPress={() => { setTab(t); selectionTick() }}
              >
                <Text style={[styles.tabText, tab === t && { color: EFFICIENCY_COLOR }]}>
                  {t === 'timeline' ? '📅 Timeline' : t === 'habits' ? '✅ Habits' : '📋 Routines'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {tab === 'timeline' && (
            <View style={styles.tabContent}>
              {blocks.length === 0 ? (
                <GlassCard intensity="light" style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>📅</Text>
                  <Text style={styles.emptyText}>No blocks yet today.</Text>
                  <Text style={styles.emptyHint}>Add a block or apply a routine template to get started.</Text>
                </GlassCard>
              ) : (
                blocks.map((block) => {
                  const catConfig = CATEGORY_CONFIG[block.category]
                  const isCurrent = currentBlock?.id === block.id
                  return (
                    <TouchableOpacity
                      key={block.id}
                      onPress={() => handleToggleBlock(block.id)}
                      onLongPress={() => handleRemoveBlock(block.id)}
                      activeOpacity={0.7}
                    >
                      <GlassCard
                        glowColor={isCurrent ? EFFICIENCY_COLOR : undefined}
                        intensity={isCurrent ? 'medium' : 'light'}
                        style={{...styles.blockCard, ...(block.completed ? styles.blockCompleted : {})}}
                      >
                        <View style={styles.blockRow}>
                          <View style={[styles.blockTime, { borderColor: catConfig.color + '40' }]}>
                            <Text style={[styles.blockTimeText, { color: catConfig.color }]}>
                              {formatTime(block.startHour, block.startMin)}
                            </Text>
                          </View>
                          <View style={styles.blockInfo}>
                            <View style={styles.blockTitleRow}>
                              <Text style={styles.blockIcon}>{catConfig.icon}</Text>
                              <Text style={[
                                styles.blockTitle,
                                block.completed && styles.blockTitleDone,
                              ]}>
                                {block.title}
                              </Text>
                            </View>
                            <Text style={styles.blockMeta}>
                              {catConfig.label} · {formatDuration(block.durationMin)}
                            </Text>
                          </View>
                          <View style={[
                            styles.blockCheck,
                            block.completed
                              ? { backgroundColor: EFFICIENCY_COLOR }
                              : { borderColor: '#ffffff20', borderWidth: 1 },
                          ]}>
                            {block.completed && <Text style={styles.blockCheckMark}>✓</Text>}
                          </View>
                        </View>
                        {isCurrent && !block.completed && (
                          <View style={[styles.currentIndicator, { backgroundColor: EFFICIENCY_COLOR }]} />
                        )}
                      </GlassCard>
                    </TouchableOpacity>
                  )
                })
              )}

              {/* Add Block */}
              {showAddBlock ? (
                <GlassCard glowColor={EFFICIENCY_COLOR} intensity="medium" style={styles.addForm}>
                  <Text style={[styles.addFormTitle, { color: EFFICIENCY_COLOR }]}>Add Time Block</Text>
                  <TextInput
                    style={styles.addInput}
                    value={newBlockTitle}
                    onChangeText={setNewBlockTitle}
                    placeholder="What are you working on?"
                    placeholderTextColor="#ffffff30"
                  />
                  <View style={styles.addFormRow}>
                    <View style={styles.addFieldSmall}>
                      <Text style={styles.addFieldLabel}>HOUR</Text>
                      <TextInput
                        style={styles.addInputSmall}
                        value={newBlockHour}
                        onChangeText={setNewBlockHour}
                        placeholder={`${new Date().getHours()}`}
                        placeholderTextColor="#ffffff20"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.addFieldSmall}>
                      <Text style={styles.addFieldLabel}>DURATION</Text>
                      <TextInput
                        style={styles.addInputSmall}
                        value={newBlockDuration}
                        onChangeText={setNewBlockDuration}
                        placeholder="30"
                        placeholderTextColor="#ffffff20"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={styles.categoryPicker}>
                    {(Object.entries(CATEGORY_CONFIG) as [BlockCategory, typeof CATEGORY_CONFIG[BlockCategory]][]).map(([key, cfg]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.categoryChip,
                          newBlockCategory === key && { backgroundColor: cfg.color + '30', borderColor: cfg.color + '60' },
                        ]}
                        onPress={() => { setNewBlockCategory(key); selectionTick() }}
                      >
                        <Text style={styles.categoryChipIcon}>{cfg.icon}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.addFormButtons}>
                    <TouchableOpacity onPress={() => setShowAddBlock(false)} style={styles.cancelFormBtn}>
                      <Text style={styles.cancelFormText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleAddBlock}
                      style={[styles.submitFormBtn, { backgroundColor: EFFICIENCY_COLOR }]}
                    >
                      <Text style={styles.submitFormText}>Add Block</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ) : (
                <TouchableOpacity
                  style={[styles.addBtn, { borderColor: EFFICIENCY_COLOR + '30' }]}
                  onPress={() => { setShowAddBlock(true); tapLight() }}
                >
                  <Text style={[styles.addBtnText, { color: EFFICIENCY_COLOR }]}>+ Add Time Block</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {tab === 'habits' && (
            <View style={styles.tabContent}>
              {habits.length === 0 ? (
                <GlassCard intensity="light" style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>✅</Text>
                  <Text style={styles.emptyText}>No habits tracked yet.</Text>
                  <Text style={styles.emptyHint}>Start with something small — consistency beats intensity.</Text>
                </GlassCard>
              ) : (
                habits.map((habit) => (
                  <TouchableOpacity
                    key={habit.id}
                    onPress={() => handleToggleHabit(habit.id)}
                    activeOpacity={0.7}
                  >
                    <GlassCard
                      intensity="light"
                      glowColor={habit.completedToday ? EFFICIENCY_COLOR : undefined}
                      style={{...styles.habitCard, ...(habit.completedToday ? styles.habitCompleted : {})}}
                    >
                      <View style={styles.habitRow}>
                        <Text style={styles.habitIcon}>{habit.icon}</Text>
                        <View style={styles.habitInfo}>
                          <Text style={[
                            styles.habitName,
                            habit.completedToday && styles.habitNameDone,
                          ]}>
                            {habit.name}
                          </Text>
                          <View style={styles.habitStreakRow}>
                            <Text style={styles.habitStreak}>
                              🔥 {habit.streak} day{habit.streak !== 1 ? 's' : ''}
                            </Text>
                            {habit.bestStreak > 0 && (
                              <Text style={styles.habitBest}>Best: {habit.bestStreak}</Text>
                            )}
                          </View>
                        </View>
                        <View style={[
                          styles.habitCheck,
                          habit.completedToday
                            ? { backgroundColor: EFFICIENCY_COLOR }
                            : { borderColor: '#ffffff20', borderWidth: 2 },
                        ]}>
                          {habit.completedToday && <Text style={styles.habitCheckMark}>✓</Text>}
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                ))
              )}

              {/* Add Habit */}
              {showAddHabit ? (
                <GlassCard glowColor={EFFICIENCY_COLOR} intensity="medium" style={styles.addForm}>
                  <Text style={[styles.addFormTitle, { color: EFFICIENCY_COLOR }]}>New Habit</Text>
                  <TextInput
                    style={styles.addInput}
                    value={newHabitName}
                    onChangeText={setNewHabitName}
                    placeholder="e.g. Meditate 10 min"
                    placeholderTextColor="#ffffff30"
                  />
                  <View style={styles.iconPicker}>
                    {['✨', '🌅', '📖', '💧', '🏋️', '🧘', '📵', '🎵', '🌿', '💤', '🍎', '✍️'].map((icon) => (
                      <TouchableOpacity
                        key={icon}
                        style={[
                          styles.iconChip,
                          newHabitIcon === icon && { backgroundColor: EFFICIENCY_COLOR + '30' },
                        ]}
                        onPress={() => { setNewHabitIcon(icon); selectionTick() }}
                      >
                        <Text style={styles.iconChipText}>{icon}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.addFormButtons}>
                    <TouchableOpacity onPress={() => setShowAddHabit(false)} style={styles.cancelFormBtn}>
                      <Text style={styles.cancelFormText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleAddHabit}
                      style={[styles.submitFormBtn, { backgroundColor: EFFICIENCY_COLOR }]}
                    >
                      <Text style={styles.submitFormText}>Add Habit</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ) : (
                <TouchableOpacity
                  style={[styles.addBtn, { borderColor: EFFICIENCY_COLOR + '30' }]}
                  onPress={() => { setShowAddHabit(true); tapLight() }}
                >
                  <Text style={[styles.addBtnText, { color: EFFICIENCY_COLOR }]}>+ Add Habit</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {tab === 'routines' && (
            <View style={styles.tabContent}>
              <Text style={styles.routinesIntro}>
                Pre-built routines from Merope. Tap to add blocks to today's timeline.
              </Text>
              {ROUTINE_TEMPLATES.map((template, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleApplyTemplate(template)}
                  activeOpacity={0.7}
                >
                  <GlassCard intensity="light" style={styles.templateCard}>
                    <View style={styles.templateHeader}>
                      <Text style={styles.templateIcon}>{template.icon}</Text>
                      <View style={styles.templateInfo}>
                        <Text style={[styles.templateName, { color: EFFICIENCY_COLOR }]}>{template.name}</Text>
                        <Text style={styles.templateDesc}>{template.description}</Text>
                      </View>
                    </View>
                    <View style={styles.templateBlocks}>
                      {template.blocks.map((b, j) => (
                        <View key={j} style={styles.templateBlockRow}>
                          <Text style={styles.templateBlockTime}>
                            {formatTime(b.startHour, b.startMin)}
                          </Text>
                          <Text style={styles.templateBlockIcon}>
                            {CATEGORY_CONFIG[b.category].icon}
                          </Text>
                          <Text style={styles.templateBlockTitle}>{b.title}</Text>
                          <Text style={styles.templateBlockDur}>{formatDuration(b.durationMin)}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.templateApply, { color: EFFICIENCY_COLOR }]}>
                      Tap to apply →
                    </Text>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.footer}>Merope · Life Architect · Guide Mode</Text>
        </ScrollView>
      </View>
    </Starfield>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 12, paddingBottom: 40 },

  // Hero
  heroSection: { alignItems: 'center', paddingVertical: 4, gap: 4 },
  heroTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 4 },
  heroSub: { fontSize: 12, color: '#ffffff50', letterSpacing: 1 },

  // Score
  scoreCard: { padding: 14 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreLeft: { alignItems: 'center', minWidth: 70 },
  scoreLabel: { fontSize: 8, color: '#ffffff40', letterSpacing: 1.5, marginBottom: 4 },
  scoreValue: { fontSize: 32, fontWeight: '800' },
  scoreRight: { flex: 1, gap: 6 },
  scoreBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 3 },
  scoreDetail: { fontSize: 10, color: '#ffffff40', letterSpacing: 0.5 },

  // Now card
  nowCard: { padding: 12 },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nowLabel: { fontSize: 9, fontWeight: '800', color: '#0ea5e9', letterSpacing: 2, minWidth: 36 },
  nowIcon: { fontSize: 16 },
  nowTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#e5e7eb' },
  nowTime: { fontSize: 12, fontWeight: '600', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },

  // Suggestion
  suggestionCard: { padding: 12, gap: 6 },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  suggestionIcon: { fontSize: 16 },
  suggestionText: { flex: 1, color: '#d1d5db', fontSize: 13, lineHeight: 19 },
  suggestionAction: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textAlign: 'right' },

  // Tabs
  tabRow: { flexDirection: 'row', gap: 0, marginTop: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#ffffff40', letterSpacing: 0.5 },
  tabContent: { gap: 8 },

  // Empty states
  emptyCard: { padding: 24, alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 28 },
  emptyText: { color: '#ffffff60', fontSize: 14, fontWeight: '600' },
  emptyHint: { color: '#ffffff30', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Blocks
  blockCard: { padding: 0, overflow: 'hidden' },
  blockCompleted: { opacity: 0.6 },
  blockRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  blockTime: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  blockTimeText: { fontSize: 11, fontWeight: '700', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  blockInfo: { flex: 1, gap: 2 },
  blockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockIcon: { fontSize: 14 },
  blockTitle: { fontSize: 14, fontWeight: '600', color: '#e5e7eb' },
  blockTitleDone: { textDecorationLine: 'line-through', color: '#ffffff40' },
  blockMeta: { fontSize: 10, color: '#ffffff30', letterSpacing: 0.5 },
  blockCheck: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  blockCheckMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  currentIndicator: { height: 2, width: '100%' },

  // Habits
  habitCard: { padding: 12 },
  habitCompleted: {},
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitIcon: { fontSize: 24 },
  habitInfo: { flex: 1, gap: 2 },
  habitName: { fontSize: 14, fontWeight: '600', color: '#e5e7eb' },
  habitNameDone: { textDecorationLine: 'line-through', color: '#ffffff50' },
  habitStreakRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  habitStreak: { fontSize: 11, color: '#f59e0b' },
  habitBest: { fontSize: 10, color: '#ffffff25' },
  habitCheck: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  habitCheckMark: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Add forms
  addBtn: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  addForm: { padding: 16, gap: 12 },
  addFormTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  addInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: '#ffffff15',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#e5e7eb',
  },
  addFormRow: { flexDirection: 'row', gap: 12 },
  addFieldSmall: { flex: 1, gap: 4 },
  addFieldLabel: { fontSize: 8, color: '#ffffff40', letterSpacing: 1.5 },
  addInputSmall: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: '#ffffff15',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#e5e7eb',
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffffff15',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  categoryChipIcon: { fontSize: 16 },
  iconPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  iconChip: { padding: 8, borderRadius: 8 },
  iconChipText: { fontSize: 20 },
  addFormButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelFormBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelFormText: { color: '#ffffff40', fontSize: 13 },
  submitFormBtn: { borderRadius: 20, paddingVertical: 10, paddingHorizontal: 20 },
  submitFormText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Routines / Templates
  routinesIntro: { color: '#ffffff40', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 4 },
  templateCard: { padding: 14, gap: 10 },
  templateHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  templateIcon: { fontSize: 28 },
  templateInfo: { flex: 1, gap: 2 },
  templateName: { fontSize: 15, fontWeight: '700' },
  templateDesc: { fontSize: 12, color: '#ffffff50' },
  templateBlocks: { gap: 4 },
  templateBlockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  templateBlockTime: {
    fontSize: 10, color: '#ffffff30', fontWeight: '600', minWidth: 40,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  templateBlockIcon: { fontSize: 12 },
  templateBlockTitle: { flex: 1, fontSize: 12, color: '#ffffff60' },
  templateBlockDur: { fontSize: 10, color: '#ffffff25' },
  templateApply: { fontSize: 11, fontWeight: '700', textAlign: 'right', letterSpacing: 0.5 },

  footer: {
    textAlign: 'center',
    fontSize: 9,
    color: '#ffffff15',
    letterSpacing: 1,
    marginTop: 12,
  },
})

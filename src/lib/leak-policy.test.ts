import { describe, expect, it } from 'bun:test'
import {
  buildLeakPolicy,
  type LeakPlanMode,
  type PolicyPlan,
  appendRunJournal,
  compactSnapshot,
} from './leak-policy'

function buildPlan(mode: LeakPlanMode, isSelected = false): PolicyPlan {
  return {
    mode,
    isSelected,
    actions: [
      {
        id: `${mode}-a1`,
        title: `${mode}-action-1`,
        kind: 'task',
        payload: { convertedEntityId: `${mode}-entity-1` },
        feedbacks: [],
      },
      {
        id: `${mode}-a2`,
        title: `${mode}-action-2`,
        kind: 'task',
        payload: { convertedEntityId: `${mode}-entity-2` },
        feedbacks: [],
      },
    ],
  }
}

describe('leak-policy', () => {
  it('suggests minimum mode when recent failures dominate', () => {
    const plan = buildPlan('base', true)
    plan.actions.push({
      id: 'base-a3',
      title: 'base-action-3',
      kind: 'task',
      payload: { convertedEntityId: 'base-entity-3' },
      feedbacks: [{ result: 'not_worked', updatedAt: '2026-03-20T08:30:00.000Z' }],
    })
    plan.actions[0].feedbacks = [{ result: 'not_worked', updatedAt: '2026-03-20T10:00:00.000Z' }]
    plan.actions[1].feedbacks = [{ result: 'not_worked', updatedAt: '2026-03-20T09:00:00.000Z' }]

    const policy = buildLeakPolicy([plan], { selectedPlanMode: 'base' }, {
      metrics: { energyAvg: 4, stressAvg: 7 },
    })

    expect(policy.adaptiveModeSuggestion?.targetMode).toBe('minimum')
    expect(policy.nextBestAction?.type).toBe('switch_mode')
    expect(policy.nextBestAction?.targetMode).toBe('minimum')
    expect(policy.nextBestAction?.correlationId).toContain('policy_')
    expect((policy.nextBestAction?.factors || []).length).toBeGreaterThan(0)
  })

  it('suggests base mode when minimum is stable', () => {
    const plan = buildPlan('minimum', true)
    plan.actions.push({
      id: 'min-a3',
      title: 'minimum-action-3',
      kind: 'task',
      payload: { convertedEntityId: 'min-entity-3' },
      feedbacks: [{ result: 'worked', updatedAt: '2026-03-20T08:00:00.000Z' }],
    })
    plan.actions[0].feedbacks = [{ result: 'worked', updatedAt: '2026-03-20T10:00:00.000Z' }]
    plan.actions[1].feedbacks = [{ result: 'worked', updatedAt: '2026-03-20T09:00:00.000Z' }]

    const policy = buildLeakPolicy([plan], { selectedPlanMode: 'minimum' }, {
      metrics: { energyAvg: 7, stressAvg: 3 },
    })

    expect(policy.adaptiveModeSuggestion?.targetMode).toBe('base')
    expect(policy.nextBestAction?.type).toBe('switch_mode')
    expect(policy.nextBestAction?.targetMode).toBe('base')
  })

  it('requests regenerate when drift is high', () => {
    const plan = buildPlan('base', true)
    const snapshot = {
      selectedPlanMode: 'base',
      planGenerationBaseline: {
        capturedAt: '2026-03-19T00:00:00.000Z',
        metrics: {
          energyAvg: 8,
          stressAvg: 2,
          sleepHoursAvg: 8,
          recentFeedbackNegativeShare: 10,
        },
      },
    }
    const policy = buildLeakPolicy([plan], snapshot, {
      metrics: {
        energyAvg: 4,
        stressAvg: 7,
        sleepHoursAvg: 5,
        recentFeedbackNegativeShare: 70,
      },
    })

    expect(policy.contextDrift.isStale).toBe(true)
    expect(policy.nextBestAction?.type).toBe('regenerate_context')
    expect(policy.nextBestAction?.correlationId).toContain('policy_')
    expect(policy.nextBestAction?.factors?.[0]?.key).toBe('high_drift')
  })

  it('returns policy version metadata', () => {
    const plan = buildPlan('base', true)
    const policy = buildLeakPolicy([plan], { selectedPlanMode: 'base' }, { metrics: {} })
    expect(policy.policyVersion).toBeGreaterThan(0)
    expect(typeof policy.computedAt).toBe('string')
  })

  it('keeps snapshot journal compact', () => {
    let snapshot: Record<string, unknown> = {}
    for (let i = 0; i < 140; i += 1) {
      snapshot = appendRunJournal(snapshot, {
        type: 'feedback_saved',
        at: `2026-03-20T10:${String(i % 60).padStart(2, '0')}:00.000Z`,
      })
    }
    const compacted = compactSnapshot(snapshot)
    const runJournal = Array.isArray(compacted.runJournal) ? compacted.runJournal : []
    expect(runJournal.length).toBeLessThanOrEqual(120)
  })

  it('stores policy factors in run journal entries', () => {
    const snapshot = appendRunJournal({}, {
      type: 'policy_accepted',
      at: '2026-03-20T12:00:00.000Z',
      policyCorrelationId: 'policy_test_1',
      policyActionType: 'switch_mode',
      factors: [
        { key: 'failed_recent', weight: 0.8, detail: '2' },
        { key: 'mode_pressure', weight: 0.5, detail: 'base' },
      ],
      note: 'accepted',
    })
    const runJournal = Array.isArray(snapshot.runJournal) ? snapshot.runJournal : []
    expect(runJournal.length).toBe(1)
    const first = runJournal[0] as Record<string, unknown>
    const factors = Array.isArray(first.factors) ? first.factors : []
    expect(factors.length).toBe(2)
    expect((factors[0] as { key?: string }).key).toBe('failed_recent')
  })
})

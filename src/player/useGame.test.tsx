import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';
import { sampleStory } from '../content/sampleStory';

describe('useGame', () => {
  it('exposes the start view and advances on choose', () => {
    const { result } = renderHook(() => useGame(sampleStory));
    expect(result.current.view.node.id).toBe('start');
    act(() => result.current.choose('ask'));
    expect(result.current.view.node.id).toBe('briefed');
    expect(result.current.view.state.vars.knows_envelope).toBe(true);
  });
  it('resets to the start', () => {
    const { result } = renderHook(() => useGame(sampleStory));
    act(() => result.current.choose('ask'));
    act(() => result.current.reset());
    expect(result.current.view.node.id).toBe('start');
  });
  it('round-trips via snapshot/restore', () => {
    const { result } = renderHook(() => useGame(sampleStory));
    act(() => result.current.choose('ask'));
    let snap!: ReturnType<typeof result.current.snapshot>;
    act(() => { snap = result.current.snapshot(); });
    act(() => result.current.reset());
    expect(result.current.view.node.id).toBe('start');
    act(() => result.current.restore(snap));
    expect(result.current.view.node.id).toBe('briefed');
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveSlots } from './SaveSlots';
import type { EngineSnapshot } from '../../engine';

const snap: EngineSnapshot = {
  version: 1, storyId: 'sample_410', currentId: 'briefed',
  state: { time: 940, location: 'L_DINER', clues: [], inventory: [], visited: [], completedEvents: [], vars: {} },
  log: [],
};

describe('SaveSlots', () => {
  beforeEach(() => localStorage.clear());
  it('saves a named slot and loads it back', async () => {
    const onRestore = vi.fn();
    render(<SaveSlots storyId="sample_410" makeSnapshot={() => snap} onRestore={onRestore} summary="3:40 PM - L_DINER" />);
    await userEvent.type(screen.getByLabelText('Slot name'), 'before pickup');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/before pickup/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect(onRestore).toHaveBeenCalledWith(snap);
  });
});

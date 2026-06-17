import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebugPanel } from './DebugPanel';
import { sampleStory } from '../../content/sampleStory';
import { GameEngine } from '../../engine';

function viewAtBriefed() {
  const g = new GameEngine(sampleStory);
  g.choose('ask'); // at 'briefed', trust 1 -> 'press' is locked
  return g.view();
}

describe('DebugPanel', () => {
  it('shows hidden choices with reasons, an ending preview, and clean lint', () => {
    render(<DebugPanel view={viewAtBriefed()} story={sampleStory} onReset={() => {}} onGoto={() => {}} />);
    expect(screen.getByText(/Press her for the details/)).toBeInTheDocument();
    expect(screen.getByText(/mara_trust gte 2/)).toBeInTheDocument();
    expect(screen.getByText(/In the Know/)).toBeInTheDocument();   // ending preview (knows_envelope true)
    expect(screen.getByText(/clean/i)).toBeInTheDocument();        // lint status
  });
  it('fires reset and jump callbacks', async () => {
    const onReset = vi.fn();
    const onGoto = vi.fn();
    render(<DebugPanel view={viewAtBriefed()} story={sampleStory} onReset={onReset} onGoto={onGoto} />);
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(onReset).toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByLabelText('Jump to node'), 'witness');
    expect(onGoto).toHaveBeenCalledWith('witness');
  });
});

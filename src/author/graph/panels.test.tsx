import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeAxis } from './TimeAxis';
import { LintBanner } from './LintBanner';
import { InspectorPanel } from './InspectorPanel';
import { lintStatus } from './lintStatus';
import { praterLine } from '../../content/praterLine';

describe('TimeAxis', () => {
  it('renders the window bounds and an event mark', () => {
    render(<TimeAxis story={praterLine} />);
    expect(screen.getByText(/8:00 PM/)).toBeInTheDocument();   // 20:00 start
    expect(screen.getByText(/2:10 AM/)).toBeInTheDocument();   // 02:10 deadline (1570 -> formatTime)
    expect(screen.getByText(praterLine.events[0].title)).toBeInTheDocument();
  });
});

describe('LintBanner', () => {
  it('summarizes errors/warnings and shows story-level codes', () => {
    const status = lintStatus({ ok: false, errors: [{ level: 'error', code: 'CLOCK_CANNOT_BITE', message: 'm' }], warnings: [] });
    render(<LintBanner status={status} />);
    expect(screen.getByText(/1 error/)).toBeInTheDocument();
    expect(screen.getByText(/CLOCK_CANNOT_BITE/)).toBeInTheDocument();
  });
  it('shows a clean state', () => {
    render(<LintBanner status={lintStatus({ ok: true, errors: [], warnings: [] })} />);
    expect(screen.getByText(/clean/i)).toBeInTheDocument();
  });
});

describe('InspectorPanel', () => {
  it('shows a selected node and fires Play-from-here', async () => {
    const onPlayFrom = vi.fn();
    const status = lintStatus({ ok: true, errors: [], warnings: [] });
    render(<InspectorPanel story={praterLine} selectedId="node_sperl" status={status} onPlayFrom={onPlayFrom} />);
    expect(screen.getByRole('heading', { name: /node_sperl|Caf|Sperl/ })).toBeInTheDocument();
    expect(screen.getByText(/leads to/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /play from here/i }));
    expect(onPlayFrom).toHaveBeenCalledWith('node_sperl');
  });
  it('prompts to select when nothing is selected', () => {
    const status = lintStatus({ ok: true, errors: [], warnings: [] });
    render(<InspectorPanel story={praterLine} selectedId={null} status={status} onPlayFrom={() => {}} />);
    expect(screen.getByText(/select a node/i)).toBeInTheDocument();
  });
});

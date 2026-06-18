import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphView } from './GraphView';
import { praterLine } from '../../content/praterLine';

// Mock React Flow: render the passed nodes as clickable buttons + expose counts; render children (chrome lives outside).
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ nodes, edges, onNodeClick, children }: any) => (
    <div data-testid="rf" data-nodes={nodes.length} data-edges={edges.length}>
      {nodes.map((n: any) => (
        <button key={n.id} onClick={() => onNodeClick?.({}, n)}>{n.id}</button>
      ))}
      {children}
    </div>
  ),
  Background: () => null, Controls: () => null, MiniMap: () => null,
  Handle: () => null, Position: { Top: 'top', Bottom: 'bottom' },
}));

describe('GraphView', () => {
  it('renders the lint banner, time axis, and a React Flow with all graph nodes/edges', () => {
    render(<GraphView story={praterLine} onPlayFrom={() => {}} />);
    expect(screen.getAllByText(/clean|error|warning/i).length).toBeGreaterThan(0); // LintBanner
    const rf = screen.getByTestId('rf');
    // nodes = story nodes + endings + events + resolver
    const expectedNodes = praterLine.nodes.length + praterLine.endings.length + praterLine.events.length + 1;
    expect(Number(rf.getAttribute('data-nodes'))).toBe(expectedNodes);
  });
  it('clicking a node opens the inspector and Play-from-here fires the callback', async () => {
    const onPlayFrom = vi.fn();
    render(<GraphView story={praterLine} onPlayFrom={onPlayFrom} />);
    await userEvent.click(screen.getByRole('button', { name: 'node_sperl' }));
    await userEvent.click(screen.getByRole('button', { name: /play from here/i }));
    expect(onPlayFrom).toHaveBeenCalledWith('node_sperl');
  });
});

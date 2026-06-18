import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

// Mock React Flow so the graph renders deterministically in jsdom (clickable node buttons).
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ nodes, onNodeClick, children }: any) => (
    <div data-testid="rf">{nodes.map((n: any) => <button key={n.id} onClick={() => onNodeClick?.({}, n)}>{n.id}</button>)}{children}</div>
  ),
  Background: () => null, Controls: () => null, MiniMap: () => null,
  Handle: () => null, Position: { Top: 'top', Bottom: 'bottom' },
}));

describe('App Play | Graph integration', () => {
  it('switches to Graph and back', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'A Booth by the Window' })).toBeInTheDocument(); // player default
    await userEvent.click(screen.getByRole('button', { name: /graph/i }));
    expect(screen.getByTestId('rf')).toBeInTheDocument();         // graph view
    await userEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(screen.getByRole('heading', { name: 'A Booth by the Window' })).toBeInTheDocument(); // back to player
  });
  it('Play-from-here in the graph opens the player at that node', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /graph/i }));
    await userEvent.click(screen.getByRole('button', { name: 'witness' }));      // sample story node id
    await userEvent.click(screen.getByRole('button', { name: /play from here/i }));
    expect(screen.getByRole('heading', { name: 'The Pickup' })).toBeInTheDocument(); // player started at node 'witness'
  });
  it('toolbar Play returns to the story start after play-from-here', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /graph/i }));
    await userEvent.click(screen.getByRole('button', { name: 'witness' }));
    await userEvent.click(screen.getByRole('button', { name: /play from here/i }));
    expect(screen.getByRole('heading', { name: 'The Pickup' })).toBeInTheDocument(); // at play-from node
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));             // toolbar Play (exact)
    expect(screen.getByRole('heading', { name: 'A Booth by the Window' })).toBeInTheDocument(); // back to start
  });
});

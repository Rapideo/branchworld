import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoryNodeCard, EndingNode, EventBadge, ResolverNode } from './nodes';
import type { GraphNode } from './model';
import type { LintIssue } from '../../engine';

vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
}));

const data = (graph: GraphNode, issues: LintIssue[] = []) => ({ data: { graph, issues } });

describe('graph node components', () => {
  it('StoryNodeCard shows title + type and an error ring', () => {
    render(<StoryNodeCard {...data({ id: 'a', kind: 'node', label: 'Cafe Sperl', nodeType: 'conversation' }, [{ level: 'error', code: 'X', message: 'm' }])} />);
    expect(screen.getByText('Cafe Sperl')).toBeInTheDocument();
    expect(screen.getByText(/conversation/)).toBeInTheDocument();
    expect(screen.getByText('Cafe Sperl').closest('div')!.className).toMatch(/red/);
  });
  it('EndingNode marks the default ending', () => {
    render(<EndingNode {...data({ id: 'e', kind: 'ending', label: 'In the Dark', isDefaultEnding: true })} />);
    expect(screen.getByText('In the Dark')).toBeInTheDocument();
    expect(screen.getByText(/default/i)).toBeInTheDocument();
  });
  it('EventBadge shows the trigger time; ResolverNode renders its label', () => {
    render(<EventBadge {...data({ id: 'ev', kind: 'event', label: 'Pickup', triggerLabel: '23:30' })} />);
    expect(screen.getByText(/23:30/)).toBeInTheDocument();
    render(<ResolverNode {...data({ id: '__resolver__', kind: 'resolver', label: 'Ending Resolver' })} />);
    expect(screen.getByText('Ending Resolver')).toBeInTheDocument();
  });
});

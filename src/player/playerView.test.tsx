import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusBar } from './StatusBar';
import { SceneView } from './SceneView';
import { ChoiceList } from './ChoiceList';
import { EndingView } from './EndingView';

describe('player view', () => {
  it('StatusBar shows time and location', () => {
    render(<StatusBar timeLabel="4:10 PM" location="The Diner" />);
    expect(screen.getByText(/4:10 PM/)).toBeInTheDocument();
    expect(screen.getByText(/The Diner/)).toBeInTheDocument();
  });
  it('SceneView shows the title and substitutes {{time}}', () => {
    render(<SceneView node={{ id: 'n', title: 'Scene', body: 'It is {{time}} now.', choices: [] }} timeLabel="4:10 PM" />);
    expect(screen.getByRole('heading', { name: 'Scene' })).toBeInTheDocument();
    expect(screen.getByText('It is 4:10 PM now.')).toBeInTheDocument();
  });
  it('ChoiceList renders only available choices and reports clicks', async () => {
    const onChoose = vi.fn();
    render(<ChoiceList onChoose={onChoose} choices={[
      { id: 'a', label: 'Alpha', available: true },
      { id: 'b', label: 'Bravo', available: false, lockedReason: 'locked' },
    ]} />);
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bravo' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    expect(onChoose).toHaveBeenCalledWith('a');
  });
  it('EndingView shows the ending and a reset control', async () => {
    const onReset = vi.fn();
    render(<EndingView onReset={onReset} ending={{ id: 'e', name: 'The End', summary: 'Done.', conditions: [] }} />);
    expect(screen.getByText('The End')).toBeInTheDocument();
    expect(screen.getByText('Done.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /new game/i }));
    expect(onReset).toHaveBeenCalled();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App', () => {
  it('plays the sample story from the start node', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'A Booth by the Window' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ask Mara what she heard' }));
    expect(screen.getByRole('heading', { name: 'Mara Leans In' })).toBeInTheDocument();
  });
  it('hides locked choices in the player but reveals them in the debug panel', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Ask Mara what she heard' }));
    expect(screen.queryByRole('button', { name: 'Press her for the details' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /debug/i }));
    expect(screen.getByText(/mara_trust gte 2/)).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('content selector', () => {
  it('switches the loaded story and resets to its start', async () => {
    render(<App />);
    // default story (the demo) start heading is present
    expect(screen.getByRole('heading', { name: 'A Booth by the Window' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Story'), 'prater_line');
    expect(screen.getByRole('heading', { name: 'The Margareten Safehouse' })).toBeInTheDocument();
  });
});

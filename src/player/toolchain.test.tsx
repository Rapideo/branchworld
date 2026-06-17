import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('toolchain', () => {
  it('renders a React component in jsdom with jest-dom matchers', () => {
    render(<button>hello</button>);
    expect(screen.getByRole('button', { name: 'hello' })).toBeInTheDocument();
  });
});

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Reset the jsdom DOM between tests so renders don't accumulate.
afterEach(() => {
  cleanup();
});

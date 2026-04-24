import { vi } from 'vitest';

export const rtdb = {};
export const storage = {};

export const rtdbRef = vi.fn((db, path) => ({ path }));
export const storageRef = vi.fn((st, path) => ({ path }));

export const set = vi.fn(() => Promise.resolve());
export const push = vi.fn(() => ({ key: 'mock-key' }));
export const update = vi.fn(() => Promise.resolve());
export const remove = vi.fn(() => Promise.resolve());

export const uploadBytesResumable = vi.fn(() => ({
  on: (event, progress, error, complete) => {
    // Simulate immediate completion
    setTimeout(complete, 100);
  },
  snapshot: {
    ref: { path: 'mock-path' }
  }
}));

export const getDownloadURL = vi.fn(() => Promise.resolve('https://mock-url.com/media.jpg'));

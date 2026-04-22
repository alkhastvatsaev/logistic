import { vi } from 'vitest';

/**
 * Mock implementation of Firebase Realtime Database for testing.
 */
export const rtdb = {};
export const rtdbRef = vi.fn((db, path) => ({ path }));
export const onValue = vi.fn((ref, callback) => {
  // Simulate a snapshot
  callback({
    val: () => null
  });
  return () => {}; // Unsubscribe
});
export const set = vi.fn(() => Promise.resolve());
export const push = vi.fn(() => ({ key: 'mock-key', ref: {} }));
export const update = vi.fn(() => Promise.resolve());

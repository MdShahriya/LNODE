/* eslint-disable @typescript-eslint/no-require-imports */
// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// Mock fetch globally
global.fetch = jest.fn();

// Mock IntersectionObserver which isn't available in test environment
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}

global.IntersectionObserver = MockIntersectionObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.location.reload
window.location.reload = jest.fn();
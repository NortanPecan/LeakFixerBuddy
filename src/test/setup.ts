import "@testing-library/jest-dom";

// Suppress console.error/warn in tests unless explicitly needed
// Comment out during debugging
const _originalError = console.error;
const _originalWarn = console.warn;

beforeEach(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterEach(() => {
  console.error = _originalError;
  console.warn = _originalWarn;
  vi.clearAllMocks();
});

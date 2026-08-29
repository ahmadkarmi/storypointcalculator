// Custom matchers
import '@testing-library/jest-dom';

// jsdom does not implement matchMedia. app.js uses it to tell the mobile
// bottom sheet apart from the desktop sidebar. Default to desktop (no match)
// so tests exercise the layout-independent behaviour; a test can override
// `matches` when it needs the mobile branch.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    media: query,
    matches: false,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

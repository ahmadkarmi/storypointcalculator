// Utility functions for testing
export function setupDOM() {
  // Set up our document body
  document.body.innerHTML = `
    <div class="container">
      <div class="cards-grid">
        <button class="card" data-points="1">1</button>
        <button class="card" data-points="2">2</button>
        <button class="card" data-points="3">3</button>
        <button class="card" data-points="5">5</button>
        <button class="card" data-points="8">8</button>
        <button class="card" data-points="13">13</button>
        <button class="card" data-points="20">20</button>
        <button class="card" data-points="?">?</button>
        <button class="card" data-points="☕">☕</button>
      </div>
      <div id="selectedCard"></div>
      <button id="resetBtn">Reset</button>
    </div>
  `;
}

export function mockLocalStorage() {
  let store = {};
  
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
}

export function mockVibrate() {
  window.navigator.vibrate = jest.fn();
}

export function mockServiceWorker() {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: jest.fn(() => Promise.resolve({
        register: true
      }))
    },
    configurable: true
  });
}

export function mockBeforeInstallPrompt() {
  const event = {
    preventDefault: jest.fn(),
    userChoice: Promise.resolve({ outcome: 'accepted' })
  };
  
  window.addEventListener = jest.fn((eventName, callback) => {
    if (eventName === 'beforeinstallprompt') {
      window.beforeinstallprompt = event;
    }
  });
  
  return event;
}

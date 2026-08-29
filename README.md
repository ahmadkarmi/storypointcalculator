# Story Points Calculator PWA

A Progressive Web App (PWA) for Agile teams to estimate story points during planning poker sessions. This app works offline and can be installed on any device.

## Features

- 🃏 Simple and intuitive interface for story point estimation
- 📱 Responsive design that works on all devices
- ⚡ Works offline with service worker caching
- 📲 Installable as a PWA on mobile and desktop
- ⌨️ Keyboard shortcuts for quick selection
- 🌓 Dark mode support
- 📊 Save your last selection (persists between sessions)

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (for local development)

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/story-points-calculator.git
   cd story-points-calculator
   ```

2. Install dependencies (for development):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx http-server -c-1
   ```

4. Open your browser and navigate to `http://localhost:8080`

## Usage

1. Open the app in your browser
2. Click on a card to select a story point value
3. Use keyboard shortcuts (0-9, ?, b for break) for quick selection
4. Press Escape or the Reset button to clear your selection
5. Install the app for offline use by clicking the install button when prompted

## Available Scripts

- `start` - Start the development server
- `test` - Run tests (coming soon)
- `build` - Build for production (optimized assets)

## Browser Support

The app is tested on the latest versions of:

- Google Chrome
- Mozilla Firefox
- Microsoft Edge
- Safari (iOS and macOS)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by various Agile planning poker tools
- Built with vanilla JavaScript, HTML, and CSS
- Icons from [Material Icons](https://fonts.google.com/icons)

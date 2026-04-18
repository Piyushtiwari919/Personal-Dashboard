# Dinacharya (दिनचर्या)

A lightning-fast, zero-dependency personal dashboard designed to anchor your daily routine. 

Built entirely with Vanilla JavaScript, HTML, and CSS, Dinacharya runs locally in your browser, utilizing `localStorage` to keep your workspace private, persistent, and instantly accessible. No frameworks, no build steps, just clean code and deep focus.

## 🚀 The Environment

- **Daily Focus (The Rule of 3):** A minimalist task tracker that limits you to 3 primary goals. Features a midnight auto-reset to clear yesterday's backlog and satisfying completion micro-interactions.
- **App-Drawer Bookmarks:** A visual replacement for your browser's bookmarks bar. Paste a URL, and the app automatically fetches the high-res favicon. Includes an iOS-style "jiggle" edit mode for easy removal.
- **Immersive Pomodoro Timer:** A custom-built SVG progress ring. Features a scroll-to-adjust typographic UI, browser tab-title sync, and a native Web Audio API completion chime.
- **Real-Time Weather & Markets:** Live weather conditions and Bitcoin price tracking, housed in a responsive CSS Grid with smooth shimmer-loading states.
- **Modular Architecture:** Powered by a central `config.js` and local storage, allowing users to toggle widgets on and off seamlessly.

## 🛠️ Tech Stack

- **Structure:** HTML5 & Inline SVGs
- **Styling:** CSS3 (CSS Grid, Flexbox, Custom Variables, Glassmorphism)
- **Logic:** ES6+ Vanilla JavaScript 
- **Storage:** Browser Native `localStorage`
- **Audio:** Native Web Audio API (Zero external `.mp3` dependencies)

## 💻 How to Run Locally

Because this project is strictly vanilla, there are no `npm install` commands or heavy node modules required. 

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Piyushtiwari919/Personal-Dashboard.git](https://github.com/Piyushtiwari919/Personal-Dashboard.git)
   ```
2. **Navigate to the project folder:**
   ```bash
   cd Personal-Dashboard
   ```
3. **Configure APIs (Optional but recommended):**

- Open the JS file handling the weather fetch.

- Replace the placeholder OpenWeatherMap API key with your own free key to enable live local weather data.
4. **Launch the dashboard:**
Simply find the index.html file in the folder and double-click to open it in any modern web browser.

## 🔌 External APIs
- **OpenWeatherMap API**: For real-time meteorological data.

- **CoinGecko API:** For current cryptocurrency pricing.

- **Google S2 Favicon:** For dynamically resolving high-quality website icons.

## 🤝Contributing
Feel free to fork this repository and submit pull requests if you have ideas for new widgets or improvements!

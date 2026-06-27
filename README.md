# AI Test Agent

An Electron desktop app powered by Claude AI that automatically generates test cases, scaffolds a Cypress framework, writes automation scripts, and self-heals fragile locators — all from a requirements document, organized by module for any scale of web application.

---

## Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Generate Test Cases** | Reads your requirements and produces structured TC-N test cases (UI + API) per module |
| 2 | **Create Cypress Framework** | Scaffolds a full Cypress 13 project with page objects, custom commands, fixtures, and a self-heal utility |
| 3 | **Generate Test Scripts** | Converts test cases into runnable `.cy.js` spec files organized by module |
| 4 | **Self-Heal Locators** | Audits all selectors, flags fragile ones, and proposes a `data-cy → aria → text → CSS` fallback chain |
| 5 | **Module-based Pipeline** | Runs the full pipeline per module — handles enterprise apps with 1000s of test cases |
| 6 | **Upload Requirements** | Upload `.txt`, `.md`, `.pdf`, or `.docx` requirement files directly |
| 7 | **Export to Excel** | Download all generated test cases as a `.csv` file that opens natively in Excel |
| 8 | **Bug Fix Chat** | Built-in AI chat with full code context to fix errors in generated scripts |
| 9 | **Extract Files** | Writes all generated framework files directly to a folder on your disk |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Git](https://git-scm.com/)
- A [Claude API key](https://console.anthropic.com/) — sign up at Anthropic Console

---

## Project structure

```
ai-test-agent/
├── src/
│   ├── main.js                  # Electron main process + IPC handlers
│   ├── preload.js               # Secure context bridge (IPC)
│   └── renderer/
│       ├── index.html           # UI markup
│       ├── styles.css           # Dark theme design system
│       └── renderer.js          # All UI logic, agent pipeline, chat
├── assets/
│   ├── icon.png                 # App icon 512×512
│   ├── icon.ico                 # Windows icon
│   └── icon.icns                # macOS icon
├── package.json
├── electron-builder.yml         # Cross-platform build config
├── .env.example                 # Environment variable template
├── .gitignore
└── README.md
```

---

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-test-agent.git
cd ai-test-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment (optional)

```bash
cp .env.example .env
```

Edit `.env` and add your Claude API key if you want it pre-filled:

```
ANTHROPIC_API_KEY=sk-ant-...
BASE_URL=https://your-app.com
```

### 4. Run in development mode

```bash
npm start
```

---

## How to use

### Step 1 — Configure

| Field | What to enter |
|-------|--------------|
| Claude API Key | Your key from [console.anthropic.com](https://console.anthropic.com) — starts with `sk-ant-` |
| Base URL | The URL of the web app you are testing, e.g. `https://myapp.com` |
| Modules | One module name per line, e.g. `Authentication`, `Shopping Cart`, `Checkout` |
| Requirements | Upload a `.txt` / `.md` / `.pdf` / `.docx` file, or paste text directly |

### Step 2 — Run the agent

Click **Run Agent**. The pipeline runs once per module:

```
For each module:
  ├── Phase 1 — Generate ~50 test cases
  ├── Phase 2 — Generate page objects, fixtures, and commands
  ├── Phase 3 — Generate spec files (happy-path + edge-cases)
  ├── Phase 4 — Self-heal locators
  └── Write all files to disk immediately
```

Shared project files (`package.json`, `cypress.config.js`, `commands.js`, `selfHeal.js`, `.env.example`, `README.md`) are generated once before the module loop starts.

### Step 3 — Review output

Use the four tabs to review generated content:

- **Test Cases** — collapsible cards, tagged UI or API
- **Framework** — full Cypress project scaffold
- **Test Scripts** — runnable `.cy.js` spec files
- **Self-Heal** — colour-coded locator audit log

### Step 4 — Export

| Button | What it does |
|--------|-------------|
| **Extract Files** | Opens a folder picker and writes all framework + script files to disk |
| **Download Test Cases as Excel** | Saves a `.csv` with columns: ID, Type, Title, Preconditions, Steps, Expected Result, Priority |
| **Copy** | Copies the current tab's raw output to clipboard |
| **Save** | Saves the current tab's raw output as a file |

### Step 5 — Fix bugs with AI chat

Click **Fix Bugs** (floating button, bottom-right). The chat has full context of your generated code. Describe any error or paste a stack trace and the AI will return fixed files using the `===FILE===` format. Click **Save fixed files to disk** under any response to write the fixes directly.

---

## Generated project structure

After running the agent for a 3-module site, your output folder will look like:

```
output-folder/
├── package.json
├── cypress.config.js
├── .env.example
├── README.md
├── cypress/
│   ├── support/
│   │   ├── commands.js
│   │   └── e2e.js
│   ├── utils/
│   │   └── selfHeal.js
│   ├── pages/
│   │   ├── Authentication/
│   │   │   └── index.js
│   │   ├── ShoppingCart/
│   │   │   └── index.js
│   │   └── Checkout/
│   │       └── index.js
│   ├── fixtures/
│   │   ├── authentication.json
│   │   ├── shopping-cart.json
│   │   └── checkout.json
│   ├── e2e/
│   │   ├── authentication/
│   │   │   ├── happy-path.cy.js
│   │   │   └── edge-cases.cy.js
│   │   ├── shopping-cart/
│   │   │   ├── happy-path.cy.js
│   │   │   └── edge-cases.cy.js
│   │   └── checkout/
│   │       ├── happy-path.cy.js
│   │       └── edge-cases.cy.js
│   └── reports/
│       ├── test-cases-authentication.md
│       ├── test-cases-shopping-cart.md
│       └── test-cases-checkout.md
└── test-cases.csv                   ← Excel-ready test case export
```

---

## Run the generated Cypress tests

```bash
cd output-folder
npm install

# Open Cypress Test Runner (interactive)
npx cypress open

# Run all tests headlessly
npx cypress run

# Run a specific module
npx cypress run --spec "cypress/e2e/authentication/**"
```

---

## Module capacity guide

| App scale | Modules | Claude calls | Files generated |
|-----------|---------|-------------|-----------------|
| Small (5–10 pages) | 2–3 | ~10 | ~20–30 |
| Medium (20–30 pages) | 4–6 | ~20 | ~40–60 |
| Large eCommerce | 8–12 | ~40 | ~80–120 |
| Enterprise (100+ pages) | 15–25 | ~80 | ~150–250 |

Each module generates ~50 test cases and 5–7 files within the 8,000 token output limit.

---

## Build standalone executables

```bash
# Windows — produces dist/AI Test Agent Setup.exe
npm run build:win

# macOS — produces dist/AI Test Agent.dmg
npm run build:mac

# Linux — produces dist/AI Test Agent.AppImage
npm run build:linux

# All platforms at once
npm run build
```

Built files are output to the `dist/` folder.

> **macOS note:** Right-click the `.app` and choose Open for local testing without a developer certificate.

> **Windows note:** The `.exe` installer is unsigned. Windows Defender may show a SmartScreen warning — click "More info → Run anyway" for local builds.

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key — can also be entered in the UI at runtime |
| `BASE_URL` | Default base URL for the app under test |
| `USERNAME` | Default test user email |
| `PASSWORD` | Default test user password |
| `API_KEY` | API key for the app under test (used in API test specs) |

---

## Tech stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Electron](https://www.electronjs.org/) | v28 | Desktop shell, file system access, IPC |
| [Claude API](https://docs.anthropic.com/) | claude-sonnet-4-6 | AI backbone for all four phases |
| [electron-builder](https://www.electron.build/) | v24 | Cross-platform packaging (.exe, .dmg, .AppImage) |
| [mammoth](https://github.com/mwilliamson/mammoth.js) | v1.6 | DOCX text extraction |
| Vanilla HTML/CSS/JS | — | Zero frontend framework, zero bundle step |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Run Agent button does nothing | Open DevTools (`Ctrl+Shift+I`) → Console and check for red errors |
| `401 Unauthorized` from API | API key is wrong — must start with `sk-ant-` |
| `403 Forbidden` from API | Missing `anthropic-dangerous-direct-browser-access` header — update `renderer.js` |
| Files not created after Extract | Check DevTools console for `✓ Written:` log lines from `main.js` |
| PDF text not extracted | Install poppler-utils (`brew install poppler` on Mac, `apt install poppler-utils` on Linux) |
| DOCX not extracting | Run `npm install mammoth` and restart |
| Test cases CSV is empty | Open DevTools console, run `copy(results[0])`, paste here for parser diagnosis |
| Phase 1 stuck running | A previous `startAgent` call is still running — wait or restart the app |
| Excel file garbled characters | Open with Excel → Data → From Text/CSV → UTF-8 encoding |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: describe what you added"`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.
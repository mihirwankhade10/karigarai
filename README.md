# KarigarAI

AI-powered multilingual video interview and workforce fitment assessment platform — built for the Government of Karnataka under the **AI for Bharat Hackathon**. Designed for Karnataka's blue-collar and polytechnic-skilled candidates with Kannada-first voice assessment, Kafka-driven processing pipeline, and fraud detection.

> **ಕೌಶಲ್ಯ ನಿಮ್ಮದು, ಅವಕಾಶ ನಮ್ಮದು** — Your Skills, Our Opportunity

---

## Repository Layout

```
karigarai/
├── frontend/      # React + Vite frontend (this delivery)
└── README.md
```

The `frontend/` directory contains a complete demo-ready React application. Backend pipeline is out of scope for this commit — all data is mocked through a single API layer for seamless future swap-in.

---

## Frontend

A production-grade frontend covering two flows:

1. **Candidate flow** (mobile-first, dark theme): language → register → AI video interview → processing → result
2. **Admin flow** (desktop, light theme): login → dashboard → candidates → detail → flagged → shortlisted

### Tech Stack

| Area | Choice |
|---|---|
| Framework | React 18 + Vite 5 |
| Styling | Tailwind CSS v3 + shadcn-style primitives |
| Routing | react-router-dom v6 |
| State | zustand (with persist) |
| Data fetching | @tanstack/react-query |
| i18n | i18next + react-i18next (Kannada / Hindi / English) |
| Charts | recharts |
| Webcam | react-webcam |
| Animations | framer-motion |
| Icons | lucide-react |

### Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

```bash
npm run build      # production build → frontend/dist
npm run preview    # serve the production build
```

### Demo Credentials

The candidate flow is public — start at `/`.

The admin flow requires login at `/admin/login`:

| Email | Password | Role |
|---|---|---|
| `admin@edcs.kar.gov.in` | `admin123` | admin |
| `reviewer@edcs.kar.gov.in` | `review123` | reviewer |

Credentials are prefilled on the login page for demo convenience.

### Key Features

- **Kannada-first multilingual UI** — switch between Kannada / Hindi / English on every screen, including the AI interview questions themselves.
- **Real webcam capture** — `react-webcam` for selfie registration and live picture-in-picture during the interview.
- **Animated AI interviewer** — pulsing avatar, sequential question state machine, mock recording flow.
- **Multi-step processing screen** — Upload → Speech analysis → AI assessment → Result preparation.
- **Admin dashboard** — recharts-driven daily intake area chart and fitment distribution pie chart.
- **Powerful candidate filters** — search, district, trade, fitment, language, date range, with client-side pagination.
- **Fraud review queue** — confirm or clear flagged cases with confidence scores.
- **Working CSV export** — shortlist export downloads a real CSV file.
- **PWA-ready** — manifest, theme color, mobile meta tags, installable.
- **Fully mocked** — all data lives in `src/lib/mockData.js`; all API calls go through `src/lib/mockApi.js` with realistic 800–1500ms delays. A floating "Demo Mode" badge makes this transparent.

### Project Structure

```
frontend/
├── public/
│   ├── manifest.json
│   └── icon-*.svg
├── src/
│   ├── lib/
│   │   ├── mockData.js       # 30 candidates, questions, admins, analytics
│   │   ├── mockApi.js        # async wrappers with delays + console timing
│   │   └── utils.js          # cn(), CSV export, score/fitment helpers
│   ├── store/
│   │   └── appStore.js       # zustand (candidate flow + admin auth + shortlist)
│   ├── locales/
│   │   ├── en.json
│   │   ├── kn.json
│   │   └── hi.json
│   ├── components/ui/        # Button, Card, Input, Select, Tabs,
│   │                         # FitmentBadge, AcsRing, ScoreBar, Toast,
│   │                         # LanguageSwitcher, ProtectedRoute, ErrorBoundary, ...
│   ├── pages/
│   │   ├── candidate/        # LanguageSelect, Register, Interview, Processing, Result
│   │   └── admin/            # AdminLayout, Login, Dashboard, Candidates,
│   │                         # CandidateDetail, Flagged, Shortlisted
│   ├── i18n.js
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── tailwind.config.js
├── vite.config.js
└── package.json
```

### Routes

**Candidate (public)**
- `/` — Language selection
- `/register` — Registration form + selfie
- `/interview` — AI video interview (5 questions)
- `/processing` — Multi-step processing animation
- `/result` — Fitment result with ACS score

**Admin (protected)**
- `/admin/login`
- `/admin/dashboard`
- `/admin/candidates`
- `/admin/candidates/:id`
- `/admin/flagged`
- `/admin/shortlisted`

### Replacing Mock Data with Real API

Every component talks to the backend through `src/lib/mockApi.js`. To wire a real backend, replace the function bodies in that single file — components do not need to change.

```js
// src/lib/mockApi.js — example swap
export const mockApi = {
  getCandidates: (filters) =>
    fetch(`/api/candidates?${new URLSearchParams(filters)}`).then((r) => r.json()),
  // ...
};
```

---

## Roadmap

- Backend ingestion pipeline (Kafka + speech ASR + LLM scoring)
- Real video upload to object storage
- Service worker for offline-capable candidate flow
- Voice biometric integration for fraud detection
- Recruiter handoff API + SMS notifications

---

## License

Built for the Government of Karnataka. License terms TBD.

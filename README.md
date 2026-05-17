# Do — AI-Assisted Loneliness Recovery Platform

**A gradual, human-centered path from isolation to real-world connection.**

---

## Overview

Do is an AI-assisted emotional support and social reintegration platform designed to help people struggling with loneliness and social isolation.

Unlike traditional AI companion applications that encourage long-term emotional dependence on the chatbot itself, Do is designed with the philosophy that **the AI should not replace human connection — it should bridge toward it.**

The platform guides users through a gradual recovery journey: emotional stabilization → rebuilding motivation → safe human interaction → real-world social reintegration.

Our goal is to help users slowly rely *less* on the platform over time while rebuilding healthier routines, confidence, and meaningful human relationships.

---

## Core Philosophy

Do is intentionally designed **against** addictive engagement models. We do not aim to maximize screen time, chatbot dependency, engagement loops, or parasocial attachments.

Instead, we aim to:
- Reduce isolation and replace it with real-world human connections
- Rebuild confidence through small, achievable steps
- Encourage healthy daily routines
- Support emotional recovery without fostering dependency

**Success means the first need the user turns to the app for — connection — is the first one they no longer need it for.**

---

## Product Structure

The application is organized into five sections, inspired by musical solfège notes.

### 🎵 Do — AI Companion
A private, emotionally safe chat space with Do, the AI companion. The AI listens without judgment, provides emotional support, and gradually learns about the user to offer the most appropriate encouragement toward healthy real-world behaviour.

### 🎵 Re — Relate: Anonymous Human Connection
Anonymous, carefully moderated communication spaces between users. Built on the belief that sharing a safe space with another human going through similar struggles can be more impactful than AI conversation alone — a meaningful first step in rebuilding confidence in human interaction.

Safety systems and moderation are built into this feature. It is only revealed to users the AI concludes are ready to be introduced to other vulnerable users.

### 🎵 Mi — Mission: Progress & Personal Achievements
Personalized small tasks and recovery-oriented activities. Examples:
- Go on a short walk
- Clean part of your room
- Exercise briefly
- Reconnect with a hobby
- Improve your daily routine
- Reduce passive isolation

The focus is gradual progress, not productivity pressure.

### 🎵 Fa — Find: Real-World Activities & Gatherings
The final stage of the journey. A low-pressure event and activity discovery system that encourages real-world participation — hobby meetups, café sessions, study groups, gaming events, language exchange, and small community activities.

### 🎵 So(ul) — Personal Space
The user's personal area: profile, preferences, language settings, accent colour, theme, interests, and stability score.

---

## Stability Score System

Every action on Do contributes to a **stability score** that reflects the user's social readiness:

| Score | Stage | Unlocks |
|-------|-------|---------|
| 0–35 | AI_START | AI Companion chat |
| 36–59 | MISSION_PRACTICE | Daily missions |
| 60–99 | READY_TO_CONNECT | Anonymous user chat, events |
| 100+ | CONNECTING | Real-world gatherings |

Score is earned through: AI conversations (+0.5), mission completions (+1–1.5), chatting with users (+5 per person), adding friends (+4), attending gatherings (+20), and event feedback reflections (+1–8).

The onboarding questionnaire sets the initial score (24–62 points) based on the user's current social comfort level, ensuring they start at a stage that matches where they actually are.

---

## Tech Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo SDK 54) |
| Navigation | React Navigation (native stack + bottom tabs) |
| Auth & Database | Firebase Auth + Firestore |
| Styling | Custom theme system — 10 accent palettes, light/dark mode |
| Fonts | DM Sans, Fraunces (expo-google-fonts) |
| State | React Context (Auth, Theme, Language) |
| Storage | AsyncStorage (offline-first preferences) |
| Web deploy | Vercel |

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.12) |
| Database | Firebase Firestore (Admin SDK) |
| AI | Google Gemini (`google-genai` 2.3.0) |
| Auth | Firebase ID token verification |
| Deploy | Railway (Nixpacks, Python provider) |

### Backend API routes
| Prefix | Responsibility |
|--------|---------------|
| `/users` | Profile creation & retrieval, score, badge, streak |
| `/survey` | Onboarding questionnaire → initial stability score |
| `/ai` | AI companion chat (Gemini), chat memory |
| `/missions` | Daily mission generation & completion verification |
| `/events` | Event participation & post-event reflection |
| `/friends` | Anonymous friend connections |
| `/matching` | User matching by interests & score |
| `/stability` | Stability log, score events, penalties |
| `/settings` | User settings |

---

## Project Structure

```
.
├── App.js                             # Root: auth gate, onboarding flow
├── app/                               # FastAPI backend
│   ├── main.py                        # App entry, router registration
│   ├── database.py                    # Firestore collection helpers
│   ├── schemas.py                     # Pydantic models, score constants
│   ├── dependencies.py                # Firebase token verification
│   ├── routers/                       # Route handlers (users, survey, ai, …)
│   └── services/                      # Business logic (AI, missions, stability…)
├── src/
│   ├── context/
│   │   ├── AuthContext.js             # Firebase auth state & profile
│   │   ├── DoThemeContext.js          # Accent colour + light/dark (persisted)
│   │   └── LanguageContext.js         # i18n: en / ko / ja (persisted)
│   ├── i18n/
│   │   └── translations.js            # 73 keys × 3 languages
│   ├── navigation/
│   │   └── AppNavigator.js            # Bottom tab navigator (translated)
│   ├── screens/
│   │   ├── DoLandingScreen.js         # First-launch welcome
│   │   ├── DoLoginScreen.js           # Email/password + Google auth
│   │   ├── DoOnboardingScreen.js      # 5-step onboarding incl. survey
│   │   ├── DoChatScreen.js            # AI companion chat
│   │   ├── DoMissionsScreen.js        # Daily missions
│   │   ├── DoGatheringsScreen.js      # Event discovery
│   │   ├── DoEventFeedbackScreen.js   # Post-event reflection chat
│   │   ├── DoFriendsScreen.js         # Anonymous connections
│   │   ├── DoFriendChatScreen.js      # User-to-user chat
│   │   └── DoProfileScreen.js         # Soul: settings, theme, language
│   ├── services/
│   │   ├── backendClient.js           # Authenticated fetch wrapper
│   │   ├── onboardingSurveyService.js # Backend profile + survey
│   │   ├── firebaseProfileService.js  # Firebase profile & preferences
│   │   ├── chatService.js             # AI chat API
│   │   ├── missionsService.js         # Missions API
│   │   ├── eventsService.js           # Events API
│   │   └── friendsService.js          # Friends API
│   ├── components/
│   │   └── DoAtoms.js                 # Shared UI components
│   └── theme/
│       └── doTheme.js                 # 10 mood palettes + light/dark surfaces
├── requirements.txt                   # Python dependencies
├── Procfile                           # Railway start command
├── nixpacks.toml                      # Railway Python build config
└── runtime.txt                        # Python 3.12
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.12
- A Firebase project with Authentication and Firestore enabled
- A Google Gemini API key
- Firebase Admin SDK service account JSON

### 1 — Clone and install

```bash
git clone https://github.com/fawwazyeke/team14_gdg.git
cd team14_gdg
npm install
```

### 2 — Environment variables

Create a `.env` file at the project root:

```env
# Firebase (Expo client SDK)
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Backend URL (local)
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000

# Backend server
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_SERVICE_ACCOUNT_FILE=serviceAccountKey.json
DEV_MODE=false
```

Place your Firebase Admin SDK service account JSON as `serviceAccountKey.json` in the project root (never commit this file).

### 3 — Run the backend

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`. Interactive API docs at `/docs`.

### 4 — Run the frontend

```bash
npx expo start
```

| Key | Platform |
|-----|----------|
| `w` | Web browser |
| `i` | iOS simulator |
| `a` | Android emulator |
| QR code | Expo Go on physical device |

---

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend | Vercel | Set all `EXPO_PUBLIC_*` env vars in the Vercel dashboard |
| Backend | Railway | Set `GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_FILE`, `DEV_MODE=false` |

The backend uses `nixpacks.toml` to explicitly select the Python provider and `Procfile` for the start command.

---

## Internationalisation

The app ships with full support for **English**, **Korean (한국어)**, and **Japanese (日本語)**, switchable from the Soul tab. The selected language is saved to the user's Firestore profile and restored on every login across devices.

To add a new language, add a matching key object to `src/i18n/translations.js` and a tile in `DoProfileScreen`.

---

## Ethics and Safety

Do operates in a psychologically sensitive space. The platform strictly prioritises:

- **Emotional safety** — no judgment, no pressure, no addictive engagement loops
- **Privacy** — user chats stay on-device; no public profiles
- **Healthy boundaries** — the AI explicitly guides users *toward* human connection, not away from it
- **Safety systems** — AI-assisted moderation, age verification (18+), risk detection, crisis escalation, and dependency monitoring
- **Gradual empowerment** — features unlock only as the user's real-world confidence grows

We believe loneliness **should not** and **cannot** be solved by replacing people with AI. Technology should help people regain confidence, rebuild routines, reconnect with others, and rediscover their place in the world.

**Do exists to help users slowly find their way back.**

---

## The Do Team

| Name | Role | University |
|------|------|-----------|
| **Omri Levin** | Team Lead & Frontend Developer | Waseda University |
| **Muhammad Fawwaz Haziq bin Helmi** | Project Manager & Frontend Developer | Korea University |
| **Seojin Han** | Backend Developer | Korea University |
| **Sungjin Im** | Backend Developer | Korea University |
| **Youngin Kim** | AI Developer | Yonsei University |

---

> 🚧 Built during a hackathon — actively developed and evolving.

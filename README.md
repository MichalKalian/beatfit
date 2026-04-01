# Beatfit 🏋️

**Competitive fitness tracking app for teams and friends — beat each other's daily workout scores.**

Beatfit lets groups of people log daily physical activities, compare performance using a weighted scoring system, and compete in leaderboards. Originally built as a workplace fitness challenge to replace a shared Excel spreadsheet — now a full multi-group PWA.

---

## Features

- **Workspaces** — isolated groups with unique access codes; members only see people in their own group
- **PIN authentication** — each player sets a personal PIN; no email or account required
- **8 tracked activities** — pull-ups, burpees, push-ups, squats, sit-ups, running (km), cycling (km), plank (seconds)
- **Weighted scoring** — activities scored by physical intensity so they can be meaningfully compared
- **Age coefficient** — scores adjusted by age to level the playing field
- **Leaderboards** — overall ranking + per-discipline winners, filterable by today / this week / all time
- **Streaks** — consecutive active days tracked and shown on login screen and leaderboard
- **Teams** — create sub-groups within a workspace; invite via shareable URL
- **Challenges / seasons** — time-limited competitions with start and end dates; global (admin) or per-team (any member)
- **Weekly goal** — personal weekly score target with a progress bar
- **Activity chart** — 14-day bar chart of personal activity
- **CSV export** — download full personal history
- **PWA** — installable on iPhone and Android as a home screen app, works offline for cached content
- **Admin panel** — manage workspaces, players, and scoring coefficients

---

## Scoring system

| Activity | Points per unit | Notes |
|---|---|---|
| Pull-ups | 8 pts / rep | Hardest compound movement |
| Burpees | 5 pts / rep | Cardio + strength combo |
| Push-ups | 2 pts / rep | Mid-intensity |
| Squats | 1.5 pts / rep | Lower intensity |
| Sit-ups | 1 pt / rep | Isolated movement |
| Running | 15 pts / km | High energy output |
| Cycling | 4 pts / km | ~3× less demanding than running |
| Plank | 0.05 pts / sec | 100 seconds = 5 points |

### Age coefficient

Scores are multiplied by an age factor to level the playing field:
- Age 30 → ×1.00 (baseline)
- Each year above 30 adds +1.5%
- Ages below 30 receive a slight downward adjustment (min ×0.85)

Coefficients are adjustable by the admin — changes apply retroactively to all historical data.

---

## How it works

### For players

1. **Get a group code** from the person who created your group (e.g. `WORK2025`)
2. Open the app URL and enter the group code
3. **Register** with your name, date of birth, and a PIN (min. 4 digits) — or select your name from the list and enter your PIN
4. Log your daily activities in the **Záznam** (Record) tab
5. Check the **Žebříček** (Leaderboard) tab to see how you rank
6. See your personal stats, chart, and history in the **Moje** (Mine) tab
7. Create or join **teams** within your group to compete in smaller sub-groups

### For the admin

1. Open the app and log in with the admin password
2. Go to **Skupiny** (Groups) to create a new workspace — give it a name and a unique code
3. Share the code with the people you want to invite
4. Use the **Hráči** (Players) tab to manage users: edit names, dates of birth, reset PINs, or delete accounts
5. Use the **Koeficienty** (Coefficients) tab to adjust scoring weights
6. Create global **challenges** (Výzvy) in the Leaderboard view to run time-limited competitions

### Inviting someone to a team

Inside a team, tap **Kopírovat** next to the invite link. The link includes both the team invite code and the workspace code — the recipient opens the link, sees the invite banner, logs in or registers, and is automatically added to the team.

---

## Tech stack

- **React** + **Vite**
- **Supabase** — PostgreSQL database + API
- **Vercel** — hosting and deployment
- **PWA** — `manifest.json` + service worker for home screen installation

---

## Database schema

```sql
workspaces   (id, name, code, created_at)
users        (id, name, dob, since, pin, workspace_id)
entries      (id, user_id, date, data jsonb)
goals        (user_id, weekly_goal)
teams        (id, name, created_by, invite_code, workspace_id)
team_members (team_id, user_id)
seasons      (id, name, start_date, end_date, created_by, team_id, scope, workspace_id)
settings     (key, value jsonb)
```

---

## Local development

```bash
git clone https://github.com/MichalKalian/beatfit.git
cd beatfit
npm install
```

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
VITE_ADMIN_PASSWORD=your-admin-password
```

```bash
npm run dev
```

---

## Deployment

The app is hosted on **Vercel**. Every push to `main` triggers an automatic deployment.

Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_ADMIN_PASSWORD`) are set in Vercel under **Settings → Environment Variables**.

---

## Roadmap

- [ ] Google / Apple login (Supabase Auth)
- [ ] Push notifications / email reminders
- [X] Row Level Security (Supabase RLS)
- [ ] Team admin role (per-workspace)
- [ ] Season archive with winners

---

## Origin

Started as a company Excel sheet tracking push-up counts between colleagues ("Klikař"), grew into a multi-sport tracker ("Buchtičky"), and eventually became Beatfit — built to scale beyond the office.
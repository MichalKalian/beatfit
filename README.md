# Beatfit 🏋️

**A competitive fitness tracking app for teams and friends — beat each other's daily workout scores.**

Beatfit lets you log daily physical activities, compares performance across teammates using a weighted scoring system, and tracks leaderboards by day, week, or all time. Originally built as a workplace fitness challenge to replace a shared Excel spreadsheet.

---

## Features

- **Multi-user** — each person registers with a name and date of birth, no account required
- **8 tracked activities** — pull-ups, burpees, push-ups, squats, sit-ups, running (km), cycling (km), plank (seconds)
- **Weighted scoring** — activities are scored by physical intensity so they can be meaningfully compared
- **Age coefficient** — scores are adjusted based on age, giving older participants a fair multiplier
- **Leaderboards** — overall ranking and per-discipline winners, filterable by today / this week / all time
- **Personal stats** — total score, active days, cumulative activity totals, full history
- **Shared persistent storage** — all data is shared in real time across all users

---

## Scoring System

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

### Age Coefficient

Scores are multiplied by an age factor to level the playing field:
- Age 30 → ×1.00 (baseline)
- Each year above 30 adds +1.5%
- Ages below 30 receive a slight downward adjustment (min ×0.85)

---

## Tech Stack

- **React** (Vite)
- **Persistent shared storage** via `window.storage` API (Claude artifact environment) — replace with Supabase or Firebase for production deployment

---

## Deployment

The app is designed to be hosted on **Vercel** (or any static hosting platform) with a backend database swap:

1. Replace `window.storage` calls with your preferred database (Supabase recommended)
2. Deploy to Vercel — colleagues access the app via a shared URL, no Vercel account needed

---

## Roadmap

- [ ] Team/department competitions
- [ ] Daily streaks
- [ ] Monthly personal goals
- [ ] Slack / email notifications
- [ ] Export to CSV

---

## Origin

Started as a company Excel sheet tracking push-up counts between colleagues ("Klikař"), grew into a multi-sport tracker ("Buchtičky"), and eventually became Beatfit — built to scale beyond the office.

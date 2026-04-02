# Beatfit 🏋️

**Competitive fitness tracking app for teams and friends — beat each other's daily workout scores.**

Beatfit lets groups of people log daily physical activities, compare performance using a weighted scoring system, and compete in leaderboards and time-limited challenges. Originally built as a workplace fitness challenge to replace a shared Excel spreadsheet — now a full multi-group PWA with personal stats, team competitions, and customizable scoring.

---

> 🇨🇿 [Česky](#-beatfit--česky) — český popis naleznete níže.

---

## Features

### Core
- **Workspaces** — isolated groups with unique access codes; members only see people in their own group
- **PIN authentication** — each player sets a personal PIN; no email or account required
- **17 tracked activities** — pull-ups, burpees, push-ups, squats, sit-ups, running, cycling, plank, steps, strength training, swimming, rowing, cardio; plus negative-scoring items (beer, wine, spirits)
- **Weighted scoring** — activities scored by physical intensity so they can be meaningfully compared
- **Age coefficient** — scores automatically adjusted by age to level the playing field

### Leaderboard
- **Global leaderboard** — overall ranking + per-discipline winners, filterable by today / this week / all time
- **Streaks** — consecutive active days tracked and highlighted (🔥 badge)
- **Progress race** — horizontal bar chart showing each player's progress relative to the leader
- **Score over time chart** — cumulative SVG line chart with interactive player highlighting; long periods auto-aggregate by week
- **Interactive highlighting** — click any player in the charts to dim others and focus on one person

### Personal stats (Moje)
- **Personal records** — best-ever value per activity with date
- **14-day activity bar chart** — visual overview of recent performance
- **Weekly goal** — personal score target with a progress bar
- **Activity totals** — all-time sums per activity
- **Entry history** — full list of past logged days
- **CSV export** — download complete personal history

### Teams
- **Teams** — create sub-groups within a workspace; invite via shareable URL
- **Team leaderboard** — separate scoring within each team
- **Team challenges / seasons** — time-limited competitions with start and end dates, created by any team member

### Challenges (Seasons)
- **Global challenges** — workspace-wide competitions created by the workspace admin
- **Team challenges** — per-team seasons created by any team member
- **Season status** — upcoming / active / finished with days remaining countdown
- **Season leaderboard** — separate ranking for the challenge period

### Preferences & customization
- **Activity filter** — choose which activities count toward the score (per group, per team)
- **Score limit (cap)** — set a daily / weekly / monthly point cap shown to other members; scales automatically for multi-day periods and seasons
- **Theme** — light / dark / system

### Administration
- **Workspace admin panel** — manage players (edit name/DOB, reset PIN, delete), adjust scoring coefficients per workspace
- **Workspace renaming** — admin can rename their group inline
- **Global admin** — manage all workspaces, create/delete groups, adjust global scoring coefficients

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
| Steps | 0.003 pts / step | 10 000 steps ≈ 30 points |
| Strength training | 1.5 pts / min | Weight / resistance sessions |
| Swimming | 12 pts / km | High effort in water |
| Rowing | 10 pts / km | Full-body effort |
| Cardio | 0.8 pts / min | General aerobic activity |
| Small beer (0.3 l) | −3 pts | Negative scoring |
| Large beer (0.5 l) | −5 pts | Negative scoring |
| Wine (2 dcl) | −6 pts | Negative scoring |
| Shot (spirits) | −8 pts | Negative scoring |

### Age coefficient

Scores are multiplied by an age factor to level the playing field:
- Age 30 → ×1.00 (baseline)
- Each year above 30 adds +1.5 %
- Ages below 30 receive a slight downward adjustment (min ×0.85)

Coefficients are adjustable by the workspace admin — changes apply retroactively to all historical data.

---

## How it works

### For players

1. **Get a group code** from the person who created your group (e.g. `WORK2025`)
2. Open the app URL and enter the group code
3. **Register** with your name, date of birth, and a PIN (min. 4 digits) — or select your name from the list and enter your PIN
4. Log your daily activities in the **Záznam** (Record) tab
5. Check the **Žebříček** (Leaderboard) tab to see how you rank and explore charts
6. See your personal stats, personal records, chart, and history in the **Moje** (Mine) tab
7. Create or join **teams** within your group to compete in smaller sub-groups
8. Customize which activities count toward your score and set a point cap in **Nastavení** (Settings)

### For the workspace admin

1. Log in to the app and open your workspace
2. Go to **Moje → Správa** to access the workspace admin panel
3. **Hráči** — edit player names and dates of birth, reset PINs, delete accounts
4. **Koeficienty** — adjust activity scoring weights for your workspace
5. Create global **challenges** (Výzvy) in the Leaderboard view to run time-limited competitions for the whole group

### For the global admin

1. Open the app and log in with the admin password
2. Go to **Skupiny** to create or delete workspaces
3. **Hráči** — manage all users across all workspaces
4. **Koeficienty** — adjust global default scoring weights

### Inviting someone to a team

Inside a team, tap **Kopírovat** next to the invite link. The link includes both the team invite code and the workspace code — the recipient opens the link, sees the invite banner, logs in or registers, and is automatically added to the team.

---

## Tech stack

- **React** + **Vite**
- **Supabase** — PostgreSQL database + REST/realtime API
- **Vercel** — hosting and automatic deployment on push to `main`
- **PWA** — `manifest.json` + service worker for home screen installation and offline support

---

## Database schema

```sql
workspaces   (id, name, code, created_at, created_by)
users        (id, name, dob, since, pin, workspace_id)
entries      (id, user_id, date, data jsonb)
goals        (user_id, weekly_goal)
teams        (id, name, created_by, invite_code, workspace_id)
team_members (team_id, user_id)
seasons      (id, name, start_date, end_date, created_by, team_id, scope, workspace_id)
settings     (key, value jsonb)
user_prefs   (user_id, workspace_id, team_id, prefs jsonb)
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

- [ ] Push notifications / reminders — alert when no activity logged by a set time
- [ ] Leaderboard change notifications — "X overtook you by 3 points"
- [ ] Achievement / badge system — streaks, milestones, first Top 3 finish
- [ ] Quick-log templates — one-tap repeat of last workout or saved custom templates
- [ ] Calendar heat map — monthly grid with colour-coded activity intensity
- [ ] Per-activity goals — e.g. "30 km of running per week" with a progress bar
- [ ] Emoji reactions on entries — lightweight social interaction within groups
- [ ] Personal score trend chart — 30 / 90-day cumulative chart in the Moje tab
- [ ] Weekly digest — Monday summary: last week's score, rank, best day, PRs hit
- [ ] Team milestones — multi-stage challenges with shared team progress
- [ ] Google / Apple login (Supabase Auth)
- [x] Leaderboard progress race + line chart
- [x] Interactive player highlighting in charts
- [x] Personal records (PRs) per activity
- [x] Score cap / limit visible to other members
- [x] Activity filter (per group / per team)
- [x] Dark / light / system theme
- [x] Workspace admin panel
- [x] Row Level Security (Supabase RLS)

---

## Origin

Started as a company Excel sheet tracking push-up counts between colleagues ("Klikař"), grew into a multi-sport tracker ("Buchtičky"), and eventually became Beatfit — built to scale beyond the office.

---

---

# 🇨🇿 Beatfit — česky

**Soutěžní sledování kondice pro týmy a přátele — překonejte navzájem svá denní skóre.**

Beatfit umožňuje skupinám lidí zaznamenávat denní fyzické aktivity, porovnávat výkonnost pomocí váženého bodovacího systému a soutěžit v žebříčcích a časově omezených výzvách. Původně vznikl jako firemní výzva nahrazující sdílený Excel — dnes je z toho plnohodnotná multiplatformní PWA s osobními statistikami, týmovými soutěžemi a přizpůsobitelným skórováním.

---

## Funkce

### Základní
- **Skupiny (workspaces)** — izolované skupiny s unikátním přístupovým kódem; členové vidí pouze lidi ve své skupině
- **PIN přihlášení** — každý hráč si nastaví vlastní PIN; není potřeba e-mail ani účet
- **17 sledovaných aktivit** — shyby, angličáky, kliky, dřepy, sed-lehy, běh, kolo, plank, kroky, silový trénink, plavání, veslování, kardio; plus aktivity se záporným skóre (pivo, víno, panák)
- **Vážené skórování** — aktivity jsou ohodnoceny podle fyzické náročnosti, aby bylo srovnání smysluplné
- **Věkový koeficient** — skóre se automaticky přizpůsobí věku pro vyrovnání podmínek

### Žebříček
- **Globální žebříček** — celkové pořadí + vítězové disciplín, filtrovatelné na dnes / týden / vše
- **Série (streak)** — po sobě jdoucí aktivní dny zvýrazněné odznakem 🔥
- **Progress race** — horizontální pruhový graf ukazující postup každého hráče vůči lídrovi
- **Graf skóre v čase** — kumulativní SVG čárový graf s interaktivním zvýrazňováním hráčů; delší období se automaticky agregují po týdnech
- **Interaktivní zvýraznění** — kliknutím na hráče v grafech ostatní ztlumíte a zaměříte se na jednoho

### Osobní statistiky (Moje)
- **Osobní rekordy** — nejlepší hodnota každé aktivity s datem dosažení
- **14denní sloupcový graf** — vizuální přehled nedávné aktivity
- **Týdenní cíl** — osobní bodový cíl s progress barem
- **Celkové součty aktivit** — celoživotní součty za každou aktivitu
- **Historie záznamů** — kompletní seznam zaznamenaných dní
- **Export CSV** — stažení celé osobní historie

### Týmy
- **Týmy** — podskupiny v rámci skupiny; pozvání přes sdílený odkaz
- **Týmový žebříček** — samostatné skórování v rámci každého týmu
- **Týmové výzvy / sezóny** — časově omezené soutěže, které může vytvořit kterýkoli člen týmu

### Výzvy (sezóny)
- **Globální výzvy** — výzvy pro celou skupinu, vytvářené správcem skupiny
- **Týmové výzvy** — per-tým sezóny od libovolného člena
- **Stav výzvy** — připravuje se / probíhá / ukončeno s odpočtem zbývajících dní
- **Žebříček výzvy** — samostatné pořadí za období výzvy

### Nastavení a přizpůsobení
- **Filtr aktivit** — výběr, které aktivity se počítají do skóre (zvlášť pro skupinu, zvlášť pro tým)
- **Limit bodů** — nastavení denního / týdenního / měsíčního stropu zobrazeného ostatním; automaticky se škáluje na vícedenní období a sezóny
- **Motiv** — světlý / tmavý / systémový

### Správa
- **Panel správce skupiny** — správa hráčů (úprava jména/data narození, reset PINu, smazání), úprava skórovacích koeficientů
- **Přejmenování skupiny** — správce může přejmenovat skupinu přímo v aplikaci
- **Globální admin** — správa všech skupin, vytváření/mazání skupin, úprava globálních koeficientů

---

## Bodovací systém

| Aktivita | Body za jednotku | Poznámka |
|---|---|---|
| Shyby | 8 b / ks | Nejtěžší komplexní pohyb |
| Angličáky | 5 b / ks | Kardio + síla |
| Kliky | 2 b / ks | Střední intenzita |
| Dřepy | 1,5 b / ks | Nižší intenzita |
| Sed-lehy | 1 b / ks | Izolovaný pohyb |
| Běh | 15 b / km | Vysoký výdej energie |
| Kolo | 4 b / km | ~3× méně náročné než běh |
| Plank | 0,05 b / s | 100 sekund = 5 bodů |
| Kroky | 0,003 b / krok | 10 000 kroků ≈ 30 bodů |
| Silový trénink | 1,5 b / min | Posilování / odpor |
| Plavání | 12 b / km | Vysoká námaha ve vodě |
| Veslování | 10 b / km | Celotelová námaha |
| Kardio | 0,8 b / min | Obecná aerobní aktivita |
| Malé pivo (0,3 l) | −3 b | Záporné skóre |
| Velké pivo (0,5 l) | −5 b | Záporné skóre |
| Víno (2 dcl) | −6 b | Záporné skóre |
| Panák (tvrdý) | −8 b | Záporné skóre |

### Věkový koeficient

Skóre se násobí věkovým koeficientem pro vyrovnání podmínek:
- Věk 30 → ×1,00 (výchozí)
- Každý rok nad 30 přidá +1,5 %
- Věk pod 30 dostane mírný pokles (min ×0,85)

Koeficienty může správce skupiny upravit — změny se projeví retroaktivně na všech historických datech.

---

## Jak to funguje

### Pro hráče

1. **Získejte kód skupiny** od osoby, která skupinu vytvořila (např. `PRACE2025`)
2. Otevřete URL aplikace a zadejte kód skupiny
3. **Registrujte se** — zadejte jméno, datum narození a PIN (min. 4 číslice); nebo vyberte své jméno ze seznamu a přihlaste se PINem
4. Zaznamenávejte denní aktivity v záložce **Záznam**
5. Sledujte žebříček a grafy v záložce **Žebříček**
6. Osobní rekordy, statistiky a historii najdete v záložce **Moje**
7. Vytvořte nebo se připojte k **týmu** v rámci skupiny pro soutěž v menší skupince
8. V **Nastavení** si přizpůsobte, které aktivity se počítají do skóre, a nastavte limit bodů

### Pro správce skupiny

1. Přihlaste se do aplikace a otevřete svou skupinu
2. Přejděte na **Moje → Správa** pro přístup do panelu správce
3. **Hráči** — upravte jméno a datum narození, resetujte PIN, smažte účet
4. **Koeficienty** — nastavte váhy aktivit pro svou skupinu
5. Vytvářejte globální **výzvy** v záložce Žebříček pro časově omezené soutěže celé skupiny

### Pro globálního admina

1. Otevřete aplikaci a přihlaste se admin heslem
2. V záložce **Skupiny** vytvářejte nebo mažte skupiny
3. **Hráči** — správa všech uživatelů napříč skupinami
4. **Koeficienty** — úprava globálních výchozích vah aktivit

### Pozvání do týmu

V detailu týmu klepněte na **Kopírovat** vedle odkazu. Odkaz obsahuje pozvánkový kód týmu i kód skupiny — příjemce odkaz otevře, uvidí pozvánku, přihlásí se nebo se registruje a je automaticky přidán do týmu.

---

## Technologie

- **React** + **Vite**
- **Supabase** — PostgreSQL databáze + REST/realtime API
- **Vercel** — hosting a automatické nasazení při push do `main`
- **PWA** — `manifest.json` + service worker pro instalaci na plochu a offline podporu

---

## Roadmap

- [ ] Push notifikace / připomínky — upozornění, pokud do nastaveného času nebyla zalogována žádná aktivita
- [ ] Oznámení změn v žebříčku — „X tě předběhl o 3 body"
- [ ] Systém achievementů / odznaků — série, milníky, první Top 3
- [ ] Šablony tréninku (Quick Log) — opakování posledního tréninku nebo uložené šablony jedním klepnutím
- [ ] Kalendářní heat mapa — měsíční mřížka s barevně kódovanou intenzitou aktivity
- [ ] Cíle pro jednotlivé aktivity — např. „30 km běhu za týden" s progress barem
- [ ] Emoji reakce na záznamy — nenáročná sociální interakce v rámci skupiny
- [ ] Osobní graf trendu skóre — 30/90denní kumulativní graf v záložce Moje
- [ ] Týdenní shrnutí — pondělní přehled: skóre za minulý týden, pořadí, nejlepší den, nové osobní rekordy
- [ ] Týmové milníky — vícefázové výzvy se sdíleným postupem celého týmu
- [ ] Přihlášení přes Google / Apple (Supabase Auth)
- [x] Progress race + čárový graf v žebříčku
- [x] Interaktivní zvýraznění hráčů v grafech
- [x] Osobní rekordy (PR) pro každou aktivitu
- [x] Limit / strop bodů viditelný ostatním
- [x] Filtr aktivit (pro skupinu / pro tým)
- [x] Světlý / tmavý / systémový motiv
- [x] Panel správce skupiny
- [x] Row Level Security (Supabase RLS)

---

## Původ

Začalo to jako firemní Excel sledující počty kliků mezi kolegy („Klikař"), přerostlo do multisportovního trackeru („Buchtičky") a nakonec se z toho stal Beatfit — navržený tak, aby přesáhl hranice kanceláře.

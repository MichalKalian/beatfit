# BeatFit Loader

Sjednocená sada 6 načítacích animací pro aplikaci BeatFit. Vše navržené na 340×720 stage, automaticky se škáluje na viewport. Sdílená paleta s ikonou aplikace (`#0d0d14` ink-navy + modrá/fialová/zelená).

## Instalace

Zkopírujte celý adresář `src/components/Loader/` do svého projektu. Žádné externí závislosti kromě Reactu.

## Základní použití

```jsx
import BeatFitLoader from '@/components/Loader';

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootstrap().then(() => setReady(true));
  }, []);

  if (!ready) return <BeatFitLoader variant="logoBuild" />;
  return <YourApp />;
}
```

## Mapování variant → příležitost

| Varianta | Kdy použít | Doporučené místo v aplikaci |
|---|---|---|
| **`logoBuild`** | App splash, první načtení, čekání na auth | `App.jsx` boot, po `supabase.auth.getSession()` |
| **`podium`** | Načítání žebříčku, výsledků soutěže | `<Leaderboard />`, `<CompetitionResults />` |
| **`rings`** | Sync aktivit, načítání dnešních výkonů | `<DailyStats />`, po pull-to-refresh |
| **`pulse`** | Živá aktivita, čekání na realtime data | `<LiveWorkout />`, čekání na Supabase realtime |
| **`cycler`** | Sčítání multi-disciplinárního skóre | Konec dne, závěrečné vyhodnocení |
| **`showdown`** | 1v1 duel, párování soupeřů | Před `<MatchScreen />`, „hledám soupeře" |

## API

```jsx
<BeatFitLoader
  variant="podium"         // logoBuild | podium | rings | pulse | cycler | showdown
  fullscreen={true}        // true = fixed overlay; false = vyplní rodiče
  caption="Skládáme žebříček"  // text dole nad progress barem
  players={[...]}          // jen pro podium/cycler — pole {id, name, color, soft}
  you={{...}} rival={{...}}// jen pro showdown
/>
```

Tokeny barev jsou v `tokens.js`:

```js
import { BF } from '@/components/Loader/tokens';

const players = [
  { id: 1, name: 'Anna',  color: BF.blue,   soft: BF.blueSoft   },
  { id: 2, name: 'Bára',  color: BF.purple, soft: BF.purpleSoft },
  { id: 3, name: 'Cyril', color: BF.green,  soft: BF.greenSoft  },
];
```

## Integrace s Supabase

```jsx
function Leaderboard({ competitionId }) {
  const [players, setPlayers] = useState(null);

  useEffect(() => {
    supabase
      .from('scores')
      .select('user_id, name, points')
      .eq('competition_id', competitionId)
      .order('points', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setPlayers(data.map((row, i) => ({
          id: row.user_id,
          name: row.name,
          color: [BF.blue, BF.purple, BF.green][i],
          soft:  [BF.blueSoft, BF.purpleSoft, BF.greenSoft][i],
        })));
      });
  }, [competitionId]);

  if (!players) return <BeatFitLoader variant="podium" />;
  return <LeaderboardList players={players} />;
}
```

## Sjednocení s PWA

V `public/manifest.json` použijte stejné barvy:

```json
{
  "name": "BeatFit",
  "short_name": "BeatFit",
  "background_color": "#0d0d14",
  "theme_color": "#38bdf8",
  "display": "standalone",
  "icons": [...]
}
```

A do `index.html`:

```html
<meta name="theme-color" content="#0d0d14" />
```

Tím sjednotíte statický PWA splash (OS-level) s naším React loaderem (in-app), oboje sdílí paletu ikony.

## Minimální doba zobrazení

Loader cyklus trvá ~4 s. Aby splash nebliknul, držte ho minimálně 1.5–2 s:

```jsx
useEffect(() => {
  const t0 = Date.now();
  bootstrap().then(() => {
    const elapsed = Date.now() - t0;
    const wait = Math.max(0, 1800 - elapsed);
    setTimeout(() => setReady(true), wait);
  });
}, []);
```

## Performance

- `useTime` hook automaticky pauzuje při `document.hidden` → šetří baterii na pozadí
- Žádné externí knihovny, vše čisté React + SVG
- Bundle ~7 kB gzipped pro celou sadu (po tree-shakingu jedné varianty ~2 kB)

## Struktura souborů

```
src/components/Loader/
├── index.jsx              ← <BeatFitLoader variant="..." />
├── LoaderShell.jsx        ← fullscreen container + scaling
├── tokens.js              ← BF palette + TEAM defaults
├── useTime.js             ← RAF hook + easing utils
├── atoms.jsx              ← BrandHeader, BottomCaption, HeadChip, MiniMark
├── variants/
│   ├── LogoBuild.jsx
│   ├── Podium.jsx
│   ├── Rings.jsx
│   ├── Pulse.jsx
│   ├── Cycler.jsx
│   └── Showdown.jsx
└── README.md (tento soubor)
```

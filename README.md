# næringsinnhold.no

Norsk matdatabase med næringsverdier. Next.js + Neon (Postgres).

---

## Oppsett (kun nettleser — ingen lokal installasjon)

### 1. Kjør schema i Neon
- Gå til [console.neon.tech](https://console.neon.tech)
- Velg prosjektet ditt → **SQL Editor**
- Lim inn innholdet fra `supabase/schema.sql` → klikk **Run**

### 2. Push til GitHub
- Opprett nytt repo på github.com
- Last opp alle filene (eller bruk GitHub Desktop)

### 3. Koble til Vercel
- Gå til [vercel.com](https://vercel.com) → **New Project** → velg GitHub-repo
- Under **Environment Variables**, legg til:
  - `DATABASE_URL` — connection string fra Neon (med passord!)
  - `SYNC_SECRET` — finn på et tilfeldig passord, f.eks. `mittHemmeligeOrd123`
- Klikk **Deploy**

### 4. Kjør første datasynkronisering
Etter deploy, åpne i nettleseren:
```
https://naeringsinnhold.no/api/sync?secret=mittHemmeligeOrd123
```
Dette tar 2–5 minutter og fyller databasen med ~1 800 matvarer.
Du ser `{"ok":true,"foods_synced":1800}` når det er ferdig.

> ⚠️ Vercel Hobby-plan har maks 60 sekunder per funksjon. Hvis sync timer ut,
> må du kjøre den på Vercel Pro (300s) eller bruke et eksternt cron-verktøy
> som [cron-job.org](https://cron-job.org) til å kalle endepunktet.

### 5. Automatisk synkronisering
`vercel.json` er satt opp til å kjøre sync automatisk 1. november hvert år
(etter Matvaretabellens årlige oppdatering). Husk å oppdatere secret-en i vercel.json.

---

## Fremtidig kobling til oppskrift-på.no

- `foods.id` og `foods.slug` — stabil referanse fra oppskriftstabeller
- `food_nutrients` — beregn totalt næringsinnhold per porsjon
- `foods.barcode` — kobling til spesifikke butikkprodukter

---

## Datakilder

| Kilde | Status | Antall |
|---|---|---|
| Matvaretabellen (Mattilsynet/UiO) | ✅ | ~1 800 |
| Open Food Facts | 🔜 Planlagt | 100 000+ |
| Kassal.app (strekkoder) | 🔜 Planlagt | Norske butikkprodukter |

Data fra Matvaretabellen er lisensiert under [NLOD](https://data.norge.no/nlod/no).
Oppgi **Matvaretabellen (Mattilsynet/UiO)** som kilde.

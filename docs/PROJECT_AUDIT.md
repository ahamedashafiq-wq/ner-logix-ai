# NER-LOGIX AI — Project Audit

**Problem ID:** SIH26002  
**Product:** NER-LOGIX AI Command Center  
**Audit date:** 23 August 2026  
**Scope:** Inspection only. No features implemented. No UI redesign. No packages added.

---

## 1. Executive summary

The repository is a working **Next.js 16 (App Router) + React 19** command-center prototype. README links it to **v0.app**; the local clone was installed with npm and is serving `http://localhost:3000` (`GET /` 200).

It already presents a dark operations dashboard for the **eight North Eastern states**, with mock fleet, incidents, alerts, charts, emergency mode, and a **CSS/SVG map** (not a GIS engine).

The TypeScript domain model and service stubs describe a much larger SIH product (auth roles, GIS map API, route optimization, image detection, field reports, predictions, supplies). **Those stubs are not wired into the UI.** There is **no database, no Next.js API routes, no real GIS library, and no login screen**.

Official SIH 2026 problem text for **SIH26002** was not found in public indexes at audit time (SIH 2026 launched 21 Aug 2026). Missing-feature analysis below is based on this repo’s own types/services, MoDONER/NER logistics + disaster-accessibility intent, and gaps versus the current UI.

---

## 2. Current architecture

```
Browser
  └── app/page.tsx  (single route "/")
        └── components/ner-logix-app.tsx  (client SPA)
              ├── local React state (active nav, drawers, emergency, simulation)
              └── direct imports from mock/data.ts
                    └── types/index.ts

Unused (not imported by UI):
  services/index.ts  →  mock/data.ts  (and env API_URL, unused)

Not present:
  app/api/**, Prisma/Supabase/Firebase, Leaflet/MapLibre, auth session
```

**Pattern:** One client component is the entire product. Next.js is used as a host, not as a routed app. Data is static in-memory mock arrays. Services look like an intended API layer but are dead code.

**Config notes:**

- `next.config.mjs` sets `typescript.ignoreBuildErrors: true` and `images.unoptimized: true`.
- `package.json` name is still `my-project`.
- Dual lockfiles: `package-lock.json` and `pnpm-lock.yaml`.
- Dev server warning: Next.js ignored a `package-lock.json` **outside** the repo (`C:\Users\akbar`) and suggested `turbopack.root` in Next config.

---

## 3. Technology stack

| Layer | Actual |
| --- | --- |
| Framework | Next.js **16.3.0** (Turbopack), App Router |
| UI | React **19**, `'use client'` SPA |
| Language | TypeScript 5.7.3 (`strict: true`) |
| Styling | Tailwind CSS **4**, custom CSS in `app/globals.css`, shadcn/base-nova tokens |
| Icons | lucide-react |
| Charts | recharts 3 |
| UI kit | `@base-ui/react` + shadcn `Button` (unused by the app) |
| Analytics | `@vercel/analytics` (production only) |
| Map / GIS | None (CSS + SVG paths) |
| Backend | None |
| Database | None |
| Auth | None (hardcoded profile) |
| AI/ML | Simulated labels only (`isSimulated: true` in image stub) |
| Deploy origin | GitHub `ahamedashafiq-wq/ner-logix-ai`; README also points at v0 project `prj_mtlM7l3gaDD6H1rsSW7SQ9AfFe1n` |

---

## 4. Important files

| Path | Role |
| --- | --- |
| `app/layout.tsx` | Root layout, metadata, dark viewport, Vercel Analytics |
| `app/page.tsx` | Renders `NerLogixApp` |
| `app/globals.css` | Almost all visual design (do not rewrite) |
| `components/ner-logix-app.tsx` | Dashboard, map, modules, drawers, simulation, demo sequence |
| `components/ui/button.tsx` | Unused shadcn button |
| `lib/utils.ts` | `cn()` helper (only used by unused Button) |
| `mock/data.ts` | Districts, vehicles, deliveries, incidents, alerts, warehouses, supplies, predictions, roads, KPIs, chart series |
| `services/index.ts` | Stub services returning mock data |
| `types/index.ts` | Domain types (users, GIS, logistics, AI results) |
| `package.json` / lockfiles | Dependencies |
| `next.config.mjs` | Build/image TypeScript settings |
| `public/icon.svg` | Favicon/brand asset |

---

## 5. Frontend framework, pages, routing

### 5.1 Framework

Next.js App Router with a **single page**. No `loading.tsx`, `error.tsx`, or nested routes.

### 5.2 Existing “pages” (in-app views, not URL routes)

Sidebar `navItems` in `ner-logix-app.tsx`:

1. Dashboard  
2. Live Map  
3. Vehicles  
4. Deliveries  
5. Routes  
6. Incidents  
7. Predictions  
8. Supplies  
9. Warehouses  
10. Analytics  
11. Field Reports  
12. Settings  

**URL routing:** only `/`. Navigation is `useState('Dashboard')`. No `next/link`, no `useRouter`, no query params, no deep links.

**View mapping:**

| Nav | What actually renders |
| --- | --- |
| Dashboard | Full dashboard: KPIs, map, alerts, charts, health score |
| Live Map | **Same layout as Dashboard** (not a dedicated map page) |
| Vehicles | Generic `ModuleView` table of `vehicles` |
| Deliveries | Generic `ModuleView` but **reuses vehicle records** with fake `DEL-1xxx` IDs (ignores `deliveries` mock) |
| Incidents | Generic table of `incidents` |
| Field Reports | Same incident table (no `FieldReport` data) |
| Routes, Predictions, Supplies, Warehouses, Analytics, Settings | Same generic table **fed with `incidents`** (wrong dataset) |

---

## 6. Existing components

All live UI lives in **one file** (`components/ner-logix-app.tsx`):

- `NerLogixApp` — shell, sidebar, topbar, emergency banner, demo, toasts  
- `RegionMap` — decorative NER map  
- `KpiCard`, `SectionHeading`, `StatusPill`, `AlertRow`, `HealthScore`  
- `ModuleView` — generic search + table for non-dashboard nav  
- Vehicle and incident **detail drawers**  
- **Simulation modal** (flood / landslide / rain / closure)  
- Demo sequence (`Start demo`) with timed toasts  

**Not extracted:** login, role dashboards, GIS map, forms, image upload, warehouse/supply/prediction/analytics screens.

`components/ui/button.tsx` is scaffolding and is unused.

---

## 7. Services

`services/index.ts` (async stubs; **UI does not call them**):

| Service | Behaviour |
| --- | --- |
| `authService.login` | Returns hardcoded admin `Aarav Sharma`; password ignored |
| `vehicleService` | list / get from mock |
| `deliveryService` | list + create (in-memory only, not persisted) |
| `routeOptimizationService.optimize` | Returns static `routeCandidates` |
| `incidentService` | list + create stub |
| `predictionService` | mock predictions |
| `alertService` | mock alerts |
| `supplyService` | mock supplies |
| `mapService` | `apiUrl` from `NEXT_PUBLIC_API_URL` / `VITE_API_URL`; `getRegionData` returns districts |
| `simulationService.run` | Hardcoded disruption result |
| `imageDetectionService.analyze` | Simulated landslide detection (`isSimulated: true`) |

`API_URL` is read but never used for `fetch`.

---

## 8. Mock data

`mock/data.ts` includes:

- **8 districts** (one hub city per NER state, plus Tawang) with lat/lng  
- **24 vehicles** (generated), mixed status/risk  
- **18 deliveries**  
- **5 incidents** (landslide, flood, rain, road damage, debris)  
- **4 alerts**  
- **3 warehouses**, **4 supplies**  
- **3 risk predictions**, **3 route candidates**, **3 roads**  
- `logisticsHealth`, `deliveryTrend`, `riskTrend`, `stateIncidents`  
- `kpis` (display strings; **not derived** from arrays)  
- `demoUser`, `mapStates`, `getDemoData()`  

**Issues:** KPI “247 vehicles” vs 24 mock vehicles; “18 incidents” vs 5 records; `mapStates`, `predictions`, `supplies` imported in the app but unused; `Prediction` imported from `@/types` (does not exist); `roads` uses `Road` without importing the type.

---

## 9. GIS / map status

**Status: decorative prototype, not GIS.**

`RegionMap`:

- Grid + fake water ellipses + three SVG polylines as “roads”  
- District labels placed with **modulo percentages**, not lat/lng  
- Vehicle/incident/warehouse markers similarly **not georeferenced**  
- Search, Layers, state filter, zoom, locate — **non-functional**  
- Simulation toggles one path from orange to red  
- Live GPS badge is hardcoded **247**

No Leaflet, MapLibre, Google Maps, GeoJSON, OSM, DEM, or satellite layers. `Vehicle.currentLocation` and `Incident.lat/lng` exist in data but are unused on the map.

---

## 10. API status

| Item | Status |
| --- | --- |
| Next.js Route Handlers (`app/api`) | **None** |
| External REST/GraphQL | **None** |
| Weather / IMD / satellite | **None** |
| GPS / telematics | **None** |
| Image inference endpoint | Stub only |
| Env-based backend URL | Declared, unused |

---

## 11. Database status

| Item | Status |
| --- | --- |
| Prisma / Drizzle / SQL | **None** |
| Supabase / Firebase / Mongo | **None** |
| Persistence | **None** (refresh resets everything) |
| Offline store (IndexedDB) | Typed as `FieldReport.synced` / `AppState.offlineMode` only |

---

## 12. Authentication

| Item | Status |
| --- | --- |
| Login / logout UI | **None** |
| Session / JWT / cookies | **None** |
| Role enforcement | Types only: `admin`, `logistics_manager`, `field_officer`, `driver` |
| UI identity | Hardcoded “Aarav Sharma / System Administrator” |
| `authService` | Unused stub |

---

## 13. TypeScript types

`types/index.ts` is the strongest part of the codebase. It already models:

- Users and `AppState` (emergency, demo, offline, lastSync)  
- District, Road, Warehouse, Vehicle, Delivery, Route, RouteCandidate  
- Incident, Alert, Supply, RiskPrediction, FieldReport  
- ImageDetectionResult, LogisticsHealth  

**tsc --noEmit (23 Aug 2026) failed** with:

1. `mock/data.ts`: `Prediction` not exported from `@/types`  
2. `mock/data.ts`: generated `deliveries[].status` inferred as `string`  
3. `mock/data.ts`: `Road` not imported  
4. `ner-logix-app.tsx` `ModuleView`: union `Vehicle | Incident` property access (`severity` / `riskLevel`)

Production builds can still succeed because `ignoreBuildErrors: true`.

---

## 14. Dependencies

**Used by the running UI:** next, react, react-dom, lucide-react, recharts, tailwindcss, tw-animate-css.

**Present but unused in product UI:** `@base-ui/react`, class-variance-authority, clsx, tailwind-merge, shadcn CLI package, `@vercel/analytics` (prod only).

**Not installed (and should not be added until a later phase):** leaflet/maplibre, auth libraries, ORM, AI SDKs, GPS libraries.

**Recharts unused imports in the app:** `Bar`, `BarChart`, `Cell`, `Pie`, `PieChart`.  
**Lucide unused imports:** `CircleHelp`, `UserRound`.

---

## 15. Current features (what works in the demo)

- Dark command-center shell with sidebar + responsive mobile drawer  
- Dashboard KPIs, alert list, delivery throughput chart, risk chart, logistics health ring  
- Decorative live map with clickable vehicles/incidents  
- Vehicle and incident detail drawers  
- Emergency mode banner and styling  
- Start-demo toast sequence + simulation modal  
- Quick actions (simulate, jump to modules)  
- Generic list UI for some modules  
- Toast notifications for most buttons  
- Type-level domain for a full SIH product  

---

## 16. Missing SIH26002 features

Inferred from domain types/services and NER logistics/accessibility problem space. Confirm against the official SIH26002 PDF when available.

### Product / domain

1. **Real GIS** — georeferenced NER road network, accessibility colouring from data, true lat/lng markers  
2. **Live GPS / fleet tracking** — updating positions, not static CSS  
3. **Hazard-aware routing** — use `routeCandidates` + blocked roads; show recommended vs high-risk routes  
4. **Delivery workflow** — create/assign/track using real `Delivery` objects (pickup, priority, reroute, delivered)  
5. **Incident verification pipeline** — new → verified → active → resolved, with affected vehicles/roads  
6. **Image-based disruption detection** — upload UI calling `imageDetectionService` (later: real model)  
7. **Field officer reports** — GPS, photo, severity, **offline queue + sync**  
8. **Risk predictions UI** — flood/landslide/traffic probabilities per corridor  
9. **Warehouse and supply intelligence** — stock vs threshold, shortage alerts  
10. **Analytics** — use `stateIncidents` / trends; currently empty module  
11. **Role-based apps** — admin vs logistics manager vs field officer vs driver  
12. **Authentication and audit trail**  
13. **Weather / rainfall / river-level inputs** (even mocked-then-API)  
14. **Settings** — demo/offline toggles already in `AppState` but unused  
15. **Multilingual / low-connectivity field UX** (typical NER government PS)  
16. **Dedicated Live Map page** distinct from Dashboard  

### Platform

17. Next.js routes / deep links per module  
18. `app/api` or external backend  
19. Database persistence  
20. Wiring UI → `services/*` instead of direct mock imports  
21. Real-time channel (WebSocket/SSE) for alerts  
22. Tests, lint script, CI  

---

## 17. Problems found

### Architecture

- Monolithic client file; modules are placeholders.  
- Services unused; two data access styles will diverge.  
- SPA inside App Router: no URLs, no SSR of operational data.  
- Mix of Vite-style `VITE_API_URL` and Next `NEXT_PUBLIC_API_URL`.  

### Correctness / demo honesty

- Live Map = Dashboard.  
- Deliveries table is vehicles in disguise.  
- Routes / Predictions / Supplies / Warehouses / Analytics / Settings show **incident** rows.  
- KPI numbers do not match mock arrays.  
- Clocks/dates hardcoded (`14:32:18`, `04:32:18 UTC`).  
- Map markers ignore coordinates.  
- Search, filters, export, zoom, layers do not work.  
- `startDemo` does not create deliveries or persist reroutes.  

### Quality

- TypeScript errors hidden by Next config.  
- `ignoreBuildErrors` masks CI risk.  
- Dual package managers (npm + pnpm lockfile).  
- Parent-directory lockfile Turbopack warning.  
- Package name `my-project`.  
- README still generic v0 bootstrap text.  

### Security / ops (when APIs are added)

- Stub login accepts any password.  
- No auth on future APIs.  

---

## 18. Data flow (as implemented)

```
mock/data.ts  ──import──►  NerLogixApp (useState)
                              ├── Dashboard/Live Map widgets
                              └── ModuleView (partial / wrong datasets)

User clicks  ──►  local state (drawers, emergency, simulation, toast)
              ──►  no network, no persistence
```

**Intended (from stubs, not built):**

```
UI → services/* → (API_URL) backend → DB / GIS / ML
                ↘ fallback mock
```

---

## 19. Recommended development order

Do **not** redesign CSS or replace the shell. Extend behind the existing UI.

1. **Stabilize types and mock data**  
   Fix `Road` / `Prediction` / `DeliveryStatus` / `ModuleView` unions. Keep `ignoreBuildErrors` until tsc is clean, then turn it off.

2. **Connect UI to existing services**  
   Load vehicles, deliveries, incidents, alerts via `services/index.ts` without changing look.

3. **Make each nav module use the right mock dataset**  
   Preserve `ModuleView` styling; point Deliveries at `deliveries`, Supplies at `supplies`, etc. Give Live Map a map-first layout using the same `RegionMap`.

4. **Wire demo + simulation to state**  
   Demo should update alerts, road colour, and a few vehicle statuses from existing mocks/services.

5. **Minimal auth (demo)**  
   Login screen using `authService`; still mock users; gate later.

6. **GIS replacement inside `RegionMap` only**  
   Swap CSS map for OSM/Leaflet (or similar) **without** restyling the chrome. Plot real lat/lng. Add this package only in this phase.

7. **API + database**  
   Next Route Handlers or a small backend; persist incidents/deliveries; keep mock fallback for jury demo.

8. **Field reports + offline**  
   Form + photo + `synced` flag; local queue.

9. **Image detection + predictions**  
   UI first with simulated service; then real model/API.

10. **Role views and live updates**  
    Driver/field vs command center; optional SSE.

---

## 20. Constraints for later work

- Do not redesign the UI.  
- Do not delete working dashboard/demo/emergency/simulation.  
- Do not rewrite the project.  
- Do not install packages until a phase explicitly needs them (GIS, DB, auth).  

---

## 21. Audit snapshot

| Check | Result |
| --- | --- |
| Dev server | Running (`next dev`, Next 16.3.0, `/` 200) |
| `tsc --noEmit` | Fail (4 error groups) |
| Production-ready backend | No |
| SIH domain coverage in types | High |
| SIH domain coverage in working UI | Dashboard demo only |

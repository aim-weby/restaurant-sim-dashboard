# BP - Tech.docx

_Source: BP - Tech.docx_

Níže máš **kompletní technickou dokumentaci / návrh BP-MVP** jako podklad pro vývoj. Je to psané tak, aby sis podle toho mohl:
- založit repo,
- navrhnout DB,
- napsat backend (FastAPI),
- napsat simulační engine (SimPy),
- napsat frontend (React/TS),
- napojit AI,
- a mít jasné testovací scénáře.
Rozsah je **BP-MVP** (realistický na implementaci), ale návrh je udělaný tak, aby šel později rozšířit směrem k “velké vizi”.

**1) Cíl systému (BP-MVP)**
Systém umožní:
- **zadat/importovat** data za 1 týden (baseline),
- spočítat **reálné KPI** a zobrazit je v dashboardu,
- vytvořit **scénář** (dočasné změny vstupů),
- spustit **simulaci (DES, teorie front)** pro baseline i scénáře a porovnat výsledky,
- integrovat **AI asistenta** pro vysvětlení výsledků a návrhy scénářů (včetně generování scénáře jako JSON).

**2) High-level architektura**
**2.1 Komponenty**
**Frontend (React + TS)**
- Setup & Data Input
- Dashboard (Real KPI)
- Scenario Builder
- Simulation Results
- AI Panel (komponenta napříč obrazovkami)
**Backend API (FastAPI)**
- CRUD pro nastavení, baseline, scénáře
- Spuštění simulace + ukládání výsledků
- Agregace KPI
- AI endpointy (explain/suggest/build-scenario)
**Simulační modul (Python)**
- Discrete-event simulation (SimPy)
- Runner pro opakované běhy (seed)
- Sběr metrik a agregace percentilů
**Databáze**
- Pro BP klidně SQLite (rychlý start)
- Doporučeno PostgreSQL (pokud chceš “jako produkční”)
**Job queue (volitelné v BP)**
- Pokud simulace trvá dlouho: RQ/Celery + Redis
- V BP to lze udělat synchronně (do pár sekund) nebo “pseudo-async” (polling)

**3) Datový model (BP-MVP)**
Minimalistický, ale rozšiřitelný. Držíme se týdenní šablony + dayparts.
**3.1 Entity přehled**
- venue_settings – nastavení provozu (stoly, měna, otevírací doba, dayparts)
- baseline_week – jeden baseline týden (vstupy)
- baseline_daypart_data – poptávka + průměrná útrata po daypartech
- staffing_plan – staff v daypartech + sazby
- cost_settings – fixní náklady + food cost %
- simulation_params – triangular časy, balking threshold, elasticity
- scenarios – scénáře s overrides
- simulation_runs – jednotlivé běhy
- simulation_summary – agregované výsledky (mean/median/p10/p90)
- ai_logs – log promptů a odpovědí (pro BP stačí základ)
**3.2 Tabulky (SQL struktura – popis polí)**
**venue_settings**
- id (PK)
- name (text)
- timezone (text, default Europe/Prague)
- currency (text, např. CZK)
- tables_count (int) *(pro BP může být i “seats_total” místo stolů)*
- seats_total (int)
- mode (enum: dinein, delivery_only) *(BP: dinein default)*
- created_at
**opening_hours**
- id (PK)
- venue_id (FK)
- weekday (0–6)
- open_time (HH:MM)
- close_time (HH:MM)
**dayparts**
- id (PK)
- venue_id (FK)
- name (text, např. “Oběd”)
- start_time (HH:MM)
- end_time (HH:MM)
**baseline_week**
- id (PK)
- venue_id (FK)
- week_start (date) *(pondělí)*
- label (text, např. “Měření – týden 1”)
- created_at
**baseline_daypart_data**
Agregovaná poptávka (skupiny) a útrata:
- id (PK)
- baseline_week_id (FK)
- weekday (0–6)
- daypart_id (FK)
- arrivals_groups (int) *(počet skupin)*
- avg_party_size (float, optional; default 2.0)
- avg_spend_per_group (float)
Alternativa: místo avg_spend_per_group použít avg_spend_per_person a pak revenue = party_size × spend.
**staffing_plan**
- id (PK)
- baseline_week_id (FK)
- weekday (0–6)
- daypart_id (FK)
- role (enum: kitchen, service) *(BP stačí 2 role)*
- staff_count (int)
- hourly_rate (float)
- hours_in_daypart (float) *(lze dopočítat z daypart délky, ale je lepší mít explicitně)*
**cost_settings**
- id (PK)
- baseline_week_id (FK)
- fixed_cost_week (float) *(fixní náklady přepočtené na týden)*
- food_cost_pct (float, 0–1, optional; default např. 0.3)
**simulation_params**
- id (PK)
- baseline_week_id (FK)
- prep_time_min (float, minutes)
- prep_time_mode (float, minutes)
- prep_time_max (float, minutes)
- seat_time_min (float, minutes)
- seat_time_mode (float, minutes)
- seat_time_max (float, minutes)
- balking_wait_table_limit (float, minutes, optional; default 0 = nevypínat)
- balking_wait_food_limit (float, minutes, optional)
- alpha_seat_wait (float) *(korelace: seat_time = base + alpha * kitchen_wait; default 0–0.3)*
- price_elasticity (float, default např. -1.2)
- demand_noise_pct (float, default 0.2) *(±20% variabilita)*
**scenarios**
- id (PK)
- baseline_week_id (FK)
- name (text)
- description (text)
- overrides_json (JSON) *(viz schéma níže)*
- created_at
**simulation_jobs**
- id (PK)
- scenario_id (FK, nullable; pokud null = baseline)
- runs (int, default 200)
- status (queued/running/done/failed)
- started_at, finished_at
- error_message (text, nullable)
**simulation_runs**
- id (PK)
- simulation_job_id (FK)
- run_index (int)
- seed (int)
- metrics_json (JSON) *(raw metriky běhu)*
**simulation_summary**
- id (PK)
- simulation_job_id (FK)
- summary_json (JSON) *(mean/median/p10/p90 pro každou metriku)*
**ai_logs**** (BP verze jednoduchá)**
- id (PK)
- baseline_week_id (FK)
- scenario_id (FK nullable)
- context (enum: dashboard/simulation/scenario_builder)
- request_type (explain/suggest/build_scenario)
- input_json (JSON)
- output_text (text)
- created_at

**4) Schémata dat: baseline, scénáře, výstupy**
**4.1 JSON schéma scénářů (****overrides_json****)**
Scénář je sada změn, které se aplikují na baseline před simulací.
**overrides_json**** – návrh**
{
  "staffing_changes": [
    {
      "weekday": 5,
      "daypart_id": 2,
      "role": "kitchen",
      "delta_staff": 1
    }
  ],
  "price_change": {
    "type": "percent",
    "value": 0.08
  },
  "opening_hours_changes": [
    {
      "weekday": 4,
      "open_time": "11:00",
      "close_time": "23:00"
    }
  ],
  "capacity_changes": {
    "tables_count": 2,
    "seats_total": 8
  }
}
**Pravidla:**
- staffing_changes.delta_staff může být záporné.
- price_change v BP ovlivňuje poptávku přes elasticitu (viz model).
- opening_hours_changes pro BP může jen ovlivnit “délku daypartu” (nebo ignorovat, pokud nechceš přepočítávat dayparts; jednodušší je otevírací dobu pro BP držet konstantní a mít to jako rozšíření).
- capacity_changes upraví kapacitu stolů/míst pro simulaci.
**4.2 Výstupy z běhu (****metrics_json****)**
{
  "revenue": 123456.0,
  "profit": 23456.0,
  "served_groups": 320,
  "lost_groups": 15,
  "avg_wait_table": 4.2,
  "p90_wait_table": 12.5,
  "avg_wait_food": 10.1,
  "p90_wait_food": 22.0,
  "util_tables": 0.76,
  "util_kitchen": 0.88,
  "util_service": 0.64
}
**4.3 Shrnutí (****summary_json****)**
{
  "revenue": {"mean": 120000, "median": 119500, "p10": 103000, "p90": 138000},
  "profit": {"mean": 21000, "median": 20500, "p10": -2000, "p90": 42000},
  "avg_wait_food": {"mean": 11.2, "median": 10.9, "p10": 7.0, "p90": 16.8}
}

**5) Simulační model (technická specifikace)**
**5.1 Volba modelu**
**Discrete-Event Simulation (DES)** v SimPy.
**Proč DES (v BP)**
- přirozeně modeluje fronty a kapacity,
- sedí na teorii front,
- snadno se vysvětluje a testuje,
- dává metriky jako waiting time a utilization.
**5.2 Modelované zdroje**
- **Tables**: kapacita = seats_total nebo tables_count (doporučuju seats_total jako kapacitu, je to jednodušší)
- **Kitchen**: kapacita = staff_count(kitchen) aktuálního daypartu
- **Service**: kapacita = staff_count(service) (volitelné, ale doporučuji zahrnout – i kdyby service time byl malý)
**5.3 Generování příchodů**
Pro každý den a daypart:
- baseline má arrivals_groups za celý daypart.
- Simulace vytvoří příchody jako Poisson proces:
  - intervaly ~ exponenciální s parametrem λ = arrivals / duration_minutes
**Demand noise**
- Na začátku daypartu uprav arrivals_groups:
  - arrivals' = arrivals * (1 + Uniform(-noise, +noise))
- pokud aplikuješ cenu:
  - arrivals'' = arrivals' * (1 + elasticity * price_delta)
  - price_delta pro +8% = 0.08
  - ořízni na min 0
V BP je to zjednodušení, ale obhajitelné.
**5.4 Časy (triangular)**
- prep_time ~ Triangular(min, mode, max)
- seat_base_time ~ Triangular(min, mode, max)
**Jednoduchá korelace wait → seat_time**
Aby bylo vidět provázání “kuchyň nestíhá → hosté sedí déle”:
- zaznamenej kitchen_wait (od objednávky do start prep nebo do vydání)
- seat_time = seat_base_time + alpha_seat_wait * kitchen_wait
- alpha je v simulation_params
Tohle je jednoduchý, ale velmi praktický “most” k tématu korelací.
**5.5 Balking (odmítnutí zákazníka)**
Volitelné, ale pro BP přínosné:
- pokud wait_table > balking_wait_table_limit → zákazník odejde
- pokud wait_food > balking_wait_food_limit → (můžeš modelovat stížnost / ztrátu) pro BP stačí “lost group” nebo penalizace revenue
**5.6 Revenue a profit**
Pro každou obslouženou skupinu:
- revenue += avg_spend_per_group (případně * party_size)
COGS:
- cogs = revenue * food_cost_pct
Labor:
- labor_cost = sum přes dayparts (staff_count * hourly_rate * hours_in_daypart)
Fixed:
- fixed_cost_week
Profit:
- profit = revenue - cogs - labor_cost - fixed_cost_week
**5.7 Utilization**
SimPy umožní sbírat:
- využití zdrojů (kitchen/service/tables) přes “busy time / available time”
Zjednodušeně:
- util_kitchen = total_kitchen_busy_minutes / (kitchen_capacity_minutes)
kde capacity_minutes = sum(daypart_duration * staff_count)

**6) API návrh (FastAPI)**
**6.1 Zásady API**
- JSON request/response
- jednoduchý error model: { "error": "message" }
- ID jako integer/uuid (pro BP klidně integer)
**6.2 Endpointy – Setup a baseline**
**Venue**
- GET /venue
- POST /venue (create settings)
- PUT /venue (update settings)
**Dayparts**
- GET /dayparts
- POST /dayparts
- PUT /dayparts/{id}
- DELETE /dayparts/{id}
**Opening hours**
- GET /opening-hours
- PUT /opening-hours (bulk update)
**Baseline week**
- POST /baseline-weeks
- GET /baseline-weeks
- GET /baseline-weeks/{id}
- PUT /baseline-weeks/{id}
**Baseline daypart data (bulk)**
- PUT /baseline-weeks/{id}/daypart-data
  - body: list rows pro weekday/daypart
**Staffing plan (bulk)**
- PUT /baseline-weeks/{id}/staffing
  - body: list rows
**Cost settings**
- PUT /baseline-weeks/{id}/costs
**Simulation params**
- PUT /baseline-weeks/{id}/sim-params
**6.3 Scénáře**
- POST /baseline-weeks/{id}/scenarios
- GET /baseline-weeks/{id}/scenarios
- GET /scenarios/{scenario_id}
- PUT /scenarios/{scenario_id} (update overrides)
- DELETE /scenarios/{scenario_id}
**6.4 Simulace**
Spuštění baseline:
- POST /baseline-weeks/{id}/simulate?runs=200
Spuštění scénáře:
- POST /scenarios/{scenario_id}/simulate?runs=200
Stav a výsledky:
- GET /simulation-jobs/{job_id}
- GET /simulation-jobs/{job_id}/summary
- GET /simulation-jobs/{job_id}/runs (optional, debug)
V BP může být simulate synchronní a vrátit summary rovnou. Ale doporučuju job model (status), protože UI je pak čistší.
**6.5 Dashboard KPI**
- GET /baseline-weeks/{id}/kpis
Vrátí:
- reálné KPI (z baseline vstupů) – revenue estimate, labor, fixed, profit estimate
- Data Health (coverage + actionability)
**6.6 AI**
- POST /ai/explain
- POST /ai/suggest
- POST /ai/build-scenario
Payload bude obsahovat:
- context (dashboard/simulation/scenario_builder)
- baseline_kpis
- scenario_kpis (pokud existuje)
- data_health
- constraints (volitelně)
- current_overrides (volitelně)

**7) AI integrace (technický návrh)**
**7.1 Minimální režimy**
- **Explain**: vysvětli KPI + co znamenají grafy
- **Suggest**: navrhni 2–3 scénáře
- **Build scenario**: vrať JSON dle overrides_json schématu
**7.2 Prompting pravidla**
- AI dostává jen data z backendu (KPI summary, parametry).
- AI musí respektovat:
  - “málo dat (1 týden) → vyjadřuj nejistotu”
  - “neměň věci, které nejsou v možnostech” (např. když nemodeluješ delivery)
**7.3 Function-style odpověď**
U build-scenario chceš výstup striktně JSON:
- validovat proti schématu (server-side)
- když nevalidní → backend požádá o opravu (1 retry)
**7.4 Ukládání AI logů**
Každý request/response uložit do ai_logs:
- pro BP kapitolu “efektivita AI”

**8) Frontend návrh (React/TS)**
**8.1 Routing**
- /setup – nastavení + baseline vstupy
- /dashboard/:baselineWeekId
- /scenarios/:baselineWeekId
- /simulate/:jobId (nebo /results/:baselineWeekId/:scenarioId?)
- (volitelně) /compare – porovnání scénářů
**8.2 Komponenty**
**Setup**
- VenueSettingsForm
- DaypartsEditor
- BaselineWeekSelector + editor
- DaypartDataTable (weekday × daypart grid)
- StaffingTable
- CostSettingsForm
- SimulationParamsForm
- DataHealthCard (coverage/actionability + doporučení)
**Dashboard**
- KPI cards
- Charts (bar/line)
- AI Panel (Explain)
**Scenarios**
- ScenarioList
- ScenarioEditor (UI pro overrides)
- “Ask AI to suggest scenarios”
- “Apply AI scenario JSON”
**Simulation Results**
- SummaryCards baseline vs scenario
- Interval charts (p10–p90)
- Waterfall-like jednoduché vysvětlení (v BP klidně text + bar)
- AI Panel (Interpret + next steps)
**8.3 Grafy**
Recharts:
- baseline vs scenario: sloupcový graf (mean)
- error bars: p10–p90 (můžeš udělat jako custom tooltip nebo shaded area)
- wait time distribution: line/area

**9) Data Health (BP verze)**
**9.1 Coverage checks (jednoduché)**
- existují dayparts?
- existuje baseline_daypart_data pro všechny dayparts/dny?
- existuje staffing pro kuchyň?
- existují sim params?
- existují fixed costs?
Coverage score:
- procento splněných checků
**9.2 Actionability (jednoduché, ale obhajitelné)**
- historie týdnů:
  - 1 týden → 25/100
  - 2–3 týdny → 50/100
  - 4+ týdny → 75/100
- chybějící klíčové položky (staffing, prep times) snižují
UI text:
- konkrétní doporučení (např. “doplňte prep_time”, “změřte seat_time”)

**10) Testování a validace**
**10.1 Jednotkové testy (backend)**
- validace vstupů (ranges, non-negative)
- aplikace overrides (scenario) → správně upraví baseline vstupy
- determinismus:
  - stejný seed → stejné výsledky
- sanity:
  - když zvýším kuchaře, avg_wait_food by měl klesat (statisticky)
**10.2 Simulační validace (v BP popsat)**
- face validation: výsledky dávají smysl (utilization 0–1, wait times kladné)
- sensitivity analysis:
  - zvýšení arrivals → wait roste
  - zvýšení kapacity → wait klesá
- porovnání baseline simulated vs baseline input (pokud máš reálné wait times, i odhadem)
**10.3 Frontend testy**
- minimálně smoke test: načtení baseline, vytvoření scénáře, spuštění simulace

**11) Deployment (BP jednoduché)**
**Varianta A (nejjednodušší)**
- Backend + frontend lokálně
- DB SQLite
- Simulace sync
**Varianta B (víc “produkční”)**
- Docker compose:
  - backend
  - frontend
  - postgres
  - (optional) redis + worker

**12) Implementační plán (doporučené pořadí)**
- **DB + backend CRUD** (venue, dayparts, baseline week, staffing, params)
- **KPI výpočet pro baseline** (profit estimate + základní grafy)
- **Scenario model + overrides aplikace**
- **SimPy model (1 běh) + metriky**
- **Runner pro N běhů + summary (p10/p90)**
- **Frontend: Setup + Dashboard**
- **Frontend: Scenario Builder + Simulation Results**
- **AI: Explain + Suggest + Build scenario JSON**
- **Polishing: Data Health + validace + export/import CSV**

**13) Co je “hotové” (Definition of Done pro BP)**
- Dokážeš založit baseline týden, vyplnit data a zobrazit KPI.
- Dokážeš vytvořit scénář, spustit 200 běhů simulace a zobrazit summary.
- Dokážeš porovnat baseline vs scénář v grafech.
- AI umí:
  - vysvětlit KPI
  - navrhnout scénáře
  - vygenerovat scenario JSON, které jde uložit a simulovat
- V práci popíšeš:
  - model, fronty, parametry, experimenty, interpretaci, roli AI.

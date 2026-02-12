# BP – Kompletní specifikace aplikace (sloučené DOCX → Markdown)

Tento soubor obsahuje **beze ztrát** obsah všech dodaných DOCX souborů, vložený postupně za sebe ve stejném pořadí.

---



## BP - Backlog.docx

_Původní soubor: BP - Backlog.docx_

# BP - Backlog.docx

_Source: BP - Backlog.docx_

Níže máš konkrétní **backlog (user stories)** pro BP-MVP. Je to v duchu agilního backlogu: **epiky → user stories → acceptance criteria**, plus **priority (P0/P1/P2)** a **odhad (S/M/L)**. Vše je navázané na technický návrh, aby se podle toho dalo přímo vyvíjet.
P0 = nutné pro obhajitelný MVP v BP
P1 = velmi vhodné, když vyjde čas
P2 = nice-to-have / rozšíření

**Epic E0: Projektový základ, prostředí, kvalita**
**US0.1 – Založení repo a běžící skeleton aplikace**
**Jako** vývojář
**chci** mít repo se separátním frontendem a backendem, jednotným spouštěním a základní strukturou
**aby** šel projekt hned vyvíjet a spouštět.
**Acceptance criteria**
- Repo obsahuje /backend (FastAPI) a /frontend (React+TS)
- README popisuje lokální spuštění (1–2 příkazy)
- Backend má health endpoint GET /health → {status:"ok"}
- Frontend běží a umí zavolat /health a zobrazit “OK”
**Priority:** P0 | **Odhad:** M
**US0.2 – Základní konfigurace (ENV, logging)**
**Jako** vývojář
**chci** mít konfiguraci přes .env a logování
**aby** šlo snadno měnit DB/AI klíče a debugovat.
**AC**
- Backend čte DB URL a AI API key z env
- Logy obsahují request id + čas
- Chyby vrací JSON {error: "..."}
**P0 | S**

**Epic E1: Datový model & persistentní úložiště**
**US1.1 – DB schéma pro BP-MVP**
**Jako** vývojář
**chci** vytvořit tabulky pro venue, baseline week, dayparts, staffing, costs, sim params, scenarios, simulation jobs/results
**aby** šlo ukládat vše potřebné pro simulaci a UI.
**AC**
- Migrace/DDL vytvoří tabulky dle BP návrhu (venue_settings, dayparts, opening_hours, baseline_week, baseline_daypart_data, staffing_plan, cost_settings, simulation_params, scenarios, simulation_jobs, simulation_runs, simulation_summary, ai_logs)
- Základní indexy (baseline_week_id, scenario_id, simulation_job_id)
- Aplikace startuje bez chyb a umí uložit a načíst z DB
**P0 | M**
**US1.2 – Seed dat (volitelné demo)**
**Jako** uživatel
**chci** mít možnost nahrát “demo baseline” jedním klikem
**aby** šlo aplikaci ukázat bez ručního vyplňování.
**AC**
- Endpoint nebo tlačítko v UI vytvoří demo venue + baseline týden + dayparts + staffing + params
- Dashboard i simulace fungují na demo datech
**P1 | S**

**Epic E2: Setup & správa baseline vstupů**
**US2.1 – Nastavení provozovny (venue settings)**
**Jako** uživatel
**chci** nastavit základní parametry restaurace (měna, počet míst/stolů, režim)
**aby** KPI a simulace odpovídaly realitě.
**AC**
- UI formulář uloží venue_settings (currency, seats_total, tables_count, mode)
- Validace: seats_total > 0, tables_count >= 0
- API: GET/PUT vrací uložené hodnoty
**P0 | S**
**US2.2 – Editor opening hours**
**Jako** uživatel
**chci** zadat otevírací dobu pro každý den
**aby** dayparts a výpočty vycházely z reality.
**AC**
- UI tabulka Po–Ne (open/close)
- Validace: open < close (nebo podpora přes půlnoc jako P2)
- API bulk update + načtení
**P0 | S**
**US2.3 – Editor dayparts**
**Jako** uživatel
**chci** definovat dayparts (např. Oběd, Večeře) s časem start/end
**aby** data i scénáře šly zadávat “po blocích”.
**AC**
- CRUD dayparts (create/edit/delete)
- Validace: start < end, bez překryvů (pro BP stačí jednoduché varování)
- UI umožní mít min. 2 dayparty
**P0 | M**
**US2.4 – Založení baseline týdne**
**Jako** uživatel
**chci** vytvořit baseline týden (week_start + label)
**aby** se vše vázalo k jednomu měřenému týdnu.
**AC**
- UI vytvoří baseline_week s week_start (pondělí) a label
- Zobrazí seznam baseline týdnů
- Lze vybrat aktivní baseline pro dashboard/simulaci
**P0 | S**
**US2.5 – Zadání poptávky a útraty po daypartech**
**Jako** uživatel
**chci** zadat pro každý den a daypart: arrivals_groups, avg_spend_per_group (a volitelně avg_party_size)
**aby** simulace generovala realistické příchody a revenue.
**AC**
- UI mřížka 7×N dayparts
- Validace: arrivals_groups >= 0, avg_spend >= 0
- API bulk save/load
- Pokud chybí některé kombinace, Data Health to označí
**P0 | L**
**US2.6 – Zadání staffing plánu po daypartech**
**Jako** uživatel
**chci** zadat počet kuchyň/obsluha + sazbu + délku směny pro každý daypart
**aby** simulace měla kapacity a labor costs.
**AC**
- UI mřížka 7×N×role (kitchen/service)
- Validace: staff_count >= 0, hourly_rate >= 0
- hours_in_daypart default = délka daypartu, ale lze přepsat
- API bulk save/load
**P0 | L**
**US2.7 – Zadání nákladů (fixed + food cost %)**
**Jako** uživatel
**chci** zadat fixní náklady na týden a food_cost_pct
**aby** profit estimate dával smysl.
**AC**
- UI pro fixed_cost_week a food_cost_pct (0–1)
- Validace: fixed >= 0, 0<=pct<=1
- API save/load
**P0 | S**
**US2.8 – Zadání simulačních parametrů (triangular + balking + elasticita)**
**Jako** uživatel
**chci** zadat min/mode/max pro prep_time a seat_time + elasticitu + noise
**aby** simulace měla rozptyl a šla kalibrovat.
**AC**
- UI pro triangular parametry (min<=mode<=max)
- UI pro balking limity (volitelné)
- UI pro alpha_seat_wait, price_elasticity, demand_noise_pct
- API save/load
**P0 | M**

**Epic E3: Data Health (Coverage + Actionability)**
**US3.1 – Coverage score a checklist**
**Jako** uživatel
**chci** vidět, co mi chybí k použitelným výsledkům
**aby** bylo jasné, proč je něco N/A nebo méně spolehlivé.
**AC**
- Backend vrátí coverage_score (0–100) + seznam checks (OK/Missing)
- Checks min.: dayparts existují, baseline_daypart_data kompletní, staffing pro kitchen existuje, sim params existují, fixed costs existují
- Frontend to zobrazí v Data Health card
**P0 | M**
**US3.2 – Actionability score (BP jednoduchý)**
**Jako** uživatel
**chci** vidět actionability_score a doporučení
**aby** bylo jasné, zda z toho lze rozhodovat.
**AC**
- Actionability vychází min. z počtu týdnů (v BP typicky 1) + missing klíčových dat
- UI zobrazí: “1 týden dat → výsledky orientační” + konkrétní doporučení
**P1 | S**

**Epic E4: Výpočet “reálných” KPI (baseline)**
**US4.1 – Výpočet baseline KPI (profit estimate)**
**Jako** uživatel
**chci** vidět KPI pro baseline týden
**aby** aplikace měla “aktuální statistiku”.
**AC**
- Backend endpoint /baseline-weeks/{id}/kpis vrátí:
  - revenue_estimate (sum arrivals*avg_spend)
  - labor_cost (sum staffing)
  - fixed_cost_week
  - cogs_estimate = revenue*food_cost_pct
  - profit_estimate
- UI zobrazí KPI cards + jednoduchý breakdown
**P0 | M**
**US4.2 – Grafy po dnech/daypartech (baseline)**
**Jako** uživatel
**chci** vidět grafy tržeb a poptávky po dnech/daypartech
**aby** šly identifikovat špičky.
**AC**
- Backend vrátí data pro grafy (series)
- Frontend vykreslí alespoň:
  - arrivals per daypart (bar)
  - revenue per weekday (bar/line)
**P0 | M**

**Epic E5: Scénáře (What-if)**
**US5.1 – Vytvoření scénáře**
**Jako** uživatel
**chci** vytvořit scénář nad baseline (název, popis)
**aby** se dal uložit a později porovnat.
**AC**
- UI vytvoří scenario record
- Scenario se objeví v seznamu
- Lze otevřít editor scénáře
**P0 | S**
**US5.2 – Editor staffing změn ve scénáři**
**Jako** uživatel
**chci** v scénáři přidat/odebrat staff pro konkrétní den/daypart/roli
**aby** šlo testovat dopady staffing.
**AC**
- UI umožní přidat staffing_changes položku
- Validace: výsledný staff_count nesmí být < 0
- Uloží se do overrides_json
**P0 | M**
**US5.3 – Editor price change ve scénáři**
**Jako** uživatel
**chci** nastavit změnu ceny (např. +8 %)
**aby** se simulovala elasticita poptávky.
**AC**
- UI nabídne percent change (-50% až +50% třeba)
- Uloží se do overrides_json.price_change
**P0 | S**
**US5.4 – Editor kapacity (stoly/místa) ve scénáři**
**Jako** uživatel
**chci** upravit kapacitu (seats_total / tables_count) pro scénář
**aby** šlo testovat přidání/odebrání kapacity.
**AC**
- UI umožní zadat delta nebo absolutní hodnotu
- Validace: seats_total > 0
- Uloží se do overrides_json.capacity_changes
**P1 | S**
**US5.5 – Seznam scénářů + rychlé porovnání “před simulací”**
**Jako** uživatel
**chci** mít seznam scénářů a vidět jejich změny vůči baseline
**aby** bylo jasné, co scénář dělá.
**AC**
- Seznam scénářů s krátkým summary (např. “+1 kitchen Sat Dinner, +8% price”)
- Detail scénáře ukáže overrides
**P1 | S**

**Epic E6: Simulační engine (SimPy) + runner**
**US6.1 – Implementace 1 běhu DES simulace**
**Jako** vývojář
**chci** implementovat SimPy model (tables, kitchen, service) pro 1 týden
**aby** šla spustit simulace.
**AC**
- Funkce simulate_week(inputs, seed) -> metrics
- Generuje arrivals podle daypartu
- Modeluje queue na tables a kitchen (service volitelně)
- Sbírá metriky min.: served_groups, lost_groups, avg_wait_food, p90_wait_food, util_kitchen, revenue, profit
**P0 | L**
**US6.2 – Triangular sampling + demand noise + elasticity**
**Jako** vývojář
**chci** implementovat triangular rozdělení, noise poptávky a elasticitu
**aby** běhy měly rozptyl a scénáře ceny fungovaly.
**AC**
- Triangular min<=mode<=max
- demand_noise_pct aplikuje ± šum
- price_change + elasticity upraví arrivals
- arrivals nikdy neklesnou pod 0
**P0 | M**
**US6.3 – Korelace seat_time na kitchen_wait (alpha)**
**Jako** vývojář
**chci** navázat seat_time na kitchen_wait přes alpha_seat_wait
**aby** model reflektoval provázání kuchyň→sezení.
**AC**
- seat_time = base_seat + alpha * kitchen_wait
- alpha=0 → žádná vazba
- metriky seat_time / table utilization se mění smysluplně při změně alpha
**P1 | M**
**US6.4 – Balking (limit čekání)**
**Jako** uživatel
**chci** nastavit limit čekání, po kterém host odejde
**aby** se simuloval dopad dlouhých front na ztrátu tržeb.
**AC**
- pokud wait_table > limit → lost_groups++
- pokud wait_food > limit → (pro BP stačí lost nebo penalizace revenue)
- limit=0 nebo null → balking vypnut
**P1 | M**
**US6.5 – Runner pro N běhů + summary percentilů**
**Jako** uživatel
**chci** spustit simulaci např. 200× a dostat mean/median/p10/p90
**aby** výsledek ukazoval nejistotu.
**AC**
- run_simulations(inputs, runs, base_seed) vrátí summary pro metriky
- ukládá simulation_runs (volitelně jen pro debug)
- ukládá simulation_summary (povinně)
**P0 | L**

**Epic E7: Simulace přes API + ukládání výsledků**
**US7.1 – Spuštění simulace baseline jako job**
**Jako** uživatel
**chci** spustit simulaci baseline a vidět stav jobu
**aby** UI neblokovalo a bylo robustní.
**AC**
- POST /baseline-weeks/{id}/simulate?runs=200 vytvoří simulation_job
- status queued→running→done
- GET /simulation-jobs/{id} vrátí status
**P0 | M**
**US7.2 – Spuštění simulace scénáře jako job**
**Jako** uživatel
**chci** spustit simulaci scénáře a dostat summary
**aby** šlo porovnávat varianty.
**AC**
- POST /scenarios/{id}/simulate?runs=200
- job naváže na scenario_id
- summary endpoint vrací výsledky
**P0 | M**
**US7.3 – Side-by-side porovnání baseline vs scénář (API)**
**Jako** uživatel
**chci** mít endpoint, který vrátí baseline summary i scenario summary
**aby** frontend nemusel skládat data složitě.
**AC**
- GET /compare?baselineJobId=...&scenarioJobId=...
- vrací obě summary + delta (mean rozdíl)
**P1 | S**

**Epic E8: Frontend – Dashboard, scénáře, výsledky**
**US8.1 – Setup obrazovka (kompletní flow)**
**Jako** uživatel
**chci** projít setup a uložit baseline data
**aby** šlo přejít na dashboard.
**AC**
- Po uložení všech sekcí UI dovolí “Go to dashboard”
- UI validuje povinné položky (P0 data)
- Zobrazuje Data Health
**P0 | L**
**US8.2 – Dashboard KPI + grafy**
**Jako** uživatel
**chci** vidět KPI a grafy baseline týdne
**aby** bylo jasné, jak vypadá realita.
**AC**
- KPI cards (revenue, labor, fixed, profit, avg arrivals)
- 2–3 základní grafy
- tlačítko “Run baseline simulation”
**P0 | M**
**US8.3 – Scenario Builder UI**
**Jako** uživatel
**chci** vytvořit scénář změn v UI
**aby** šly dělat experimenty.
**AC**
- CRUD scénářů
- UI pro staffing changes + price change + capacity
- tlačítko “Run scenario simulation”
**P0 | L**
**US8.4 – Simulation Results UI**
**Jako** uživatel
**chci** vidět summary baseline vs scénář s intervaly
**aby** šlo rozhodnout, co je lepší.
**AC**
- Zobrazení mean/median/p10/p90 pro hlavní metriky
- Graf baseline vs scénář (profit, wait_food)
- Delta view (např. +profit, -wait)
**P0 | M**
**US8.5 – Porovnání více scénářů (tabulka)**
**Jako** uživatel
**chci** porovnat 2–5 scénářů v tabulce
**aby** šlo vybrat nejlepší.
**AC**
- Tabulka scénářů s metrikami mean profit, p90 wait, lost_groups
- Seřazení podle zvoleného KPI
**P1 | M**

**Epic E9: AI integrace (Explain/Suggest/Build scenario)**
**US9.1 – AI Explain na dashboardu**
**Jako** uživatel
**chci** dostat AI shrnutí baseline KPI
**aby** mi pomohla interpretovat data.
**AC**
- Tlačítko “Ask AI” → zobrazí odpověď
- AI dostane KPI + Data Health + upozornění “1 týden”
- Loguje se do ai_logs
**P0 | M**
**US9.2 – AI Interpret výsledků simulace**
**Jako** uživatel
**chci** AI shrnutí rozdílu baseline vs scénář
**aby** mi pomohla pochopit tradeoff.
**AC**
- AI dostane baseline summary + scenario summary
- Vrátí text: co se změnilo, rizika, doporučení
- Log do ai_logs
**P0 | M**
**US9.3 – AI Suggest scenarios**
**Jako** uživatel
**chci** aby AI navrhla 2–3 scénáře, které má smysl zkusit
**aby** mi šetřila čas.
**AC**
- AI vrátí seznam návrhů (text + parametry)
- UI umožní “Create scenario from suggestion” (ručně nebo přes build JSON)
**P1 | M**
**US9.4 – AI Build scenario JSON (validovaný)**
**Jako** uživatel
**chci** aby AI vygenerovala scenario overrides JSON
**aby** šlo scénář rovnou uložit a simulovat.
**AC**
- Endpoint /ai/build-scenario vrátí JSON dle schématu overrides_json
- Backend JSON validuje (staff_count nesmí vyjít záporně)
- UI uloží scénář a otevře editor
**P1 | L**

**Epic E10: Import/Export (volitelné, ale užitečné)**
**US10.1 – Export baseline do JSON**
**Jako** uživatel
**chci** exportovat baseline nastavení a data
**aby** šlo snadno sdílet nebo verzovat dataset.
**AC**
- “Export” stáhne JSON (venue + baseline + staffing + params)
- “Import” umí JSON nahrát a vytvořit baseline
**P1 | M**
**US10.2 – Import CSV šablona (poptávka a staffing)**
**Jako** uživatel
**chci** importovat tabulku z CSV
**aby** nebylo nutné vše vyklikávat.
**AC**
- Poskytnutá CSV šablona + validace
- Import vytvoří baseline_daypart_data a staffing_plan
**P2 | M**

**Epic E11: Dokumentace a reprodukovatelnost (pro BP)**
**US11.1 – Reprodukovatelný experiment runner**
**Jako** student
**chci** mít možnost spustit předdefinované scénáře a uložit výsledky
**aby** byly experimenty v BP opakovatelné.
**AC**
- Script/endpoint “run BP experiments” spustí 5–6 scénářů
- Uloží summary a exportuje tabulku výsledků (CSV/JSON)
**P0 | M**
**US11.2 – Stránka “About model” (metodika)**
**Jako** čtenář BP
**chci** v aplikaci vidět popis modelu a definice KPI
**aby** bylo jasné, co aplikace počítá.
**AC**
- Jednoduchá stránka s: definice KPI, popis modelu, parametry, omezení (1 týden)
- Link z hlavního menu
**P1 | S**

**Doporučený “kritický řez” pro BP (co udělat určitě)**
Pokud chceš mít jistotu, že to obhájíš a dokončíš:
**Must-have (P0):**
- US0.1, US1.1
- US2.1–US2.8 (vstupy)
- US4.1–US4.2 (KPI + grafy)
- US5.1–US5.3 (scénáře)
- US6.1–US6.2 + US6.5 (SimPy + N běhů)
- US7.1–US7.2 (spuštění simulace)
- US8.1–US8.4 (UI flow)
- US9.1–US9.2 (AI explain + interpret)
- US11.1 (reprodukovatelné experimenty)
**Nice, když zbude čas (P1):**
- korelace seat_time na wait (US6.3)
- balking (US6.4)
- AI build scenario JSON (US9.4)
- porovnání více scénářů tabulkou (US8.5)
- export/import JSON (US10.1)


---



## BP - klíče JSON.docx

_Původní soubor: BP - klíče JSON.docx_

# BP - klíče JSON.docx

_Source: BP - klíče JSON.docx_

Jasně — níže máš **jednotnou definici metrikových klíčů (naming convention + seznam klíčů)** a pak **JSON kontrakty**pro hlavní endpointy (/kpis, /simulate, /simulation-jobs/{id}/summary, /compare). Je to navržené tak, aby:
- backend a frontend mluvily stejným jazykem,
- bylo snadné přidávat nové metriky bez změny struktury,
- šlo to hezky typovat v TypeScriptu,
- a dalo se to použít i v BP (transparentnost).

**1) Konvence metrikových klíčů**
**1.1 Základní pravidla**
- Všechny metriky mají **stabilní klíč** ve formátu:
  - domain.metric (např. finance.revenue, queue.wait_food_avg)
- Statistické agregace se řeší **samostatně**, ne v názvu metriky:
  - metrika je vždy “hodnota”,
  - summary přidá {mean, median, p10, p90}.
**1.2 Jednotky a metadata**
- Jednotky nedáváš do klíče, ale do metric_catalog (viz níže).
- UI si podle unit formátuje hodnotu.
**1.3 Normalizace názvů**
- snake_case uvnitř metriky nepoužívat, drž lowercase s _ jen když je to dlouhé (wait_food_p90 raději jako queue.wait_food_p90 → ale p90 je agregace, takže raději queue.wait_food + summary p90).
- Proto:
  - queue.wait_food = “wait time food” jako *distribuce*, agregace v summary.

**2) Seznam metrikových klíčů (BP-MVP)**
**2.1 Finance**
- finance.revenue (CZK)
- finance.cogs (CZK)
- finance.labor_cost (CZK)
- finance.fixed_cost (CZK)
- finance.profit (CZK)
- finance.profit_margin (ratio 0–1)
- finance.labor_cost_ratio (ratio 0–1)
- finance.prime_cost_ratio (ratio 0–1)
**2.2 Demand / throughput**
- demand.arrivals_groups (count) *(doporučeno logovat i v simulaci, i když je to “interní”)*
- demand.served_groups (count)
- demand.lost_groups (count)
- demand.service_level (ratio 0–1)
**2.3 Fronty a časy**
- queue.wait_table (minutes)
- queue.wait_food (minutes)
- time.system_time (minutes)
**2.4 Utilization**
- util.kitchen (ratio 0–1)
- util.service (ratio 0–1)
- util.tables (ratio 0–1)
**2.5 Data Health**
- health.coverage_score (0–100)
- health.actionability_score (0–100)
Pozn.: V baseline KPI vracíš finance + health + agregace poptávky. V simulaci vracíš finance + queue + util + demand.

**3) Metric Catalog (metadata pro UI i dokumentaci)**
Doporučuju mít endpoint /metrics/catalog, který vrátí definice, jednotky a popis. Ušetří ti to hardcode ve frontendu a je to skvělé i do BP.
**3.1 Kontrakt ****MetricCatalogItem**
{
  "key": "finance.profit",
  "label": "Profit (estimate)",
  "unit": "currency",
  "unit_symbol": "CZK",
  "domain": "finance",
  "description": "Estimated weekly profit = revenue - cogs - labor - fixed.",
  "higher_is_better": true,
  "format": "money",
  "precision": 0
}
**Pozn.:** unit_symbol může být dynamicky dle venue.

**4) JSON kontrakty response (API)**
Níže jsou kontrakty jako “JSON schema style” popis + příklady.
**4.1 ****GET /baseline-weeks/{id}/kpis**
**Účel**
Vrátí:
- baseline KPI (deterministické estimate z dat),
- timeseries pro grafy,
- data health,
- reference na metric catalog keys.
**Response kontrakt**
{
  "baseline_week_id": 123,
  "currency": "CZK",
  "generated_at": "2026-02-03T10:15:00Z",

  "kpis": {
    "finance.revenue": 120000,
    "finance.cogs": 36000,
    "finance.labor_cost": 42000,
    "finance.fixed_cost": 15000,
    "finance.profit": 27000,
    "finance.profit_margin": 0.225,
    "finance.labor_cost_ratio": 0.35,
    "finance.prime_cost_ratio": 0.65,

    "demand.arrivals_groups": 320
  },

  "data_health": {
    "health.coverage_score": 85,
    "health.actionability_score": 25,
    "checks": [
      {"key": "dayparts_defined", "status": "ok", "message": "Dayparts are defined."},
      {"key": "baseline_daypart_data_complete", "status": "missing", "message": "Missing entries for Sun Dinner."}
    ],
    "recommendations": [
      "Add at least 3 more weeks to improve seasonality confidence.",
      "Fill missing daypart data to compute arrivals heatmap."
    ]
  },

  "timeseries": {
    "by_weekday": [
      {"weekday": 0, "finance.revenue": 15000, "demand.arrivals_groups": 40},
      {"weekday": 1, "finance.revenue": 14000, "demand.arrivals_groups": 38}
    ],
    "by_daypart": [
      {"daypart_id": 1, "label": "Lunch", "finance.revenue": 52000, "demand.arrivals_groups": 140},
      {"daypart_id": 2, "label": "Dinner", "finance.revenue": 68000, "demand.arrivals_groups": 180}
    ],
    "heatmap": [
      {"weekday": 0, "daypart_id": 1, "demand.arrivals_groups": 25, "finance.revenue": 9000}
    ]
  }
}
**Typy**
- kpis je map: metricKey -> number
- timeseries je list objektů s metrikami (subset)

**4.2 ****POST /baseline-weeks/{id}/simulate?runs=200**
a POST /scenarios/{scenario_id}/simulate?runs=200
**Účel**
Založí sim job a vrátí job info.
**Response kontrakt**
{
  "simulation_job_id": 987,
  "status": "queued",
  "runs": 200,
  "baseline_week_id": 123,
  "scenario_id": null,
  "created_at": "2026-02-03T10:20:00Z"
}

**4.3 ****GET /simulation-jobs/{job_id}**
**Response**
{
  "simulation_job_id": 987,
  "status": "done",
  "runs": 200,
  "baseline_week_id": 123,
  "scenario_id": 55,
  "created_at": "2026-02-03T10:20:00Z",
  "started_at": "2026-02-03T10:20:05Z",
  "finished_at": "2026-02-03T10:20:12Z",
  "error_message": null
}

**4.4 ****GET /simulation-jobs/{job_id}/summary**
**Účel**
Vrátí agregovanou statistiku pro všechny metriky.
**Kontrakt: ****MetricSummaryStats**
- mean, median, p10, p90 (numbers)
- volitelně min, max, std (P1)
**Response kontrakt**
{
  "simulation_job_id": 987,
  "currency": "CZK",
  "generated_at": "2026-02-03T10:20:12Z",

  "summary": {
    "finance.revenue": {"mean": 118500, "median": 118200, "p10": 103000, "p90": 134000},
    "finance.profit": {"mean": 24500, "median": 24000, "p10": -1500, "p90": 42000},

    "demand.served_groups": {"mean": 305, "median": 304, "p10": 280, "p90": 330},
    "demand.lost_groups": {"mean": 12, "median": 11, "p10": 0, "p90": 30},
    "demand.service_level": {"mean": 0.962, "median": 0.965, "p10": 0.91, "p90": 1.0},

    "queue.wait_food": {"mean": 11.2, "median": 10.9, "p10": 7.0, "p90": 16.8},
    "queue.wait_table": {"mean": 3.5, "median": 3.1, "p10": 0.0, "p90": 8.9},
    "time.system_time": {"mean": 74.0, "median": 72.0, "p10": 58.0, "p90": 98.0},

    "util.kitchen": {"mean": 0.87, "median": 0.88, "p10": 0.73, "p90": 0.96},
    "util.tables": {"mean": 0.76, "median": 0.77, "p10": 0.62, "p90": 0.86},
    "util.service": {"mean": 0.55, "median": 0.55, "p10": 0.41, "p90": 0.70}
  },

  "notes": [
    "Results are based on 200 runs.",
    "Only 1 week of input data available; uncertainty is high."
  ]
}

**4.5 ****GET /compare?baselineJobId=...&scenarioJobId=...**
**Účel**
Side-by-side + delta + volitelně pravděpodobnost zlepšení.
**Response kontrakt**
{
  "baseline_job_id": 900,
  "scenario_job_id": 987,
  "currency": "CZK",
  "generated_at": "2026-02-03T10:25:00Z",

  "baseline": {
    "finance.profit": {"mean": 21000, "median": 20500, "p10": -2000, "p90": 38000},
    "queue.wait_food": {"mean": 13.4, "median": 13.0, "p10": 8.5, "p90": 20.1}
  },
  "scenario": {
    "finance.profit": {"mean": 24500, "median": 24000, "p10": -1500, "p90": 42000},
    "queue.wait_food": {"mean": 11.2, "median": 10.9, "p10": 7.0, "p90": 16.8}
  },

  "delta_mean": {
    "finance.profit": 3500,
    "queue.wait_food": -2.2
  },

  "delta_p90": {
    "finance.profit": 4000,
    "queue.wait_food": -3.3
  },

  "win_probability": {
    "finance.profit": 0.64
  }
}
**Pozn.:** win_probability vyžaduje buď:
- párované seedy (baseline i scenario run i mají stejný seed index), nebo
- uložené per-run hodnoty obou jobů.
Pro BP můžeš:
- buď vynechat win_probability (P0),
- nebo implementovat párované seedy (P1).

**4.6 ****GET /metrics/catalog**
**Response kontrakt**
{
  "currency": "CZK",
  "items": [
    {
      "key": "finance.profit",
      "label": "Profit (estimate)",
      "unit": "currency",
      "unit_symbol": "CZK",
      "domain": "finance",
      "description": "Estimated weekly profit = revenue - cogs - labor - fixed.",
      "higher_is_better": true,
      "format": "money",
      "precision": 0
    },
    {
      "key": "queue.wait_food",
      "label": "Wait time for food",
      "unit": "minutes",
      "domain": "queue",
      "description": "Time from order placement until food preparation completes.",
      "higher_is_better": false,
      "format": "duration",
      "precision": 1
    }
  ]
}

**5) Doporučené TypeScript typy (pro frontend)**
**5.1 MetricKey**
V TS si to můžeš držet jako string union (P1), nebo prostě string.
export type MetricKey =
  | "finance.revenue"
  | "finance.cogs"
  | "finance.labor_cost"
  | "finance.fixed_cost"
  | "finance.profit"
  | "finance.profit_margin"
  | "finance.labor_cost_ratio"
  | "finance.prime_cost_ratio"
  | "demand.arrivals_groups"
  | "demand.served_groups"
  | "demand.lost_groups"
  | "demand.service_level"
  | "queue.wait_table"
  | "queue.wait_food"
  | "time.system_time"
  | "util.kitchen"
  | "util.service"
  | "util.tables"
  | "health.coverage_score"
  | "health.actionability_score";
**5.2 SummaryStats**
export interface SummaryStats {
  mean: number;
  median: number;
  p10: number;
  p90: number;
}
export type SummaryMap = Record<string, SummaryStats>;

**6) Poznámky k implementaci kontraktů (prakticky)**
- **Baseline ****/kpis** vrací jednoduché čísla (deterministické), bez percentilů.
- **Sim summary** vrací percentily.
- **Compare** vrací subset metrik (ty, co chceš v UI) + delty.
- metric_catalog je single source of truth pro labely, jednotky a popisy → UI bude čisté.


---



## BP - KPI.docx

_Původní soubor: BP - KPI.docx_

# BP - KPI.docx

_Source: BP - KPI.docx_

Níže máš **KPI katalog pro BP-MVP**: pro každý KPI je **definice**, **přesný vzorec**, **jednotky**, **data source (tabulka/pole)**, **poznámky k interpretaci** a **typické fallbacky**. Je to udělané tak, aby šlo přímo převést do backend výpočtů a zároveň to šlo opsat do BP (metodika + transparentnost).
Rozlišení:
- **Baseline KPI** = vypočítané z vstupů (reálný týden, agregace)
- **Simulation KPI** = vypočítané z výsledků běhů (DES), pak agregované (mean/median/p10/p90)

**0) Datové zdroje (BP-MVP model)**
**Tabulky a klíčová pole**
- baseline_daypart_data:
  - weekday, daypart_id
  - arrivals_groups (int)
  - avg_party_size (float, optional)
  - avg_spend_per_group (float)
- staffing_plan:
  - weekday, daypart_id, role (kitchen|service)
  - staff_count (int)
  - hourly_rate (float)
  - hours_in_daypart (float)
- cost_settings:
  - fixed_cost_week (float)
  - food_cost_pct (float, 0–1)
- simulation_params:
  - triangular časy: prep_time_min/mode/max, seat_time_min/mode/max
  - alpha_seat_wait, demand_noise_pct, price_elasticity
  - balking limity
- venue_settings:
  - seats_total, tables_count, currency, mode
- simulation_runs.metrics_json (per run)
- simulation_summary.summary_json (aggregated)

**1) KPI katalog — Finance (baseline + simulation)**
**KPI-F1: Revenue (Tržby)**
**Definice:** Celkové tržby za simulovaný / měřený týden.
**Jednotky:** měna (CZK).
**Data source:**
- Baseline: baseline_daypart_data
- Simulation: simulation_runs.metrics_json.revenue
**Baseline vzorec (estimate)**
[
Revenue_{baseline}=\sum_{d \in weekdays}\sum_{p \in dayparts}\left(arrivals_groups_{d,p}\times avg_spend_per_group_{d,p}\right)
]
**Pozn.:** Pokud používáš spend per person:
[
Revenue=\sum (arrivals_groups \times avg_party_size \times avg_spend_per_person)
]
**Simulation vzorec (per run)**
[
Revenue_{run}=\sum_{i \in served_groups} spend_i
]
**Fallbacky:**
- Missing avg_spend → nelze smysluplně → Coverage fail.

**KPI-F2: COGS estimate (Food cost odhad)**
**Definice:** Odhad nákladů na suroviny jako procento z tržeb.
**Jednotky:** měna (CZK).
**Data source:** cost_settings.food_cost_pct, revenue.
[
COGS = Revenue \times food_cost_pct
]
**Pozn.:** Je to aproximace, pro BP plně ok (explicitně přiznat).

**KPI-F3: Labor cost (Mzdové náklady)**
**Definice:** Týdenní náklady na personál na základě staffing plánu (deterministické).
**Jednotky:** měna (CZK).
**Data source:** staffing_plan.staff_count, hourly_rate, hours_in_daypart.
[
LaborCost=\sum_{d,p,r}\left(staff_count_{d,p,r}\times hourly_rate_{d,p,r}\times hours_in_daypart_{d,p,r}\right)
]
**Pozn.:** Nezávislé na stochastice simulace (v BP záměrně).

**KPI-F4: Fixed cost (Fixní náklady)**
**Definice:** Fixní náklady přepočtené na týden.
**Jednotky:** měna (CZK).
**Data source:** cost_settings.fixed_cost_week.
[
FixedCost = fixed_cost_week
]

**KPI-F5: Profit (Zisk – odhad)**
**Definice:** Odhad zisku za týden.
**Jednotky:** měna (CZK).
**Data source:** Revenue, COGS, LaborCost, FixedCost.
[
Profit = Revenue - COGS - LaborCost - FixedCost
]
[
Profit = Revenue - (Revenue \times food_cost_pct) - LaborCost - FixedCost
]
**Pozn.:** V UI označit jako “estimate”.

**KPI-F6: Profit margin %**
**Definice:** Podíl zisku na tržbách.
**Jednotky:** %.
**Data source:** Profit, Revenue.
[
ProfitMargin=\begin{cases}
\frac{Profit}{Revenue} & \text{if } Revenue>0 \
0 & \text{else}
\end{cases}
]

**KPI-F7: Labor cost %**
**Definice:** Podíl mzdových nákladů na tržbách.
**Jednotky:** %.
**Data source:** LaborCost, Revenue.
[
LaborCost%=\begin{cases}
\frac{LaborCost}{Revenue} & \text{if } Revenue>0 \
0 & \text{else}
\end{cases}
]

**KPI-F8: Food cost %**
**Definice:** Podíl COGS na tržbách (v BP rovno vstupnímu parametru).
**Jednotky:** %.
**Data source:** food_cost_pct.
[
FoodCost% = food_cost_pct
]

**KPI-F9: Prime cost %**
**Definice:** (COGS + LaborCost) / Revenue.
**Jednotky:** %.
**Data source:** Revenue, COGS, LaborCost.
[
PrimeCost%=\begin{cases}
\frac{COGS + LaborCost}{Revenue} & \text{if } Revenue>0 \
0 & \text{else}
\end{cases}
]

**2) KPI katalog — Demand/Throughput**
**KPI-D1: Arrivals (příchozí skupiny)**
**Definice:** Počet příchozích skupin v baseline (zadané) nebo v simulaci (po noise+elasticity).
**Jednotky:** počet.
**Data source:**
- Baseline: baseline_daypart_data.arrivals_groups
- Simulation: interně generované + volitelně uložené do metrics
**Baseline**
[
Arrivals_{baseline}=\sum_{d,p} arrivals_groups_{d,p}
]
**Simulation (doporučeno logovat)**
[
Arrivals_{run}=\sum_{d,p} arrivals_eff_{d,p}
]
kde:
[
arrivals_eff = round(arrivals_base \times (1+U(-n,n)) \times (1+elasticity \cdot price_delta))
]

**KPI-D2: Served groups**
**Definice:** Počet skupin, které byly obslouženy (dokončily návštěvu).
**Jednotky:** počet.
**Data source:** simulation_runs.metrics_json.served_groups

**KPI-D3: Lost groups**
**Definice:** Počet skupin, které odešly (balking) kvůli čekání na stůl/jídlo.
**Jednotky:** počet.
**Data source:** simulation_runs.metrics_json.lost_groups

**KPI-D4: Service level (served %)**
**Definice:** Podíl obsloužených z celkově příchozích (jen pokud balking zapnut).
**Jednotky:** %.
**Data source:** served_groups, lost_groups.
[
ServiceLevel=\begin{cases}
\frac{ServedGroups}{ServedGroups + LostGroups} & \text{if } (ServedGroups+LostGroups)>0 \
1 & \text{else}
\end{cases}
]

**3) KPI katalog — Waiting times (fronty) a doba v systému**
Tyhle KPI jsou klíčové pro “teorii front”.
**KPI-Q1: Avg wait time for table (Wq_table)**
**Definice:** Průměrná čekací doba na uvolnění kapacity stolů/seats.
**Jednotky:** minuty.
**Data source:** simulation_runs.metrics_json.avg_wait_table (doporučeno ukládat i list, ale BP stačí agregace)
[
AvgWaitTable=\frac{1}{N}\sum_{i=1}^{N} wait_table_i
]

**KPI-Q2: P90 wait time for table**
**Definice:** 90. percentil čekání na stůl.
**Jednotky:** minuty.
**Data source:** simulation_runs.metrics_json.p90_wait_table
[
P90WaitTable = P_{90}(wait_table)
]

**KPI-Q3: Avg wait time for food / kitchen (Wq_food)**
**Definice:** Průměrná čekací doba od objednávky do dokončení přípravy.
**Jednotky:** minuty.
**Data source:** simulation_runs.metrics_json.avg_wait_food
[
AvgWaitFood=\frac{1}{N}\sum wait_food_i
]

**KPI-Q4: P90 wait time for food**
**Definice:** 90. percentil čekání na jídlo.
**Jednotky:** minuty.
**Data source:** simulation_runs.metrics_json.p90_wait_food
[
P90WaitFood = P_{90}(wait_food)
]

**KPI-Q5: Avg system time (W_system)**
**Definice:** Průměrná doba skupiny v systému od příchodu do odchodu.
**Jednotky:** minuty.
**Data source:** simulation_runs.metrics_json.avg_system_time
[
AvgSystemTime=\frac{1}{N}\sum system_time_i
]

**KPI-Q6: P90 system time**
**Definice:** 90. percentil doby v systému.
**Jednotky:** minuty.
**Data source:** simulation_runs.metrics_json.p90_system_time
[
P90SystemTime = P_{90}(system_time)
]

**4) KPI katalog — Utilization (vytížení zdrojů)**
**KPI-U1: Kitchen utilization (ρ_kitchen)**
**Definice:** Podíl času, kdy je kuchyňská kapacita vytížená.
**Jednotky:** 0–1 (nebo %).
**Data source:** simulation_runs.metrics_json.util_kitchen + staffing/dayparts.
**Výpočet v běhu (doporučený):**
- kitchen_busy_time = součet prep_time všech obsloužených skupin (minuty)
- kitchen_capacity_minutes = Σ(daypart_duration_minutes × staff_count_kitchen)
[
UtilKitchen=\begin{cases}
\frac{KitchenBusyTime}{KitchenCapacityMinutes} & \text{if } KitchenCapacityMinutes>0 \
0 & \text{else}
\end{cases}
]

**KPI-U2: Service utilization (ρ_service)**
Analogicky:
[
UtilService=\frac{ServiceBusyTime}{ServiceCapacityMinutes}
]

**KPI-U3: Tables utilization (ρ_tables)**
**Definice:** Vytížení seating kapacity (seats).
- tables_busy_time = Σ(seat_time_i × party_size_i)
- tables_capacity_minutes = seats_total × Σ(daypart_duration_minutes)
[
UtilTables=\frac{TablesBusyTime}{TablesCapacityMinutes}
]
**Pozn.:** Při použití tables_count místo seats_total:
[
TablesCapacityMinutes = tables_count \times \sum daypart_duration
]
a busy_time bez party_size.

**5) KPI katalog — “Týden vs den vs daypart” (agregace)**
Pro baseline dashboard budeš chtít agregace:
- po dni (weekday)
- po daypartu
- (volitelně) heatmapu daypart×weekday
**KPI-A1: Revenue by weekday**
**Data source:** baseline_daypart_data
[
Revenue_{weekday=d}=\sum_p arrivals_{d,p}\times spend_{d,p}
]
**KPI-A2: Arrivals by daypart**
[
Arrivals_{daypart=p}=\sum_d arrivals_{d,p}
]
**KPI-A3: Labor cost by daypart**
[
LaborCost_{daypart=p}=\sum_{d,r} staff_{d,p,r}\times rate_{d,p,r}\times hours_{d,p,r}
]

**6) KPI katalog — Scénářové KPI (delta)**
Pro porovnání baseline vs scénář:
**KPI-S1: Δ Profit (difference)**
[
\Delta Profit = Profit_{scenario} - Profit_{baseline}
]
**KPI-S2: Δ P90 wait food**
[
\Delta P90WaitFood = P90WaitFood_{scenario} - P90WaitFood_{baseline}
]
**KPI-S3: Profit improvement probability (z Monte Carlo)**
Pokud máš hodnoty profit per run:
[
P(Profit_{scenario} > Profit_{baseline}) \approx \frac{#{i: profit_{sc,i} > profit_{base,i}}}{runs}
]
Pro BP: můžeš použít i jednodušší: P(Profit_scenario > target).

**7) KPI katalog — Simulační summary statistiky**
Pro každé KPI z simulation_runs.metrics_json počítej:
- mean:
[
\mu = \frac{1}{n}\sum x_i
]
- median
- p10, p90 (percentily)
**Data source:** simulation_runs → agregace do simulation_summary

**8) Data Health (BP jednoduché KPI)**
**KPI-H1: Coverage score**
**Definice:** procento splněných kontrol povinných vstupů.
**Data source:** existence záznamů v tabulkách.
Příklad kontrol:
- dayparts existují
- baseline_daypart_data má všech 7×N záznamů
- staffing_plan má pro každý 7×N alespoň kitchen
- simulation_params existují
- cost_settings existují
[
CoverageScore = \frac{#OK}{#Total} \times 100
]
**KPI-H2: Actionability score**
**Definice:** jednoduché skóre spolehlivosti rozhodování (BP).
**Data source:** počet baseline_week + missing klíčových dat.
Např.:
- 1 týden = 25 bodů
- +10 bodů pokud máš balking limity/triangular parametry vyplněné
- −10 bodů za každou klíčovou chybějící oblast (staffing, spend, prep/seat)

**9) Doporučený “core KPI set” pro BP UI**
Aby UI nebylo přeplácané, dej jako default:
**Finance:**
- Revenue (mean + baseline)
- Profit (mean + p10/p90)
- Prime cost % (pokud používáš food_cost_pct)
**Fronty:**
- Avg wait food + P90 wait food
- Lost groups
**Kapacity:**
- Util kitchen
- Util tables
**Podpůrné:**
- Coverage/Actionability

**10) Poznámky pro implementaci (aby vzorce seděly)**
- Baseline Revenue je **deterministický estimate** z agregací.
- Simulation Revenue je **stochastic**, protože served_groups se mění kvůli balkingu/kapacitám.
- LaborCost drž deterministický (ze staffing), ať máš čistý experiment “kapacita vs wait/profit”.
- Pokud chceš, aby staffing ovlivňoval labor přímo, pořád je deterministický, jen se mění scénářem.


---



## BP - metrics.docx

_Původní soubor: BP - metrics.docx_

# BP - metrics.docx

_Source: BP - metrics.docx_

Jasně — tady je **konkrétní seznam metrik** rozdělený na:
- **Primary metrics** (vždy zobrazovat – hlavní KPI karty + hlavní grafy)
- **Secondary metrics** (v detailu / rozbalovací sekce)
- **Health metrics** (vždy viditelné, ale menší)
- Doporučené **“compare set”** (co ukázat side-by-side baseline vs scénář)

Vše je přímo v metrikových klíčích, které jsme sjednotili.

**1) Primary metrics (Default UI)**

Minimum, co budeš ukazovat vždy. Je to “silné” pro BP: zisk + fronty + kapacity + ztráty.

**Finance (karty)**
- finance.revenue
- finance.profit

**Fronty / kvalita služby (karty)**
- queue.wait_food *(v summary zobraz hlavně mean a p90)*
- demand.lost_groups

**Kapacity (karty)**
- util.kitchen
- util.tables

**Demand / výkon (karta nebo graf)**
- demand.served_groups

✅ **Primary set = 7 metrik**
(optimální počet pro přehledný dashboard)

**2) Secondary metrics (Detail / “Show more”)**

Zobrazovat po rozkliknutí nebo na druhé záložce “Detail”.

**Finance (detail)**
- finance.cogs
- finance.labor_cost
- finance.fixed_cost
- finance.profit_margin
- finance.labor_cost_ratio
- finance.prime_cost_ratio

**Fronty a časy (detail)**
- queue.wait_table *(mean/p90)*
- time.system_time *(mean/p90)*

**Demand (detail)**
- demand.arrivals_groups
- demand.service_level

**Kapacity (detail)**
- util.service *(pokud modeluješ service tokeny; jinak schovej)*

**3) Health metrics (vždy viditelné, malé)**

Na dashboardu i u výsledků simulace, aby bylo jasné “jak moc tomu věřit”.

- health.coverage_score
- health.actionability_score

**4) “Compare set” (baseline vs scénář side-by-side)**

Co ukážeš ve srovnávacím panelu + v tabulce scénářů.

**Must-have compare**
- finance.profit *(mean, p10, p90)*
- queue.wait_food *(mean, p90)*
- util.kitchen *(mean)*
- util.tables *(mean)*
- demand.lost_groups *(mean)*
- finance.revenue *(mean)*
- demand.served_groups *(mean)*

**Nice-to-have compare (pokud se vejde)**
- finance.prime_cost_ratio *(mean)*
- queue.wait_table *(mean, p90)*

**5) Doporučené grafy podle metrik (aby UI sedělo)**

**Dashboard (baseline)**
- Bar/line: finance.revenue po weekday
- Heatmap: demand.arrivals_groups weekday × daypart
- Bar: finance.labor_cost po daypart (secondary)
- Bar: demand.arrivals_groups po daypart

**Simulation results**
- Side-by-side bar (mean): finance.profit, finance.revenue
- Interval band (p10–p90): finance.profit
- Interval band (p10–p90): queue.wait_food
- Bars: util.kitchen, util.tables
- Bar: demand.lost_groups

**6) Doporučené “primary metrics” pro tabulku scénářů**

Jedna řádka = scénář, sloupce:
- Profit mean (finance.profit.mean)
- Profit p10 (finance.profit.p10)
- Profit p90 (finance.profit.p90)
- Wait food p90 (queue.wait_food.p90)
- Lost groups mean (demand.lost_groups.mean)
- Util kitchen mean (util.kitchen.mean)
- Util tables mean (util.tables.mean)

Tohle je krásně obhajitelné v BP: **zisk + riziko + kvalita služby + kapacita**.

**7) Praktická poznámka (aby to šlo typovat a renderovat snadno)**

V kódu si můžeš držet tyhle sety jako konstanty:
- PRIMARY_METRICS: MetricKey[]
- SECONDARY_METRICS: MetricKey[]
- COMPARE_METRICS: MetricKey[]
- HEALTH_METRICS: MetricKey[]

a UI podle toho generovat karty/tabulky automaticky z metric_catalog.


---



## BP - MVP.docx

_Původní soubor: BP - MVP.docx_

# BP - MVP.docx

_Source: BP - MVP.docx_

Níže máš **kompletní zadání / dokumentaci aplikace v rozsahu vhodném pro bakalářku**. Je to pořád ucelené, “chytré a hezké”, ale už je to **realistické** na implementaci s pomocí AI a zároveň to dobře sedí na téma *simulační modelování + teorie front + AI nástroje + webová vizualizace*.

**BP Zadání webové aplikace: Simulační modelování + AI pro optimalizaci provozu restaurace (MVP)**
**1) Název a účel**
**Pracovní název:** Restaurant Simulation Dashboard (RSD)
**Typ:** Webová aplikace (single-tenant pro jednu restauraci / demo dataset), připravená pro rozšíření.
**Účel:** Umožnit na základě dat z **jednoho týdne**:
- zobrazit reálné provozní a finanční KPI,
- vytvořit “what-if” scénáře (dočasné změny),
- spustit simulační model (teorie front / systém hromadné obsluhy),
- porovnat scénáře a interpretovat výsledky,
- využít AI (ChatGPT) pro vysvětlování KPI a návrh dalších scénářů.
Cílem BP není enterprise produkt, ale funkční prototyp, který demonstruje přínos simulací a AI při rozhodování v gastronomii.

**2) Kontext a motivace (pro text BP)**
Restaurace je systém hromadné obsluhy: zákazníci přichází náhodně v čase, vznikají fronty (kuchyň, obsluha), kapacity jsou omezené (stoly, personál). Správným nastavením personálu, cen a otevírací doby lze optimalizovat zisk, čekací dobu a kvalitu služby. Reálný provoz však nelze bez rizika “testovat”, proto aplikace umožňuje test scénářů pomocí simulačního modelu a vizualizace výsledků. AI nástroje podporují vývoj a interpretaci.

**3) Rozsah (co MVP pro BP obsahuje)**
**3.1 Co aplikace implementuje**
- **Datový vstup** pro 1 týden (ruční zadání nebo import CSV).
- **Dashboard reálných KPI** (finance + provozní ukazatele).
- **Scenario Builder**: vytvoření scénářů změn (ceny, personál, otevírací doba, kapacita stolů).
- **Simulační model** v Pythonu (DES / teorie front, implementace např. SimPy) s opakováním běhů (seed).
- **Výsledky simulace**: baseline vs scénář + intervaly nejistoty.
- **AI panel**: vysvětlení KPI a interpretace změn + návrh scénářů + generování “scenario JSON”.
**3.2 Co MVP neimplementuje (jen jako návrh do “budoucího rozšíření”)**
- plná historizace capabilities (SCD2) – v BP není nutná (máš 1 týden)
- korelační copula matice (pokročilá statistika)
- reverse goal-seeking optimalizace (automatické hledání kombinací změn)
- inventory expirace/waste detail (batches)
- AI feedback loop (měření reálných outcome po implementaci doporučení)

**4) Typy podniků a modularita (BP verze)**
Aplikace bude v BP primárně cílit na **dine-in restauraci** (stoly + kuchyň).
Aby byla “univerzálnější”, bude mít jednoduchý přepínač režimu:
- **Dine-in režim (default)**: stoly, seat time, RevPASH, čekání.
- **Delivery-only režim (volitelně)**: bez stolů, místo toho SLA / throughput.
Pro BP stačí implementovat dine-in; delivery-only může být uveden jako rozšíření nebo jako jednoduché vypnutí stolů.

**5) Vstupní data (1 týden) – specifikace**
Aplikace musí fungovat i bez detailních POS dat. V BP se použije minimální dataset, který se dá reálně změřit za týden.
**5.1 Základní nastavení restaurace**
- Měna
- Otevírací doba po dnech
- Dayparts (např. Oběd, Večeře; nebo 3–5 bloků)
- Počet stolů a míst (celkově)
- Role personálu (minimálně: kuchyň, obsluha)
**5.2 Poptávka (týdenní vzor)**
Pro každý den a daypart:
- počet příchozích skupin / hostů (nebo počet objednávek)
- průměrná velikost skupiny (nepovinné, lze nastavit fixně)
- průměrná útrata na skupinu (nebo na osobu)
Alternativně: detailní seznam objednávek (timestamp + total). Pro BP stačí agregace.
**5.3 Časy a rozdělení (triangular)**
- **Prep time (kuchyň)**: min / typ / max (globálně nebo per daypart)
- **Seat time (dine-in)**: min / typ / max (globálně nebo per daypart)
**5.4 Personál (kapacita)**
Pro každý den a daypart:
- počet kuchařů
- počet obsluhy
- hodinová sazba (nebo celkový náklad na směnu)
**5.5 Náklady**
- Fixní náklady (měsíční, přepočet na týden)
- Volitelné: food cost % (pokud chceš hrubou marži)

**6) KPI a výstupy (reálná data i simulace)**
**6.1 Finanční KPI**
- Tržby (týden, den, daypart)
- Odhad COGS (food cost %)
- Mzdové náklady (ze směn)
- Fixní náklady (průměr na týden)
- Zisk (profit estimate)
- Prime cost % (pokud máš COGS + mzdy)
**6.2 Provozní KPI**
- Vytíženost stolů (utilization)
- Vytíženost kuchyně a obsluhy (resource utilization)
- Průměrná čekací doba na jídlo (wait time kitchen queue)
- P90 čekací doby (kvalita služby)
- Počet odmítnutých zákazníků (balking), pokud čekání přesáhne limit
- RevPASH (volitelně, pokud máš seats + revenue)
**6.3 KPI pro porovnání scénářů**
- Δ profit, Δ revenue
- změna wait time (avg/p90)
- změna utilization
- tradeoff “zisk vs kvalita služby”

**7) Scénáře (BP verze – konkrétní změny)**
Aplikace umožní vytvořit několik scénářů a porovnat je.
**7.1 Typy změn (MVP)**
- **Personál:** přidat/odebrat kuchaře nebo obsluhu v konkrétní den/daypart
- **Ceny:** zvýšit/snížit průměrnou útratu (nebo ceny v %)
- **Otevírací doba:** prodloužit/zkrátit vybrané dny
- **Kapacita stolů:** změnit počet stolů/míst (např. přidání zahrádky) *(pro BP jako jednoduchý parametr)*
**7.2 Elasticita (zjednodušeně)**
Změna ceny ovlivní poptávku:
- uživatel nastaví jednoduchý koeficient elasticity (default)
- např. +10 % cena → -x % poptávka
V BP stačí jednoduchý lineární vztah, s jasným upozorněním na nejistotu.

**8) Simulační model (hlavní část BP)**
**8.1 Zvolený typ simulace**
**Discrete-event simulation (DES)**, protože:
- odpovídá teorii front,
- umožňuje modelovat fronty a kapacity realisticky,
- je dobře popsatelná v BP (metodika, validace, experimenty).
**8.2 Entity a zdroje**
**Entity:**
- “Customer group / Visit” (skupina hostů)
**Zdroje (Resources):**
- Tables (kapacita = počet stolů nebo počet míst)
- Kitchen (kapacita = počet kuchařů v daypartu)
- Service (kapacita = počet obsluhy v daypartu) *(volitelně; lze zjednodušit)*
**8.3 Proces (tok událostí)**
- Příchod skupiny (arrival)
- Čekání na stůl (pokud full → fronta / nebo balking po limitu)
- Usazení
- Vznik objednávky → fronta kuchyně
- Příprava jídla (prep time ~ triangular)
- Obsluha doručí jídlo (volitelný krátký service time)
- Skupina zůstává (seat time ~ triangular), případně:
  - **seat_time závisí na čekání**:
seat_time = base_seat + alpha * kitchen_wait
(jednoduchý způsob korelace bez copula)
- Odchod a uvolnění stolu
**8.4 Poptávka (arrivals)**
- Pro každý daypart se nastaví míra příchodů (λ) odvozená z reálných dat týdne.
- V simulaci se arrivals generují jako Poisson proces (nebo empiricky).
**8.5 Výstupy z běhu simulace**
- počet obsloužených skupin
- revenue estimate (skupiny × průměrná útrata)
- wait times (avg, p90)
- utilization tables/kitchen/service
- počet odmítnutých (pokud balking)
- profit estimate (revenue − labor − fixed − cogs%)
**8.6 Opakování běhů (nejistota)**
- Každý scénář běží např. **200 běhů** se seedem.
- Výsledky se shrnou:
  - mean, median, p10–p90

**9) AI integrace (BP verze – realisticky implementovatelná)**
**9.1 Co AI dělá v MVP**
- vysvětlí KPI a grafy (Explain)
- shrne rozdíly scénáře vůči baseline (Interpret)
- navrhne 2–3 další scénáře (Suggest)
- umí vygenerovat návrh scénáře jako JSON (Build scenario)
**9.2 Princip “kontextu”**
AI dostane:
- KPI summary (baseline vs scénář)
- definice metrik
- upozornění “1 týden dat → nízká spolehlivost”
- parametry scénáře
AI se nesmí opírat o nic mimo poskytnutý kontext.

**10) UI/UX – obrazovky (BP verze)**
**10.1 Setup / Data Input**
- nastavení restaurace (stoly, role, otevírací doba, dayparts)
- zadání týdenních dat (poptávka, útrata, směny)
- zadání triangular parametrů
- jednoduchý “Data Health” panel:
  - “Máte pouze 1 týden – predikce jsou orientační.”
**10.2 Dashboard – Reálná statistika**
- KPI karty
- grafy po dnech/daypartech
- základní interpretace (text)
- AI shrnutí
**10.3 Scenario Builder**
- výběr baseline
- úprava parametrů (staff, ceny, hodiny, stoly)
- uložit scénář A/B/C
**10.4 Simulation Results**
- spustit simulaci (počet běhů)
- výsledky: mean/median/p10/p90
- grafy baseline vs scénář
- AI interpretace + návrh dalšího scénáře

**11) Minimální datový model (BP verze)**
Pro BP nepotřebuješ všechny tabulky z velké vize. Stačí jednoduchý model:
**venue_settings**
- currency, open_hours, seats, tables_count
- dayparts definice
**weekly_baseline**
- week_start_date
- pro každý daypart:
  - arrivals (skupiny)
  - avg_spend
  - avg_party_size (optional)
**staffing_plan**
- week_start_date
- daypart_id, role (kitchen/service), staff_count, hourly_rate
**simulation_params**
- prep_time triangular (min/typ/max)
- seat_time triangular (min/typ/max)
- balking thresholds
- elasticity
**scenarios**
- scenario_id, name, description
- overrides (JSON): staffing changes, price changes, opening hours changes, tables changes
**simulation_runs**** + ****simulation_summary**
- summary výsledků per scénář
**ai_messages**** (volitelně)**
- uložit AI shrnutí (pro demonstraci)

**12) Doporučený tech stack (BP)**
- Frontend: React + TypeScript + Recharts
- Backend: Python FastAPI
- Simulace: SimPy + numpy/pandas
- DB: PostgreSQL nebo SQLite (pro BP klidně SQLite)
- AI: ChatGPT API (prompt + function calling na “scenario JSON”)

**13) Experimenty (co přesně uděláš do BP)**
Navržená sada experimentů:
- baseline
- +1 kuchař (sobota večeře)
- +1 obsluha (pátek večeře)
- zvýšení ceny o 8 % (s elasticitou)
- zkrácení otevírací doby ve slabém daypartu
- kombinovaný scénář (např. +1 kuchař + menší zdražení)
Vyhodnocení:
- profit vs wait time tradeoff
- doporučení “nejlepší” scénář podle cíle (např. zisk při zachování p90 wait < limit)

**14) Nefunkční požadavky (BP)**
- aplikace musí být stabilní a reprodukovatelná (seeds)
- simulace běží do pár sekund (nebo asynchronně)
- grafy musí být čitelné a porovnatelné
- transparentní výpočty a definice KPI

**15) Výstupy do bakalářky (co doložíš)**
- popis dat a jejich omezení (1 týden)
- popis modelu (entity, zdroje, fronty, proces)
- implementace simulace (SimPy)
- experimenty a interpretace výsledků
- jak AI pomohla (vývoj + interpretace + návrh scénářů)
- webová aplikace jako vizualizační vrstva

**Krátký závěr: proč je to “tak akorát” pro BP**
- Máš **simulační model s teorií front** (hlavní akademický přínos).
- Máš **AI** jako nástroj pro vývoj i interpretaci (téma BP).
- Máš **webovou aplikaci** pro vizualizaci a scénáře (praktický výstup).
- Nevytváříš enterprise systém, ale pořád působíš promyšleně.


---



## BP - pseudo.docx

_Původní soubor: BP - pseudo.docx_

# BP - pseudo.docx

_Source: BP - pseudo.docx_

Níže máš **přesný popis simulačního modelu** (BP-MVP) jako **pseudokód** + **kompletní seznam metrik** (včetně definic a jak se počítají). Je to navržené pro implementaci v **SimPy (DES)** a pro popis do bakalářky (fronty, zdroje, proces, experimenty).

**1) Model: koncept a entity**
**1.1 Jednotka simulace**
- Simulujeme **jeden týden** (Po–Ne) rozdělený na **dayparty**.
- Pro každý den/daypart známe:
  - počet příchodů skupin (arrivals_groups)
  - průměrná útrata za skupinu
  - průměrná velikost skupiny (volitelně)
  - staffing (kitchen/service)
- Stochasticita:
  - šum poptávky (demand_noise_pct)
  - triangular rozdělení časů (prep a seat)
  - Poisson příchody (exponenciální mezery)
**1.2 Zdroje (resources)**
- Tables (kapacita = seats_total nebo zjednodušeně tables_count)
**Doporučení:** pro BP používej seats_total jako kapacitu.
- Kitchen (kapacita = počet kuchařů v daném daypartu)
- Service (kapacita = počet obsluhy v daném daypartu) – může být zjednodušené (krátká doba)
**1.3 Entity**
- Group (návštěva / skupina hostů)
  - arrival_time
  - party_size
  - spend
  - wait_table, wait_food
  - total_time_in_system
  - served / lost

**2) Vstupy modelu (strukturovaně)**
**2.1 Baseline data (na týden)**
Pro každé (weekday, daypart):
- arrivals_groups (int)
- avg_party_size (float, default 2.0)
- avg_spend_per_group (float)
Pro každé (weekday, daypart, role):
- staff_count (int)
- hourly_rate (float)
- hours_in_daypart (float)
Globální:
- fixed_cost_week
- food_cost_pct (0–1)
**2.2 Simulační parametry**
- prep_time_min/mode/max (minuty)
- seat_time_min/mode/max (minuty)
- alpha_seat_wait (0–0.3 typicky)
- balking_wait_table_limit (minuty; 0 = vypnuto)
- balking_wait_food_limit (minuty; 0 = vypnuto)
- demand_noise_pct (např. 0.2 = ±20 %)
- price_elasticity (např. -1.2)
- price_delta (ze scénáře; např. +0.08)

**3) Jak scénář upraví vstupy**
Před simulací se na baseline aplikuje overrides_json:
- staffing delta pro vybrané dayparty a role
- price change → price_delta
- capacity change → seats_total/tables_count

**4) Pseudokód: 1 běh simulace (SimPy styl)**
Níže je pseudokód blízko implementaci v SimPy.
**4.1 Pomocné funkce**
**4.1.1 Triangular sampling**
function sample_triangular(min, mode, max, rng):
    return rng.triangular(min, mode, max)
**4.1.2 Výpočet poptávky pro daypart (noise + elasticita)**
function compute_effective_arrivals(arrivals_base, demand_noise_pct, price_elasticity, price_delta, rng):
    noise_factor = 1 + rng.uniform(-demand_noise_pct, +demand_noise_pct)

    # Elasticita: dQ/Q ≈ elasticity * dP/P
    # price_delta = +0.08 znamená +8%
    demand_factor = 1 + (price_elasticity * price_delta)

    arrivals = arrivals_base * noise_factor * demand_factor
    arrivals = max(0, round(arrivals))
    return arrivals
**4.1.3 Generování mezery mezi příchody (Poisson proces)**
Pokud arrivals je očekávaný počet příchodů v daypartu o délce T:
- λ = arrivals / T (příchody za minutu)
- mezera ~ Exponential(rate=λ)
function sample_interarrival_time(arrivals, daypart_duration_minutes, rng):
    if arrivals <= 0:
        return INF
    rate = arrivals / daypart_duration_minutes   # per minute
    return rng.exponential(1 / rate)             # mean = 1/rate

**4.2 Simulační běh – main**
**4.2.1 Definice metrik a sběru**
function simulate_week(inputs, seed) -> metrics:
    rng = Random(seed)
    env = SimPy.Environment()

    # Resources
    tables = SimPy.Resource(env, capacity=inputs.seats_total)  # nebo tables_count
    kitchen = SimPy.Resource(env, capacity=1)  # capacity se bude měnit dle daypartu (viz níže)
    service = SimPy.Resource(env, capacity=1)  # volitelně

    # Metriky sběru
    served_groups = 0
    lost_groups = 0

    wait_table_list = []
    wait_food_list = []
    system_time_list = []

    revenue = 0.0

    # Busy-time tracking (pro utilization)
    kitchen_busy_time = 0.0
    service_busy_time = 0.0
    tables_busy_time = 0.0
    # Pozn.: u tables busy_time = doba obsazení * party_size (pokud seats jako capacity)

    # Pro výpočet denominačních kapacit
    kitchen_capacity_minutes = 0.0
    service_capacity_minutes = 0.0
    tables_capacity_minutes = 0.0  # seats_total * open_minutes (pro dayparts)
**4.2.2 Plánování daypart procesů**
Pro každý den a daypart spustíme proces generující příchody:
    for each weekday in 0..6:
        for each daypart in dayparts:
            dp = inputs.get_daypart(weekday, daypart.id)
            staff_k = inputs.get_staff(weekday, daypart.id, role="kitchen")
            staff_s = inputs.get_staff(weekday, daypart.id, role="service")

            dp_start = compute_week_minute_offset(weekday, daypart.start_time)
            dp_end   = compute_week_minute_offset(weekday, daypart.end_time)
            dp_duration = dp_end - dp_start

            # Kapacitní denominátory (pro utilization)
            kitchen_capacity_minutes += dp_duration * staff_k.staff_count
            service_capacity_minutes += dp_duration * staff_s.staff_count
            tables_capacity_minutes  += dp_duration * inputs.seats_total

            # Naplánuj proces daypartu, který dočasně nastaví kapacity
            env.process(run_daypart(env, dp_start, dp_duration, dp, staff_k, staff_s))
**4.2.3 Run simulation**
    env.run(until = TOTAL_WEEK_MINUTES)   # např. 7*24*60 nebo do posledního daypart_end
**4.2.4 Náklady a profit**
Labor cost spočítáme deterministicky z plánů (na týden):
    labor_cost = 0.0
    for each staffing_row:
        labor_cost += staffing_row.staff_count * staffing_row.hourly_rate * staffing_row.hours_in_daypart

    cogs = revenue * inputs.food_cost_pct
    profit = revenue - cogs - labor_cost - inputs.fixed_cost_week
**4.2.5 Percentily a metriky**
    metrics = {
        "revenue": revenue,
        "profit": profit,
        "served_groups": served_groups,
        "lost_groups": lost_groups,
        "avg_wait_table": mean(wait_table_list) if not empty else 0,
        "p90_wait_table": percentile(wait_table_list, 90) if not empty else 0,
        "avg_wait_food": mean(wait_food_list) if not empty else 0,
        "p90_wait_food": percentile(wait_food_list, 90) if not empty else 0,
        "avg_system_time": mean(system_time_list) if not empty else 0,
        "p90_system_time": percentile(system_time_list, 90) if not empty else 0,
        "util_kitchen": kitchen_busy_time / kitchen_capacity_minutes if kitchen_capacity_minutes>0 else 0,
        "util_service": service_busy_time / service_capacity_minutes if service_capacity_minutes>0 else 0,
        "util_tables": tables_busy_time / tables_capacity_minutes if tables_capacity_minutes>0 else 0
    }
    return metrics

**4.3 Daypart proces: nastaví kapacity a generuje příchody**
V SimPy nejde snadno měnit Resource.capacity v průběhu; prakticky se to řeší:
- buď vytvoříš “Resource per daypart”,
- nebo použiješ Container/PriorityResource,
- nebo (pro BP) zjednodušíš: kapacitu kuchyně a obsluhy držíš konstantní pro celý týden jako průměr.
**Doporučený BP kompromis:**
- kitchen_capacity = max staff_count přes všechny dayparty a uvnitř daypartu “omezuješ” tím, že každá obsluha/kuchař obslouží jen v daném okně (to je složitější).
- Jednodušší je implementovat: **spouštěj simulaci po daypartech sekvenčně** a pro každý daypart vytvoř nové resources s příslušnou kapacitou. To je pro BP úplně v pořádku a dobře se popisuje.
**Varianta pro BP: simulace sekvenčně per daypart**
Místo 1 env pro celý týden:
- Pro každý daypart vytvoříš krátkou simulaci (env od 0 do dp_duration) a neseš backlog?
To ale komplikuje návaznost přes dayparty.
**Lepší BP varianta:** jeden env pro týden, ale resources kapacity držet jako Resource(capacity = staff_count_current) přes wrapper, který se přepíná. Nejjednodušší čistý způsob je použít **simpy.PreemptiveResource** nebo si napsat “token pool” přes Container.
Abych to držel implementovatelně, dávám pseudokód v modelu “token pool”:
**Token pool řešení (implementační pseudokód)**
- kitchen_tokens = simpy.Container(capacity=MAX_KITCHEN, init=0)
- na startu daypartu doplníš tokeny na staff_count, na konci je odebereš
- každý prep proces si musí vzít 1 token, držet ho po dobu prep, pak vrátit
**Pseudokód ****run_daypart**
process run_daypart(env, dp_start, dp_duration, dp_data, staff_k, staff_s):
    yield env.timeout(dp_start - env.now)

    # nastav dostupné tokeny pro tento daypart
    set_tokens(kitchen_tokens, staff_k.staff_count)
    set_tokens(service_tokens, staff_s.staff_count)

    arrivals_eff = compute_effective_arrivals(
        dp_data.arrivals_groups,
        inputs.demand_noise_pct,
        inputs.price_elasticity,
        inputs.price_delta,
        rng
    )

    env.process(generate_arrivals(env, dp_duration, arrivals_eff, dp_data))

    yield env.timeout(dp_duration)

    # uzavři daypart (volitelně: nechat doběhnout rozpracované procesy)
    # pro BP doporučení: NEZASTAVOVAT rozpracované, jen přestat generovat nové arrivals.
**Pseudokód ****generate_arrivals**
process generate_arrivals(env, dp_duration, arrivals_eff, dp_data):
    t_end = env.now + dp_duration
    while env.now < t_end:
        delta = sample_interarrival_time(arrivals_eff, dp_duration, rng)
        if env.now + delta >= t_end:
            break
        yield env.timeout(delta)

        # vytvoř skupinu
        group = new Group()
        group.party_size = sample_party_size(dp_data.avg_party_size, rng)   # např. round-normal nebo fix
        group.spend = dp_data.avg_spend_per_group

        env.process(group_process(env, group))

**4.4 Proces skupiny (Group/Visit)**
process group_process(env, group):
    arrival_time = env.now

    # 1) čekání na stůl (kapacita seats)
    # Pokud seats_total je kapacita, skupina potřebuje group.party_size tokenů.
    start_wait_table = env.now
    success = yield request_seats_or_balk(env, tables_seats_container, group.party_size, inputs.balking_wait_table_limit)
    if not success:
        lost_groups += 1
        return
    wait_table = env.now - start_wait_table

    # 2) objednávka -> kuchyň (1 token)
    start_wait_food = env.now
    success_kitchen = yield request_token_or_balk(env, kitchen_tokens, 1, inputs.balking_wait_food_limit)
    if not success_kitchen:
        # zákazníci odešli kvůli čekání na jídlo:
        release_seats(tables_seats_container, group.party_size)
        lost_groups += 1
        return

    # 3) příprava jídla
    prep_time = sample_triangular(prep_min, prep_mode, prep_max, rng)

    # kitchen busy time přičti
    kitchen_busy_time += prep_time

    yield env.timeout(prep_time)

    # vrať kuchyň token
    kitchen_tokens.put(1)

    wait_food = env.now - start_wait_food

    # 4) servis jídla (volitelné)
    # pro BP může být service_time malé konstantní (např. 1 min) nebo triangular
    service_time = 1.0
    success_service = yield request_token_or_balk(env, service_tokens, 1, 0)  # balking pro service nedává smysl
    if success_service:
        service_busy_time += service_time
        yield env.timeout(service_time)
        service_tokens.put(1)

    # 5) doba sezení (seat time) + jednoduchá korelace s wait_food
    base_seat = sample_triangular(seat_min, seat_mode, seat_max, rng)
    seat_time = base_seat + inputs.alpha_seat_wait * wait_food

    # tables busy time vážené party_size
    tables_busy_time += seat_time * group.party_size

    yield env.timeout(seat_time)

    # 6) odchod
    release_seats(tables_seats_container, group.party_size)

    served_groups += 1
    revenue += group.spend

    wait_table_list.append(wait_table)
    wait_food_list.append(wait_food)
    system_time_list.append(env.now - arrival_time)
**Poznámka k “seats jako container”**
- tables_seats_container = simpy.Container(capacity=seats_total, init=seats_total)
- “request seats” = yield container.get(party_size) ale s timeoutem, pokud balking
**Pseudokód request with balking**
function request_seats_or_balk(env, seats_container, seats_needed, limit_minutes):
    if limit_minutes <= 0:
        yield seats_container.get(seats_needed)
        return True

    req = seats_container.get(seats_needed)
    res = yield req | env.timeout(limit_minutes)

    if req in res:
        return True
    else:
        # timeout -> balk
        return False
Podobně pro tokeny v kuchyni.

**5) Pseudokód: runner pro N běhů + summary**
function run_simulations(inputs, runs, base_seed):
    results = []

    for i in 0..runs-1:
        seed = base_seed + i
        metrics = simulate_week(inputs, seed)
        results.append(metrics)

    summary = {}
    for each metric_key in metrics_keys:
        values = [r[metric_key] for r in results]
        summary[metric_key] = {
            "mean": mean(values),
            "median": median(values),
            "p10": percentile(values, 10),
            "p90": percentile(values, 90)
        }

    return summary, results(optional)

**6) Seznam metrik (kompletní) + definice**
Níže jsou metriky rozdělené podle typu. Pro BP doporučuju v UI zobrazit **hlavních 8–10**, zbytek mít v detailu.
**6.1 Demand / Throughput**
- **arrivals_groups_total**
Celkový počet příchozích skupin (po aplikaci noise+elasticity)
*Sběr:* součet generovaných group procesů
- **served_groups**
Počet obsloužených skupin (dokončily visit)
- **lost_groups**
Počet skupin, které odešly (balking na stůl nebo na jídlo)
- **service_level_served_pct**
served_groups / (served_groups + lost_groups)
(pokud balking zapnut)
**6.2 Čekací doby (fronty)**
- **wait_table** (per group)
Čas od příchodu do získání stolů
- **avg_wait_table**
Průměr wait_table přes obsloužené skupiny
- **p90_wait_table**
90. percentil wait_table
- **wait_food** (per group)
Čas od objednávky do dokončení přípravy (prep done)
(může zahrnovat čekání na kuchyň token + samotný prep)
- **avg_wait_food**, **p90_wait_food**
- **system_time** (per group)
Celkový čas v systému: arrival → departure
- **avg_system_time**, **p90_system_time**
**6.3 Utilization (vytížení)**
- **util_tables**
tables_busy_time / tables_capacity_minutes
- tables_busy_time = Σ(seat_time * party_size)
- tables_capacity_minutes = seats_total * Σ(daypart_duration)
- **util_kitchen**
kitchen_busy_time / kitchen_capacity_minutes
- kitchen_busy_time = Σ(prep_time) pro všechny obsloužené skupiny
- kitchen_capacity_minutes = Σ(daypart_duration * staff_count_kitchen)
- **util_service**
obdobně pro service (pokud modeluješ)
**6.4 Finance (estimate)**
- **revenue**
Σ(spend_per_group) pro served_groups
(případně spend_per_person * party_size)
- **cogs_estimate**
revenue * food_cost_pct
- **labor_cost**
Σ(staff_count * hourly_rate * hours_in_daypart) přes všechny dayparty/role
(deterministicky z plánů, nezávisle na náhodě)
- **fixed_cost_week**
vstup
- **profit**
revenue - cogs_estimate - labor_cost - fixed_cost_week
- **profit_margin_pct**
profit / revenue (pokud revenue>0)
**6.5 “Kvalita služby” (odvozené)**
- **balking_due_table**
Počet ztracených kvůli čekání na stůl (pokud rozlišuješ)
- **balking_due_food**
Počet ztracených kvůli čekání na jídlo
- **risk_flag_p90_wait_food_over_limit**
Bool/pravděpodobnost (na úrovni summary) že p90 wait_food překročí limit (např. 20 min)

**7) Doporučení pro “hlavní metriky do UI”**
Pro BP MVP zobraz:
- Profit (mean, p10, p90)
- Revenue (mean)
- avg_wait_food + p90_wait_food
- util_kitchen
- util_tables
- lost_groups
- (volitelně) avg_wait_table
A k nim AI interpretaci.

**8) Poznámky k implementaci (aby ses nezasekl)**
- **SimPy Resource vs Container:**
Pro “seats” je Container ideální (potřebuješ get(party_size)).
Pro personál použij Container tokeny (1 token = 1 pracovník).
- **Dayparts kapacity:**
Token pool lze přepínat na startu daypartu (nastavit dostupné tokeny).
Důležité: nezastavuj rozpracované procesy na konci daypartu; jen přestaň generovat nové příchody.
- **Reprodukovatelnost:**
Každý běh má seed → stejné výsledky.


---



## BP - Tech.docx

_Původní soubor: BP - Tech.docx_

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


---

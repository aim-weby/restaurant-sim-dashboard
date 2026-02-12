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

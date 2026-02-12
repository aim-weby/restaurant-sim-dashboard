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

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

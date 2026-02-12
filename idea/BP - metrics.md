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

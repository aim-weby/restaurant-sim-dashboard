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

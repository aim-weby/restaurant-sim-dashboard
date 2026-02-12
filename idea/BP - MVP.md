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

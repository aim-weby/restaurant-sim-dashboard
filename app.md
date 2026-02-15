# Restaurant Simulation Dashboard — Popis aplikace

## 1. Co je to za aplikaci a k čemu slouží

Restaurant Simulation Dashboard je webová aplikace, která pomáhá majitelům a manažerům restaurací lépe porozumět svému provozu a testovat provozní rozhodnutí ještě předtím, než je zavedou v praxi. Funguje jako „digitální dvojče" restaurace — uživatel zadá svá reálná provozní data a aplikace mu umožní klást otázky typu **„co se stane, když…?"**

Například:
- *Co se stane, když přidám jednoho kuchaře v pátek večer?*
- *Jak ovlivní zvýšení cen o 8 % počet hostů a zisk?*
- *Vyplatí se otevřít i v pondělí odpoledne, nebo je lepší tu směnu zrušit?*
- *Kolik hostů denně potřebuji, abych dosáhl cílového obratu?*

Na tyto otázky aplikace odpovídá kombinací **deterministických výpočtů** (okamžité přepočty KPI) a **stochastických simulací** (Monte Carlo přístup s diskrétní simulací událostí), které zachycují přirozenou nejistotu a variabilitu reálného provozu.

---

## 2. Co aplikace umí — přehled funkcí

### 2.1 Zadávání provozních dat

Uživatel zadává data o svém reálném provozu v přehledné tabulkové mřížce. Pro každý den v týdnu a každé denní období (např. oběd, odpoledne, večeře) vyplní:

- **Kolik skupin hostů průměrně přijde** (např. 18 skupin v pátek večer)
- **Kolik průměrně utratí** (např. 620 Kč na skupinu)
- **Průměrnou velikost skupiny** (např. 2,5 osoby)

Dále uživatel nastavuje:
- **Personální obsazení** — kolik kuchařů a servírek pracuje v kterém dni a směně, s hodinovou sazbou
- **Kapacitu restaurace** — počet míst k sezení
- **Náklady** — fixní týdenní náklady (nájem, energie) a procentuální náklady na suroviny
- **Provozní dobu** — kdy je restaurace otevřená
- **Denní období (dayparty)** — definice směn (např. Oběd 11:00–14:00)

Tato data tvoří tzv. **baseline** — realistický obraz normálního týdne, nad kterým se provádějí všechny analýzy.

### 2.2 Automatické přehledy a KPI

Z vložených dat aplikace automaticky vypočítá klíčové provozní ukazatele:

**Finanční ukazatele:**
- Tržby, náklady na suroviny (COGS), mzdové náklady, fixní náklady
- Zisk a zisková marže
- Podíl surovinových a mzdových nákladů na tržbách (prime cost ratio)

**Ukazatele poptávky:**
- Celkový počet skupin hostů za týden
- Průměrná útrata na skupinu
- Rozložení poptávky po dnech a směnách

**Vizualizace:**
- Sloupcové grafy tržeb a návštěvnosti po dnech
- Rozpad po denních obdobích (oběd vs. večeře apod.)
- Heatmapa: den × směna — kde je restaurace nejsilnější/nejslabší

### 2.3 Kontrola kvality dat

Aplikace automaticky kontroluje, zda jsou data kompletní a dostatečná pro spolehlivou analýzu. Upozorní, pokud chybí personální plán, nejsou vyplněny náklady nebo jsou v datech nekonzistence. Výsledkem je skóre **akcionovatelnosti** — zda jsou data připravena pro simulace.

### 2.4 Automatické vhledy (Rule-Based Insights)

Na základě porovnání s průmyslovými benchmarky aplikace generuje doporučení bez nutnosti AI:
- Upozornění na nízkou marži, vysoké surovinové náklady
- Identifikace peak a off-peak období
- Doporučení ke zlepšení

### 2.5 Tvorba scénářů

Uživatel si může vytvořit libovolný počet **scénářů** — pojmenovaných sad změn oproti aktuálnímu stavu:
- Přidat/ubrat personál v konkrétním dni a směně
- Změnit ceny (procentuálně nebo absolutně)
- Změnit kapacitu (přidat/ubrat místa)
- Upravit poptávku (např. +20 % hostů díky marketingové kampani)
- Změnit strukturu nákladů

Tyto scénáře se ukládají a dají se kdykoli znovu spustit, porovnat mezi sebou nebo exportovat.

### 2.6 What-If analýza

Interaktivní režim, kde uživatel táhne posuvníky (počet kuchařů, cena, kapacita, poptávka) a **okamžitě vidí dopad na KPI**. Jde o deterministický přepočet bez simulace — vhodný pro rychlou orientaci.

### 2.7 Stochastická simulace

**Klíčová funkce aplikace** — podrobně popsána v kapitole 3. Simulace modeluje celý týdenní provoz restaurace včetně front, čekání, odmítnutí hostů a variability. Spouští se opakovaně (typicky 200×) a výsledky se agregují do statistických intervalů.

### 2.8 Předdefinované experimenty

Sada 6 experimentů navržených pro bakalářskou práci:
1. **Baseline** — aktuální stav bez změn (kontrolní scénář)
2. **+1 kuchař ve špičce** — aplikace sama detekuje nejsilnější směnu
3. **+1 servírka ve špičce**
4. **Zvýšení cen o 8 %** — s dopadem na poptávku přes cenovou elasticitu
5. **Uzavření nejslabší směny** — simulace zkrácení provozní doby
6. **Kombinace** — +1 kuchař ve špičce + mírné zvýšení cen o 5 %

Výsledky jsou strukturované do tabulky s porovnáním oproti baseline (absolutní a procentuální delta).

### 2.9 Porovnání scénářů

Detailní porovnání dvou scénářů vedle sebe — všechny KPI s barevným zvýrazněním zlepšení/zhoršení.

### 2.10 Trendy v čase

Pokud uživatel zadá více baseline týdnů (např. data za několik měsíců), může sledovat vývoj KPI v čase.

### 2.11 Goal Seek (zpětný výpočet)

Uživatel zadá cílový obrat nebo zisk a aplikace vypočítá, jakou průměrnou návštěvnost nebo útratu na skupinu potřebuje, aby cíle dosáhl.

### 2.12 Report

Komplexní reportovací stránka:
- **Break-even analýza** — kolik hostů je potřeba pro dosažení zisku
- **Citlivostní analýza** — jak se mění zisk při změnách poptávky, cen a nákladů
- Rozpad výkonnosti po denních obdobích

### 2.13 AI funkce (volitelné)

- **AI Insights** — umělá inteligence (GPT-4o-mini) analyzuje KPI a navrhne 3–5 konkrétních doporučení
- **AI Poradce** — chatovací widget, kde se uživatel může ptát na svůj provoz přirozeným jazykem

---

## 3. Simulační model — podrobný popis

### 3.1 Proč diskrétní simulace událostí (DES)?

Provoz restaurace je ze své podstaty **stochastický systém s frontami**. Hosté přicházejí v náhodných časech, čekají na volný stůl, na přípravu jídla, na obsluhu — a každý z těchto kroků trvá proměnlivě dlouho. Klasické analytické vzorce (např. teorie front M/M/c) předpokládají stacionární podmínky a jednoduchou strukturu systému, což pro restauraci s měnícím se personálem, různými směnami a vícekrokovým obsloužením neplatí.

**Diskrétní simulace událostí (DES)** je přístup, kde se systém modeluje jako sled událostí (příchod hosta, začátek přípravy jídla, uvolnění stolu apod.), které mění stav systému v diskrétních okamžicích. Mezi událostmi se čas „přeskočí" — simulace nemusí počítat každou minutu, ale pouze okamžiky, kdy se něco děje. To je výrazně efektivnější než časově diskrétní (time-step) simulace.

**Důvody volby DES:**
- **Přirozeně modeluje fronty a sdílené zdroje** — stoly, kuchaře, servírky jako omezené kapacity, o které soupeří příchozí skupiny hostů
- **Zachycuje variabilitu** — každý běh simulace je jiný díky náhodnosti, což odpovídá realitě
- **Umožňuje detailní modelování procesu obsluhy** — vícefázový proces (čekání → příprava → obsluha → pobyt → odchod)
- **Škálovatelnost** — snadné přidání nových zdrojů nebo fází procesu
- **Reprodukovatelnost** — díky seedování generátoru náhodných čísel jsou výsledky plně opakovatelné

Simulace je implementována pomocí knihovny **SimPy**, která poskytuje framework pro procesně orientovanou DES v Pythonu.

### 3.2 Modelované zdroje

Systém obsahuje tři sdílené zdroje, o které skupiny hostů soupeří:

**Stoly (seats):** Kapacita restaurace vyjádřená jako počet míst k sezení. Každá skupina hostů zabírá tolik míst, kolik má členů. Pokud nejsou volná místa, skupina čeká ve frontě (nebo odejde — viz balking).

**Kuchyně:** Počet kuchařů modelovaný jako „tokeny" — každý kuchař může v daném okamžiku připravovat jídlo pro jednu skupinu. Kapacita kuchyně se mění podle směn — na začátku každého denního období se tokeny doplní podle personálního plánu a na konci odeberou.

**Obsluha:** Počet servírek, obdobně jako kuchyně. Modeluje fázi donesení jídla ke stolu.

### 3.3 Jak se generují příchody hostů

Příchody hostů jsou modelovány jako **Poissonův proces**, což je standardní model pro příchody zákazníků v systémech hromadné obsluhy. Poissonův proces předpokládá, že příchody jsou nezávislé a rovnoměrně rozložené v čase — hosté nepřicházejí v pravidelných intervalech, ale náhodně s danou průměrnou intenzitou.

**Proč Poissonův proces:**
- Je to nejpoužívanější model příchodů v teorii front a simulacích hromadné obsluhy
- Má jedinou parametr (intenzitu λ), který se přímo odvodí z dat uživatele
- Mezičasy příchodů mají exponenciální rozdělení — což odpovídá empirickým pozorováním v restauracích

**Intenzita příchodů** se pro každý daypart odvozuje z dat uživatele, ale s dvěma modifikacemi:

1. **Šum poptávky (demand noise):** Bazální počet skupin se v každém běhu násobí náhodným faktorem (výchozí ±20 %). To modeluje den-ode-dne variabilitu — v reálném provozu nepřijde každý pátek přesně stejný počet hostů.

2. **Cenová elasticita poptávky:** Pokud scénář mění ceny, poptávka se upraví podle ekonomického modelu cenové elasticity. Výchozí hodnota −1,2 znamená, že zvýšení cen o 10 % sníží poptávku o 12 %. To je klíčové pro realistické hodnocení cenových strategií — vyšší ceny přinesou více na jednu skupinu, ale odradí část zákazníků.

**Velikost skupiny** se generuje z normálního rozdělení kolem průměrné velikosti zadané uživatelem, což zachycuje variabilitu mezi páry, rodinami a většími skupinami.

### 3.4 Proces obsluhy skupiny hostů

Každá příchozí skupina prochází šesti fázemi, které modelují celý cyklus návštěvy restaurace:

**Fáze 1 — Čekání na stůl:** Skupina potřebuje tolik míst, kolik má členů. Pokud nejsou volná, čeká ve frontě. Pokud je aktivní mechanismus balkingu (viz níže), po překročení limitu skupina odejde.

**Fáze 2 — Čekání na kuchyni:** Skupina čeká, až bude k dispozici volný kuchař (token). To modeluje situaci, kdy je kuchyně přetížená a nové objednávky čekají.

**Fáze 3 — Příprava jídla:** Doba přípravy je modelována **trojúhelníkovým rozdělením** s parametry: minimum (5 min), modus (12 min), maximum (25 min). Trojúhelníkové rozdělení bylo zvoleno, protože:
- Je intuitivní — uživatel zadá nejkratší, nejpravděpodobnější a nejdelší dobu
- Dodává realistickou asymetrii — většina objednávek se připraví kolem modusu, ale občas trvá výrazně déle
- Je běžně používané v simulacích procesů, kde nejsou k dispozici přesná empirická data

**Fáze 4 — Obsluha (servis):** Krátká fáze modelující donesení jídla ke stolu.

**Fáze 5 — Pobyt u stolu:** Jak dlouho skupina setrvá v restauraci po jídle. Opět trojúhelníkové rozdělení (minimum 30 min, modus 45 min, maximum 75 min). Navíc je zavedena **korelace s čekací dobou na jídlo** — skupiny, které dlouho čekaly, mají tendenci zůstat déle (kompenzační efekt, ale i to, že větší objednávky trvají déle v přípravě i u konzumace).

**Fáze 6 — Odchod:** Skupina uvolní místa u stolu, zaplatí a odejde. Do statistik se zapíše tržba a všechny naměřené časy.

### 3.5 Balking — modelování odchodu netrpělivých hostů

**Balking** je jev, kdy potenciální zákazník odejde, pokud je čekací doba příliš dlouhá. V aplikaci lze nastavit dva limity:

- **Limit čekání na stůl** — pokud se stůl neuvolní do N minut, skupina odejde bez objednání
- **Limit čekání na jídlo** — pokud kuchyně nestíhá a objednávka se nezačne připravovat do N minut, skupina odejde (a uvolní stůl)

Tento mechanismus je důležitý, protože v reálném provozu existují „ztracení zákazníci", kteří se nikdy neobjeví v tržbách, ale znamenají ušlý zisk. Simulace je zachycuje jako **lost_groups** a umožňuje vyhodnotit, zda se vyplatí přidat kapacitu nebo personál.

### 3.6 Správa směn

Provoz restaurace není homogenní — v oběd pracují 2 kuchaři, večer 4. Simulace to řeší dynamickým přidáváním a odebíráním „tokenů" na začátku a konci každého denního období. Každý daypart spouští svůj vlastní proces:

1. Počká na svůj začátek (např. 17:00)
2. Doplní kuchařské a servisní tokeny podle personálního plánu
3. Spustí proud příchodů hostů po celou dobu trvání
4. Nechá doběhnout rozpracované skupiny
5. Odebere tokeny (konec směny)

### 3.7 Co simulace měří

Každý běh simulace sbírá tyto metriky:

**Finanční výsledky:**
- Tržby — součet útrat všech obsloužených skupin
- Zisk — tržby minus náklady na suroviny, mzdy a fixní náklady

**Poptávka a kapacita:**
- Počet obsloužených skupin
- Počet ztracených skupin (balking)

**Čekací doby (fronty):**
- Průměrná a 90. percentil čekací doby na stůl
- Průměrná a 90. percentil čekací doby na jídlo
- Průměrná a 90. percentil celkové doby v systému (od příchodu do odchodu)

**Využití zdrojů (utilization):**
- Využití kuchyně — jaký podíl času byli kuchaři zaneprázdnění
- Využití stolů — jaký podíl kapacity byl obsazený
- Využití obsluhy — jaký podíl času byly servírky zaneprázdněné

Vysoké využití zdrojů (nad 85–90 %) signalizuje úzké místo — systém pracuje na hranici kapacity a každá další poptávka způsobí výrazný nárůst front.

### 3.8 Multi-run agregace a práce s nejistotou

Jeden běh simulace dává jeden možný výsledek. Ale v reálném provozu se každý týden trochu liší — poptávka kolísá, příprava jídla trvá různě dlouho. Proto se simulace spouští **opakovaně (standardně 200×)**, pokaždé s jiným seedem generátoru náhodných čísel.

Z těchto 200 běhů se pro každou metriku vypočítají:
- **Průměr (mean)** — nejpravděpodobnější výsledek
- **Medián** — střední hodnota, robustní vůči extrémům
- **10. percentil (p10)** — pesimistický scénář (v 90 % případů bude výsledek lepší)
- **90. percentil (p90)** — optimistický scénář (v 90 % případů bude výsledek horší)

**Proč multi-run přístup:**
- Bodový odhad nestačí — manažer potřebuje vědět nejen „očekávaný zisk 80 000 Kč", ale i „s 90% pravděpodobností bude zisk mezi 65 000 a 95 000 Kč"
- Umožňuje srovnávat **rizikovost** scénářů — scénář s vyšším průměrným ziskem ale větším rozptylem může být rizikovější
- 200 běhů poskytuje dostatečnou přesnost pro percentilové odhady bez nadměrné výpočetní náročnosti

### 3.9 Reprodukovatelnost

Každý běh simulace používá deterministický generátor náhodných čísel inicializovaný udaným seedem. To znamená, že **při stejném seedu dostaneme vždy identické výsledky** — důležité pro ověřitelnost a důvěryhodnost analýzy v kontextu bakalářské práce.

### 3.10 Přehled použitých statistických distribucí

| Veličina | Distribuce | Zdůvodnění |
|---|---|---|
| Mezičasy příchodů | **Exponenciální** (→ Poissonův proces) | Standardní model nezávislých příchodů v systémech hromadné obsluhy |
| Šum poptávky | **Rovnoměrné** (±20 %) | Symetrická den-ode-dne variabilita bez předpokladu o tvaru |
| Velikost skupiny | **Normální** (μ=avg, σ=0,5) | Mírná variabilita kolem průměru, zaokrouhleno na celé osoby |
| Doba přípravy jídla | **Trojúhelníkové** (min/mode/max) | Intuitivní parametrizace, asymetrie, běžné v procesní simulaci |
| Doba pobytu u stolu | **Trojúhelníkové** (min/mode/max) | Totéž — uživatel snadno odhadne min/modus/max |

### 3.11 Scénáře a what-if parametry simulace

Simulaci lze spustit s libovolnými úpravami oproti baseline dat:

| Parametr | Co ovlivňuje |
|---|---|
| Změna personálu | Počet kuchařů/servírek v konkrétní den/směnu → kapacita kuchyně/obsluhy |
| Změna cen | Průměrná útrata + dopad na poptávku přes cenovou elasticitu |
| Změna kapacity | Počet míst k sezení → délka front na stůl |
| Násobič poptávky | Simulace marketingové kampaně, sezónní výkyvy |
| Změna nákladových parametrů | Dopad na zisk bez vlivu na frontový systém |

Klíčové je, že **cenová změna má dvojí efekt**: zvyšuje tržbu na skupinu, ale současně snižuje poptávku přes cenovou elasticitu. Simulace tento trade-off přirozeně zachycuje.

---

## 4. Přehled stránek aplikace

| Stránka | Co uživatel vidí a dělá |
|---|---|
| **Baseline Weeks** | Vytváří a spravuje typické týdny, může duplikovat nebo generovat demo data |
| **Data Grid** | Vyplňuje tabulku návštěvnosti a tržeb (den × směna), editace s undo/redo |
| **Dashboard** | Přehled všech KPI, grafy, heatmapa, automatické vhledy |
| **Dayparts** | Definuje denní období (oběd, odpoledne, večeře) |
| **Staffing** | Nastavuje personál pro každý den a směnu |
| **Costs** | Zadává fixní náklady a procento surovinových nákladů |
| **Venue** | Nastavuje kapacitu restaurace |
| **Opening Hours** | Provozní doba pro každý den |
| **Sim. Parameters** | Nastavení simulačního modelu (časy přípravy, balkingu, elasticity) |
| **Scenarios** | Tvoří pojmenované scénáře, spouští simulace, porovnává výsledky |
| **Simulation** | Ad-hoc simulace s vlastními parametry |
| **Experiments** | 6 předdefinovaných experimentů s automatickými deltami |
| **What-If** | Interaktivní posuvníky s okamžitým přepočtem KPI |
| **Report** | Break-even analýza, citlivostní analýza, rozpad po směnách |
| **Trend** | Vývoj KPI v čase napříč týdny |
| **Compare** | Porovnání dvou scénářů vedle sebe |
| **Goal Seek** | Zpětný výpočet: „kolik hostů potřebuji pro cílový obrat?" |
| **About** | Popis metodologie |
| **AI Poradce** | Chatovací widget s GPT-4o-mini (dostupný na všech stránkách) |

---

## 5. Shrnutí

Aplikace kombinuje deterministické výpočty KPI s diskrétní simulací událostí. Deterministické výpočty slouží pro rychlý přehled a interaktivní what-if analýzu. Stochastická simulace pomocí SimPy dodává hlubší pohled — modeluje reálné frontové systémy restaurace, zachycuje variabilitu a nejistotu a umožňuje kvantifikovat riziko různých provozních rozhodnutí.

Díky multi-run přístupu (200 opakování) uživatel nedostává jen bodový odhad, ale **interval výsledků s percentily**, který odpovídá na otázku: „V jakém rozmezí se mohu realisticky pohybovat?" To je zásadní pro kvalifikované rozhodování v praxi.

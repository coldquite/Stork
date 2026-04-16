<h1 style="display: flex; align-items: center; gap: 10px;">
  <img src="./public/logo_cropped.svg" alt="ČÁP logo" height="25">
  <span>ČÁP – technická dokumentace pro údržbu a další rozvoj</span>
</h1>

## Úvod

Aplikace ČÁP představuje webový nástroj určený pro podporu přípravy časových plánů státních závěrečných zkoušek na FIT
ČVUT. Jejím účelem je podpora procesu sestavování harmonogramu komisí na základě dat exportovaných z informačního
systému KOS ve formátu CSV, a to včetně správy časových slotů studentů a generování výstupních dokumentů určených pro
interní i veřejné využití.

Tento dokument je určen především správcům a budoucím vývojářům aplikace. Jeho cílem je shrnout technické předpoklady
provozu, způsob nasazení, vazbu na fakultní autorizační infrastrukturu a postupy pro údržbu konfiguračních dat a
výstupních šablon.

Tento dokument neslouží jako uživatelský návod pro běžnou práci se systémem. Informace o aplikaci ČÁP z pohledu cílového
uživatele jsou dostupné přímo v [nasazené verzi aplikace](https://cap.ksi.fit.cvut.cz/), která obsahuje sekci
„Uživatelská příručka“ věnovanou popisu funkční stránky systému.

Přístup k aplikaci je omezen pouze na uživatele připojené prostřednictvím fakultní VPN a současně zařazené na seznam
oprávněných osob. V případě potřeby přístupu je nutné kontaktovat správce aplikace.

Primární osobou odpovědnou za provoz aplikace
je [Ing. Jan Blizničenko, Ph.D.](https://usermap.cvut.cz/profile/030461bf-8031-4307-baa4-46a89b05bbdc).  
Sekundární osobou odpovědnou za provoz aplikace
je [Andrii Pihal](https://usermap.cvut.cz/profile/2ad534ae-790d-4752-85ee-7539d155a170).

## Rozsah dokumentace

Tento dokument pokrývá zejména následující oblasti:

- [Stručný přehled řešení](#stručný-přehled-řešení)
- [Kontribuce](#kontribuce)
- [Vývojové prostředí](#vývojové-prostředí)
  - [Spuštění pomocí Docker Compose](#spuštění-pomocí-docker-compose)
- [Konfigurační soubor a autorizace prostřednictvím FIT Auth](#konfigurační-soubor-a-autorizace-prostřednictvím-fit-auth)
- [Nasazení aplikace](#nasazení-aplikace)
- [Monitoring a logování (Sentry)](#monitoring-a-logování-sentry)
- [Správa nasazené aplikace](#správa-nasazené-aplikace)
  - [Správa oprávněných uživatelů](#správa-oprávněných-uživatelů)
  - [Správa podporovaných studijních plánů](#správa-podporovaných-studijních-plánů)
  - [Správa podporovaných specializací](#správa-podporovaných-specializací)
  - [Správa podporovaných kateder](#správa-podporovaných-kateder)
  - [Změny časových parametrů zkoušek a písemné přípravy](#změny-časových-parametrů-zkoušek-a-písemné-přípravy)
  - [Změny délky intervalu mezi koncem zkoušky a začátkem následující](#změny-délky-intervalu-mezi-koncem-zkoušky-a-začátkem-následující)
- [Použité knihovny a licence](#použité-knihovny-a-licence)

## Stručný přehled řešení

Aplikace je implementována ve frameworku [Nuxt 4](https://nuxtjs.org/) s využitím jazyka TypeScript.

- Z hlediska architektury je navržena jako hybridní aplikace, která kombinuje vlastnosti tlustého klienta typu SPA,
  server-side renderingu (SSR) a tenkého serveru.
- Pro návrh a implementaci grafických komponent využívá knihovnu [Nuxt UI 4](https://ui.nuxt.com/)
  a [Tailwind CSS 4](https://tailwindcss.com/blog/tailwindcss-v4).
- Pro účely autorizace oprávněných uživatelů využívá fakultní autentizační
  službu [FIT Auth](https://auth.fit.cvut.cz/manager/app-types.xhtml). Bližší informace jsou uvedeny
  v [příslušné sekci tohoto dokumentu](#konfiguracni-soubor-a-autorizace-prostřednictvím-fit-auth).
- Pro perzistentní ukládání dat na straně serveru je využíván relační databázový
  systém [PostgreSQL 18](https://www.postgresql.org/docs/18/index.html).
- Produkční verze aplikace je provozována výhradně prostřednictvím protokolu HTTPS.
- Celá aplikace je kontejnerizována.

Systém byl vytvořen od základu
jako [praktická část bakalářské práce autora Andriiho Pihala](https://projects.fit.cvut.cz/theses/6131) a představuje
kompletní náhradu [původního řešení vyvinutého Oldřichem Malcem](https://github.com/oldamalec/stork-oss).

Pro hlubší porozumění důvodům vzniku nové aplikace, jejím návrhovým východiskům i doméně, nad níž je systém vystavěn, je
vhodné se seznámit s textem [příslušné bakalářské práce](https://projects.fit.cvut.cz/theses/6131).

# Kontribuce

Struktura repozitáře se řídí [doporučením autorů použitého frameworku](https://nuxt.com/docs/4.x/directory-structure).

CI/CD pipeline je nakonfigurována tak, aby bránila regresi kódové základny.
Mimo jiné zahrnuje:

- statickou analýzu kódu (ESLint)
- ověření formátování (Prettier)
- kontrolu TypeScript typů
- ověření vzájemné konzistence Prisma schématu a existujících migrací
- unit testy
- integrační testy spouštěné proti běžící instanci aplikace s reálnou databází
- ověření, že soubor `public/licenses.txt` odpovídá licencím aktuálně použitých
  závislostí třetích stran

## Vývojové prostředí

Aplikaci lze lokálně rozběhnout dvěma způsoby — pomocí Docker Compose (doporučeno)
nebo přímo na hostitelském systému. Repozitář obsahuje soubory `docker-compose.dev.yml`
a `docker-compose.prod.yml`. Oba soubory jsou záměrně udržovány co nejblíže sobě,
aby se minimalizovaly rozdíly mezi vývojovým a produkčním prostředím.

### Spuštění pomocí Docker Compose

Pro spuštění aplikace je vyžadován `Docker` ve verzi 28 nebo novější. Použití starších verzí nebo alternativních
nástrojů (například Podmanu) je teoreticky možné, avšak v rámci vývoje ani testování nebylo ověřeno.

Při prvním spuštění je nutné sestavit obraz aplikace, aplikovat databázové migrace a případně také naplnit databázi
ukázkovými daty.

```bash
docker compose -f docker-compose.dev.yml up -d --build # Sestaví obraz a spustí kontejnery na pozadí

docker compose -f docker-compose.dev.yml exec app pnpm db:migrate:deploy # Aplikuje všechny databázové migrace

docker compose -f docker-compose.dev.yml exec app pnpm db:seed # (Volitelně) Naplní databázi ukázkovými daty
```

Vývojová konfigurace se od produkční liší v následujících bodech:

- **Sestavení obrazu** — vývojová verze sestavuje obraz lokálně (`build: .`),
  produkční používá předem sestavený obraz z registry (`image: ${APP_IMAGE}`)
- **Spouštěcí příkaz** — vývojová verze spouští `pnpm dev` s live-reload,
  produkční spouští sestavený server přímo přes `node`
- **Mapování portů** — vývojová verze mapuje port `3000:3000`,
  produkční `80:3000`
- **Proměnná NODE_ENV** — `development` vs. `production`
- **Bind mount zdrojového kódu** — vývojová verze mountuje `./:/app`
- **Port databáze** — vývojová verze vystavuje port `5432` na hostiteli (pro přímé připojení z IDE). Produkční port
  nevystavuje
- **Volume databáze** — každá konfigurace používá vlastní pojmenovaný volume
  (`stork_app_postgres_data_dev` vs. `stork_app_postgres_data`)

V případě, že hodláte spustit aplikaci přímo na hostitelském systému,
platí následující technické požadavky:

- Node.js 24
- pnpm 10.32.1
- PostgreSQL 18.3
- Chromium — správnou verzi
  stáhnete automaticky příkazem
  `pnpm exec playwright install chromium`

# Konfigurační soubor a autorizace prostřednictvím FIT Auth

Část potenciálně měnitelné konfigurace systému je vyčleněna do souboru `.env`. Repozitář obsahuje ukázkové soubory
`.env.example.dev` a `.env.example.prod`. Jednotlivé položky jsou buď dostatečně popisné již svým názvem, nebo jsou
doplněny podrobnějším komentářem.

---

V tomto souboru se současně konfiguruje i přihlášení prostřednictvím
služby [FIT Auth](https://auth.fit.cvut.cz/manager/app-types.xhtml). Pro správné zprovoznění autorizace je třeba
postupovat následovně:

1. V [rozhraní FIT Auth](https://auth.fit.cvut.cz/manager/index.xhtml) vytvořte nový projekt.
2. V projektu vytvořte novou aplikaci. Jako typ aplikace zvolte `Web Application`.
3. Nastavte redirect URI ve tvaru `https://{url_aplikace}/api/auth/callback`.
4. V případě lokálního vývojového prostředí použijte redirect URI `http://localhost:3000/api/auth/callback`.
5. Po vytvoření aplikace zkopírujte hodnoty **Client ID** a **Client Secret** do příslušných položek v souboru `.env`.

Je vhodné dbát na to, aby redirect URI nakonfigurované ve FIT Auth přesně odpovídalo skutečné adrese callback endpointu
aplikace.

## Nasazení aplikace

Pro nasazení aplikace jsou na cílovém serveru vyžadovány následující předpoklady:

- `Docker` ve verzi 28 nebo novější. Použití starších verzí nebo alternativních nástrojů (například podman)je teoreticky
  možné, avšak v rámci vývoje ani testování nebylo ověřeno.
- Alespoň 1 GB operační paměti RAM
- Uživatel `deploy`
  s [přístupem k Dockeru bez administrátorských oprávnění](https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user).
- SSH přístup uživatele `deploy` na VPS. Odpovídající privátní klíč je uložen jako CI/CD proměnná
  `DEPLOY_SSH_PRIVATE_KEY_B64` v GitLabu ve formátu Base64.
- Přihlášení na serveru do GitLab Container Registry (pomocí příkazu `docker login gitlab.fit.cvut.cz:5050`). Pro
  autentizaci je potřeba
  použít [Deploy token](https://docs.gitlab.com/user/project/deploy_tokens/#create-a-deploy-token) s oprávněním alespoň
  `read_registry`, aby bylo možné stáhnout nasazovaný Docker image, například při aktualizaci `.env` konfigurace u
  běžící instance.

Použití formátu Base64 je zvoleno z praktických i bezpečnostních důvodů. SSH klíče obsahují znaky nového řádku, které
GitLab u proměnných typu `Variable` nepodporuje. Současně proměnné typu `File` nepodporují nastavení
`Masked and hidden`, což znamená, že by se taková víceřádková konfigurace mohla objevit ve výstupech CI/CD pipeline, a
tím představovat bezpečnostní riziko.

---

V současné době je aplikace nasazena na VPS provozovaném na platformě [CloudFIT](https://cloud.in.fit.cvut.cz/). Přístup
k tomuto serveru mají správci aplikace.

Pro nasazení nové verze aplikace se doporučuje využít předem nakonfigurovaný postup v rámci CI/CD pipeline. Pro commity
do `main` větve je součástí pipeline job `build_app_image`, který sestaví odpovídající image a uloží jej do GitLab
Container Registry.

Po úspěšném dokončení tohoto jobu je následně možné spustit manuální job `deploy_production` (je idempotentní a
atomický), který

- Prostřednictvím SSH se připojí k produkčnímu serveru, stáhne nový image.
- Provede nahrazení stávající verze novým imagem.
- Provede databázové migrace.
- Odstraní předchozí image.

Odstranění starého image je implementováno z důvodu úspory diskového prostoru na VPS, protože při každém nasazení by
jinak docházelo k hromadění již zastaralých image.

Sestavení image je vyčleněno do samostatného GitLab jobu, protože se v praxi ukázalo, že pro jeho build jsou zapotřebí
přibližně 5 GB operační paměti RAM, zatímco produkční VPS může mít k dispozici méně. Využití swapu navíc celý proces
kriticky zpomaluje.

# Monitoring a logování (Sentry)

Chyby v produkčním prostředí jsou zaznamenávány
do [instance Sentry](https://sentry.ksi.fit.cvut.cz/organizations/stork/projects/stork-app/?project=18), která je
provozována Katedrou softwarového inženýrství FIT ČVUT. Přístup k této instanci je omezen na správce aplikace.

## Správa nasazené aplikace

Následující podsekce popisují nejčastější scénáře údržby nasazené aplikace. Jednotlivé zásahy obvykle zahrnují buď změny
souborů s konstantami ve zdrojovém kódu, nebo přímou úpravu souboru `.env` na běžícím serveru.

- V případě změn ve zdrojovém kódu je pro jejich promítnutí nutné použít standardní způsob nasazení prostřednictvím
  CI/CD pipeline popsaný výše.

- V případě změn konfigurace v souboru `.env` je pro projevení změn nutné restartovat aplikační kontejner.

---

Na stávajícím serveru se aplikace nachází ve složce `/opt/stork`.

Pro restart kontejneru po změně souboru `.env` použijte následující příkaz:

`APP_IMAGE=gitlab.fit.cvut.cz:5050/pihaland/cap/app:main docker compose -f docker-compose.prod.yml --env-file .env pull app && APP_IMAGE=gitlab.fit.cvut.cz:5050/pihaland/cap/app:main docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate app`

### Správa oprávněných uživatelů

Seznam uživatelů oprávněných k přihlášení do aplikace je řízen proměnnou prostředí `NUXT_FIT_AUTH_ALLOWED_USERS` v
souboru `.env`. Jedná se o řetězec jmen oddělených čárkou, který aplikace při ověření porovnává se jménem získaným z
endpointu `check_token` služby FIT Auth (porovnání není citlivé na velikost písmen).

> Změna vyžaduje restart kontejneru, viz [začátek této sekce](#správa-nasazené-aplikace).

### Správa podporovaných studijních plánů

Seznam názvů studijních plánů je centralizován ve zdrojovém kódu v
souboru [shared/constants/editor/study-program-names.ts](./shared/constants/editor/study-program-names.ts). Pokud
přibude nová specializace, následně rozšiřte také seznam podporovaných specializací (viz následující sekce).

> Změna vyžaduje nové nasazení aplikace, viz [začátek této sekce](#správa-nasazené-aplikace).

### Správa podporovaných specializací

Seznam specializací je primárně
v [shared/constants/editor/specialization-raw.ts](./shared/constants/editor/specialization-raw.ts) a má strukturu
`typ studia` → `název plánu` → `pole specializací`.

Nad těmito daty se skládá tabulka pro editor
v [shared/constants/editor/specialization-table.ts](./shared/constants/editor/specialization-table.ts), kde se doplňují
názvy kateder a některé kódy se rozšiřují o varianty `.24`.

1. Identifikujte příslušnou skupinu (např. `BACHELOR.Informatika`)
2. Vložte objekt s trojicí polí `specializationCode`, `specializationName`, `departmentCode`
3. Ověřte, že `departmentCode` existuje v `EDITOR_DEPARTMENTS_BY_CODE` (viz další sekce)
4. Pokud potřebujete i variantu `.24`, zkontrolujte pravidla v `specialization-table.ts` (co se doplní automaticky a co je
   potřeba přidat ručně)
5. Pokud přibude kód nové katedry, nejprve rozšiřte seznam podporovaných kateder (viz následující sekci).

> Změna vyžaduje nové nasazení aplikace, viz [začátek této sekce](#správa-nasazené-aplikace).

### Správa podporovaných kateder

Katedry jsou definovány v [shared/constants/editor/departments.ts](./shared/constants/editor/departments.ts) jako mapa
kódu na objekt s českým a anglickým názvem:

1. Rozšiřte typ EditorDepartmentCode o nový literál (např. '18107')
2. Přidejte záznam do `EDITOR_DEPARTMENTS_BY_CODE`
3. Pokud přibude nová specializace, následně rozšiřte také seznam podporovaných specializací (viz předchozí sekce).

> Změna vyžaduje nové nasazení aplikace, viz [začátek této sekce](#správa-nasazené-aplikace).

### Změny časových parametrů zkoušek a písemné přípravy

Trvání písemné přípravy a samotné ústní zkoušky je definováno
v [app/utils/student-duration.ts](./app/utils/student-duration.ts) jako dvanáct pojmenovaných konstant — kombinace typu
studia (`BACHELOR` / `MASTER`) × scénáře opakování (`FIRST_OR_BOTH` / `THESIS_ONLY` / `ORAL_ONLY`) × fáze (`PREPARE` /
`EXAM`):

> Změna vyžaduje nové nasazení aplikace, viz [začátek této sekce](#správa-nasazené-aplikace).

### Změny délky intervalu mezi koncem zkoušky a začátkem následující

Tento interval slouží pro neveřejné jednání komise a veřejné vyhlášení výsledků. Výchozí hodnota je **10 minut**.

Interval mezi koncem zkoušky jednoho studenta a začátkem přípravy studenta následujícího je definován konstantou
`STUDENT_EXAM_GAP_MINUTES` v souboru [app/constants/editor-students-table.ts](./app/constants/editor-students-table.ts).

> Změna vyžaduje nové nasazení aplikace, viz [začátek této sekce](#správa-nasazené-aplikace).

## Použité knihovny a licence

Zdrojový kód tohoto projektu je distribuován jako open-source software pod licencí Apache 2.0. Podrobnosti jsou uvedeny
v [licenčním souboru projektu](./LICENSE).

Projekt dále využívá knihovny a multimediální prostředky třetích stran. Úplný přehled použitých komponent a jejich
licencí je k dispozici v [repozitáři](./public/licenses.txt) a rovněž prostřednictvím odkazu v patičce nasazené
aplikace.

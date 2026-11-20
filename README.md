# Lexi Path – învață germana din propriile liste de cuvinte

Aplicație web (PWA) pentru vorbitori de română care învață germana. Rulează **local, fără server**: totul
se păstrează în browser (IndexedDB), merge **offline** și se instalează pe telefon.
Interfața este în română (toate textele sunt în `src/i18n/ro.ts`).

## Rulare

```powershell
npm install
npm run dev        # server de dezvoltare, http://localhost:5173
npm run test       # teste unitare (Vitest)
npm run build      # verificare TypeScript + build de producție în dist/
npm run preview    # servește dist/ la http://localhost:4173
npm run e2e        # test end-to-end (Playwright; rulează build + preview singur)
```

Prima oară pentru e2e: `npx playwright install chromium`.
Pictogramele PNG se regenerează cu `node scripts/make-icons.mjs`.

## Publicare pe GitHub Pages (telefonul funcționează apoi singur)

1. Creează un depozit GitHub și trimite codul pe ramura `main`.
2. În **Settings → Pages** alege **Source: GitHub Actions**.
3. Workflow-ul `.github/workflows/deploy.yml` rulează testele, face build-ul și publică `dist/`.
4. Subcalea site-ului este implicit `/<numele-depozitului>/`. O poți schimba cu variabila de depozit
   `PAGES_BASE` (de ex. `/wortpfad/`). Local: `VITE_BASE=/wortpfad/ npm run build`.
   Implicit (`./`) aplicația funcționează la orice adresă, deoarece folosește rutare cu `#`.

După prima vizită, service worker-ul păstrează toată aplicația în cache: pornește și în **modul avion**.
La prima pornire aplicația cere `navigator.storage.persist()` ca browserul să nu șteargă datele.

## Instalare pe telefon

În aplicație: **Setări → Instalează aplicația** (instrucțiuni pas cu pas).

* **Android (Chrome):** deschide adresa → ⋮ → *Instalează aplicația* / *Adaugă pe ecranul principal*.
* **iPhone (Safari):** deschide adresa în Safari → Partajare → *Adăugare la ecranul principal*.
  ⚠ Pe iPhone datele sunt păstrate pe termen lung **doar dacă aplicația e instalată** pe ecranul principal;
  în Safari simplu iOS poate șterge datele după câteva zile fără folosire. Fă backup des.

## Backup și transfer între dispozitive

**Setări → Exportă datele (JSON)** salvează tot (pachete, cuvinte, progres, profiluri, istoricul testelor).
**Importă datele** înlocuiește tot de pe dispozitivul curent. Aplicația arată un memento săptămânal
„Exportă backup” dacă au trecut mai mult de 7 zile de la ultimul backup.

## Formatul de import

Lipești liste în **Pachete → Pachet nou** (sau încarci `.csv`, `.tsv`, `.txt`, `.json`). Separatorii
`;` `,` tab ` - ` ` = ` `=` sunt detectați automat. Previzualizarea arată tipul, articolul, pluralul și
formele detectate, toate **editabile** în tabel, și avertizează pentru substantive fără articol, cu literă mică
sau cu plural neînțeles.

```
german ; română ; [forme] ; [exemplu] ; [etichete]
```

* Câmpurile pot fi goale: `Wo? ; Unde? ; ; Wo wohnst du? – In Timișoara.`
* `|` separă variante acceptate, **pe ambele părți**: `Wie viel?|Wieviel? ; Cât?|Câți?|Câte?`.
  Prima variantă germană este cea afișată și rostită.
* **Substantive:** `der/die/das` la început. Pluralul se scrie ca în manual, imediat după substantiv:
  `der Tisch, -e` → die Tische · `die Mutter, ¨-` → die Mütter · `das Buch, ¨-er` → die Bücher ·
  `das Auto, -s` · `der Lehrer, -` · `(Pl.)` = doar plural · `(Sg.)` = fără plural.
  `¨` (sau `"` sau `:`) înseamnă umlaut pe ultimul a/o/u/au din rădăcină.
  Pluralul poate veni și în câmpul „forme”, cu aceeași ordine a variantelor: `die Großmütter|die Omas`.
  La variante, o terminație comună se aplică tuturor: `der Samstag|der Sonnabend, -e`, `der Januar|der Jänner (Sg.)`.
* **Verbe, tabel Präsens** (exact 6 valori, în ordinea caietului: ich, du, er/sie/es, wir, ihr, Sie/sie):
  `P: lerne, lernst, lernt, lernen, lernt, lernen`. Un verb e marcat *neregulat* dacă tabelul nu urmează
  rădăcină + -e, -st, -t, -en, -t, -en.
* **Verbe, forme pentru lecții viitoare:** `geht, ging, ist gegangen` (orice prefix al listei:
  persoana a 3-a sg., Präteritum, Perfekt). Se detectează auxiliarul (haben/sein), verbele separabile și cele neregulate.
* **Exemple:** mai multe propoziții separate prin ` // `. Un mini-dialog se scrie `întrebare – răspuns`.
* **Etichete:** separate prin virgulă. `n=21` dă unui cuvânt valoarea numerică. Etichetele-grup
  (intervale `0-10`, `Monate`, `Jahreszeiten`, `Extra`, `Kernfamilie`, `Verwandte`, sau orice etichetă cu
  spații, ex. `Sein und Haben`) creează **o unitate per grup**. Etichetele `Wochentage`, `Monate`,
  `Jahreszeiten` marchează seturi ordonate (toate `der`, fără exercițiu de articole, cu card informativ).
* **Unități:** o lecție de cel mult 12 cuvinte rămâne o singură unitate; lecțiile mai mari se împart în unități de 8–10 cuvinte.
* Pentru liste în engleză (4 coloane: `termen ; traducere ; [exemplu] ; [etichete]`) alege „Engleză” la import.

Fiecare pachet = o lecție din manual (`Lektion 5 – Familie`), cu *curs* (ex. „Menschen A1”) și nivel CEFR A1–C1.
Pachetele și calea de învățare sunt grupate pe curs și ordonate după lecție.

## Reguli de stăpânire a cuvintelor (modelul SRS)

Fiecare cuvânt are un nivel: 0 Nou · 1 Văzut · 2 În învățare · 3 Familiar · 4 Puternic · 5 Stăpânit.

* Prima întâlnire mută cuvântul 0 → 1. Pentru fiecare nivel următor sunt necesare puncte (răspunsuri corecte,
  cu pondere mai mare la exerciții mai grele) **din cel puțin 2 sesiuni diferite**.
* De la 4 la 5 punctele trebuie strânse în **cel puțin 2 zile diferite**: un cuvânt nu devine „Stăpânit” într-o singură zi.
* Un răspuns greșit scade facilitatea (*ease*), scade punctele și, la două greșeli la rând, nivelul cu 1.
* **Puterea** (0–100%) scade după data scadenței; nivelul nu scade doar din cauza timpului.
* Exercițiile urmează nivelul: 0–1 recunoaștere, 2–3 reamintire inversă, 4–5 producție.
* **Subabilități:** `meaning` (toate), `gender` și `plural` (substantive), `forms` (verbe). Fiecare are propria stare SRS.
  Nivelul cuvântului este limitat de cea mai slabă subabilitate necesară (nivel subabilitate + 2): un substantiv
  rămâne ≤ 3 cât timp articolul e nesigur și nu atinge 5 fără plural.
* **Verbe cu tabel Präsens:** `forms` se urmărește **per persoană** (6 contoare); nivelul `forms` este media lor.
  Coroana unui verb vine din puterea medie a celor 6 persoane (fără plafon).

## Răspunsuri scrise

* **Germană:** `ae/oe/ue/ss` sunt acceptate pentru `ä/ö/ü/ß` (corect, cu notă). Substantiv cu literă mică → „aproape”.
  Articol greșit → sensul e creditat, subabilitatea `gender` pică; fără articol → „aproape”, `gender` necreditată.
  O greșeală de tastare (≤ 1 literă, la cuvinte > 4 litere) e acceptată și marcată, **dar niciodată** dacă produce
  alt cuvânt din curs (Juni/Juli, Dienstag/Donnerstag, Cousin/Cousine) sau pierde un umlaut semnificativ (schon/schön).
  Cifrele sunt echivalente cu numele numerelor (`21` = `einundzwanzig`).
* **Română:** fără diacritice (ș/ş, ț/ţ identice), cu sau fără articolul hotărât (masă/masa) și cu sau fără „a” la verbe.
* **Forme conjugate:** potrivire **exactă**, fără toleranță la greșeli (lerne/lernst/lernt/lernen sunt răspunsuri diferite).

## Moduri speciale

* **Totul e deschis de la început:** orice unitate, orice verb, orice etapă și orice mod se pot deschide oricând, în orice ordine.
  Căpșorul (fawn-ul) doar sugerează următoarea unitate. Cardul de conjugare e mereu disponibil (gratuit), cu excepția modului Test lecție.
* **Conjugare** (verbe cu tabel Präsens): 3 etape la alegere (selector sus) – ghidat (card vizibil, 3 opțiuni), dropdown cu toate formele
  (fiecare persoană de două ori, singură și în propoziție), scris. Rândurile greșite se repetă la sfârșitul etapei.
  **Toate verbele:** 20 de perechi verb × persoană, cu grilă la final.
* **Test lecție:** fiecare cuvânt DE→RO, RO→DE și în context (unde există exemplu), plus ordinea seturilor
  (zile/luni/anotimpuri: toate în ordine pentru punct) și cele 6 persoane scrise pentru verbe. Fără indicii, fără
  reîncercări, fără feedback până la final. Istoricul se păstrează pe lecție; ≥ 90% = **Verificată ✓**; cuvintele
  greșite revin la scadență imediat.
* **Articole rapid** (20 de substantive, cronometru) și **Viteza numerelor** (20 de numere văzute sau auzite).
* Culori pentru articole: der albastru · die roșu · das verde (se pot opri în Setări).

## Aspectul nou (povestea ilustrată)

Aplicația are acum un aspect de carte ilustrată: culori pastelate calde, forme rotunjite, peisaje desenate ca SVG (fără imagini raster, fără fișiere externe; ~110 KB de cod pentru toată arta).
Mascota este puiul de căprioară **Reh**; fiecare zonă are și un prieten (iepuraș, vulpe, arici, rățușcă, veveriță, păsărică).

* **Calea (Acasă)**: peisajul lecției din spatele căii, cu paralaxă la derulare. Puiul de căprioară stă pe prima unitate nefinalizată și *merge* (~600 ms) la următoarea când termini o unitate.
  Toate unitățile rămân deschise (nu există blocaje). Nodurile Conjugare au același stil.
* **Exerciții** (lecție, drill, test, conjugare): fundal estompat al zonei lecției, conținutul pe panouri albe rotunjite, un animal mic în colțul barei de sus
  (se bucură la răspuns corect, te încurajează cu „Încearcă din nou!” la unul greșit; la *Test lecție* nu reacționează; se ascunde cât timp tastatura e deschisă).
  La final: ploaie de frunze și petale cu animalele care sărbătoresc.
* **Lecție → zonă**: lecțiile (în ordinea din aplicație) primesc pe rând zonele 1–6 (poiană, pădure, vale, lac, livadă, noapte); următoarele reiau ciclul și folosesc zonele 7–8 (savana, recif).
* **Mișcare redusă**: cu `prefers-reduced-motion` peisajele sunt statice, fără paralaxă, iar căprioara „sare” instantaneu; animațiile se opresc și când fila e ascunsă.
* **Contrast**: perechile text/fundal respectă WCAG AA (≥ 4,5:1); butoanele și zonele de atingere au ≥ 48 px.

### Previzualizare: `/dev/scenes`

În `npm run dev` există ruta `#/dev/scenes` (nu e inclusă în build-ul de producție): toate zonele (complet / estompat, cu derulare), animalele în toate stările, coroanele și ploaia de sărbătoare.

### Cum adaugi o zonă

Adaugă un obiect în `ZONES` din `src/theme/scenes.ts` (paletă, cer, soare/lună, particule, animalul rezident, straturile din spate spre față cu `speed` crescător).
Nu trebuie schimbat niciun component; `tests/scenes.test.ts` verifică forma datelor. Detalii și cum adaugi un strat sau un animal: `src/art/README.md`.

## Structura proiectului

```
src/core     logică pură, fără React/DOM: srs, parser, german, conjugation, answer/answerDe, exercises, lesson, gamification
src/data     Dexie (db v1→v3 cu migrări), repo, service, backup, seed
src/screens  ecrane (cale, pachete, lecție, conjugare, test, drill, progres, setări …)
src/components  componente comune și exercițiile (PathFawn, ZoneScreen, Splash …)
src/art, src/theme  ilustrațiile SVG și datele zonelor (scenes.ts, path.ts)
tests/       teste Vitest   ·   e2e/  test Playwright
```

Decizii și alegeri făcute fără a întreba: vezi `DECISIONS.md`.

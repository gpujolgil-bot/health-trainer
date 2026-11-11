# Health Trainer 2.0

App web de nutrició i seguiment corporal per al Treball de Recerca de Batxillerat **Health Trainer**.
Funciona com a pàgina estàtica a **GitHub Pages**, i les dades dels participants s'envien a un **Full de càlcul de Google** del centre mitjançant Apps Script.

## Què fa

- **Qüestionari pas a pas**: registre a l'estudi (correu, PIN i consentiment), dades corporals, activitat, esports (dies, durada i intensitat) i objectiu. Mentre es respon, es van calculant els resultats.
- **Tauler**: IMC, IMC adaptat, % de greix (Deurenberg + correcció per cintura), metabolisme basal (Mifflin-St Jeor), despesa total, calories objectiu, proteïnes i hidratació.
- **Seguiment**: registre setmanal en 3 passos (pes, cintura i sensacions), gràfic de tendència davant del camí objectiu, ritme de les últimes 4 setmanes i previsió d'arribada.
- **Alimentació**:
  - diari amb la base **BEDCA** (955 aliments), en català o castellà;
  - racions amb la mà per a qui no té bàscula;
  - menú del dia generat automàticament;
  - dietes desades;
  - «Quina dieta?»: qüestionari i catàleg de 9 dietes amb evidència i fonts.
- **Càlculs per franges d'edat** (6–99 anys):
  - *Infants (6–11)*: IMC per edat de l'OMS, metabolisme de Schofield, sense objectius de pes ni dèficit.
  - *Adolescents (12–17)*: IMC per edat de l'OMS, Deurenberg infantil fins als 15 anys, dèficit màxim de 300 kcal/dia (o el 15 % de la despesa), sense dejuni ni dieta cetogènica.
  - *Adults (18–64)*: IMC de l'OMS + IMC adaptat del TREC (sexe, edat i complexió).
  - *65 anys o més*: rang d'IMC 22–26,9 (SEGG/SENPE); sense dieta per perdre pes si l'IMC és < 30; si hi ha obesitat, dèficit ≤ 500 kcal i mínim 1.200 kcal/dia (ESPEN).
  - Per a tothom: valoració del dèficit del TREC, despesa pel mètode del TREC (factors 1,2–1,9) en paral·lel per comparar, aigua segons l'EFSA i proteïna segons edat i esport.
- **Valoració de l'app**: qüestionari SUS (*System Usability Scale*, 10 ítems, puntuació 0–100) + 3 preguntes d'utilitat i un comentari. Apareix al tauler després d'una setmana o de 3 registres, i sempre des del Perfil. Es guarda a la pestanya *Valoracio*.
- **Menors de 14 anys**: en mode estudi cal el consentiment del pare, mare o tutor.

## Fitxers

| Fitxer | Què és |
|---|---|
| `index.html` | L'app sencera (HTML + CSS + JS) |
| `foods.js` | Base d'aliments BEDCA (valors per 100 g). **No en canviïs l'ordre**: el diari guarda l'índex de cada aliment. Els nous s'afegeixen al final. |
| `config.js` | Configuració de l'estudi: URL del servidor i textos del consentiment |
| `apps-script/Code.gs` | Codi del servidor que rep les dades al Full de càlcul de Google |

## Posada en marxa

### 1. El Full de càlcul (amb el compte de l'institut)

1. Crea un Full de càlcul de Google nou, per exemple «Health Trainer – dades estudi».
2. Ves a **Extensions → Apps Script**, esborra el que hi hagi i enganxa-hi el contingut de `apps-script/Code.gs`. Desa.
3. Ves a **Implementa → Nova implementació** i tria el tipus **Aplicació web**:
   - Executa com a: **Jo**
   - Qui hi té accés: **Qualsevol persona** (l'app no fa servir comptes de Google; cada participant s'identifica amb correu + PIN).
4. Autoritza els permisos i copia l'**URL de l'aplicació web** (acaba en `/exec`).

Les pestanyes es creen soles amb la primera dada que arribi:

| Pestanya | Contingut |
|---|---|
| `Participants` | Codi, correu, nom, consentiment. **Dades identificatives: no les comparteixis.** |
| `Dades` | Una fila per participant amb el perfil i els resultats calculats |
| `Registres` | Registres de pes i cintura, i sensacions (energia, gana, son) |
| `Aliments` | Tot el diari d'àpats amb grams, kcal i macronutrients |
| `Questionari` | Respostes del qüestionari «Quina dieta?» |
| `_raw` (oculta) | Còpia completa de l'estat de l'app, per recuperar-la des d'un altre dispositiu |

Per a l'anàlisi, fes servir les pestanyes que només porten el **codi** (HT-XXXXXX), no la de Participants.

> Si modifiques `Code.gs`, cal tornar a fer **Implementa → Gestiona les implementacions → Edita → Versió nova** perquè els canvis s'apliquin.

**Si ja tenies el Full en marxa i actualitzes `Code.gs`:** enganxa el codi nou a l'editor d'Apps Script, desa, i a *Implementar → Gestionar implementacions → (llapis) → Versió: Nova versió → Implementar*. Així es manté la mateixa URL i les columnes noves s'afegeixen soles a la pestanya *Dades*.

### 2. `config.js`

Posa l'URL a `endpoint` i omple els textos del consentiment: projecte, centre, responsables, contacte i termini de conservació. Si `endpoint` es deixa buit, l'app funciona en **mode demostració** i no envia res.

### 3. GitHub Pages

Al repositori, ves a **Settings → Pages → Build and deployment → Deploy from a branch** i tria la branca `main` i la carpeta `/ (root)`. Al cap d'un minut, l'app serà a `https://<usuari>.github.io/health-trainer/`.

## Protecció de dades: el que cal tenir clar abans de començar

Es recullen correus i dades de salut (pes, % de greix, alimentació, condicions declarades) d'alumnes, i molts són menors.

- **No guardis mai dades dels participants al repositori de GitHub**: el repositori de Pages és públic. Les dades han d'anar només al Full de càlcul del compte de l'institut.
- Demana el vistiplau de la **direcció del centre** i consulta el **Delegat de Protecció de Dades del Departament d'Educació** abans de recollir dades.
- A Espanya, a partir de 14 anys l'alumne pot donar el consentiment (LOPDGDD, art. 7). Per a menors de 14 cal el de la família.
- Cada participant pot consultar, corregir o **esborrar** les seves dades des de l'app (Perfil → Retirar-me de l'estudi). Això també les esborra del Full de càlcul.
- Comparteix el Full de càlcul només amb les persones responsables de l'estudi. En acabar, esborra'l dins del termini indicat al consentiment.

*Aquest apartat és orientatiu i no és assessorament legal.*

## Fonts

- Base d'aliments: **BEDCA** (Base de Datos Española de Composición de Alimentos). S'han corregit 9 aliments cuits que a BEDCA tenen valors de cru (marcats amb `*`).
- Fórmules: Mifflin-St Jeor i Schofield (metabolisme basal), Deurenberg 1991 infantil i d'adult (% de greix), IMC per edat de l'OMS 2007 (taules LMS, extretes del paquet obert `rcpchgrowth`), classificació SEGG/SENPE per a 65+, guia ESPEN d'obesitat en gent gran, PROT-AGE (proteïna), EFSA 2010 (aigua) i METs del *Compendium of Physical Activities*.
- Dietes:
  - PREDIMED, ASPCAT «Petits canvis per menjar millor» i AESAN 2022;
  - Harvard Nutrition Source (DASH, keto);
  - ISSN 2017 (proteïna);
  - BMJ 2025 (dejuni intermitent);
  - Academy of Nutrition and Dietetics (dietes vegetarianes);
  - JAMA 2011 (Portfolio).

Les recomanacions de l'app són **orientatives** i no substitueixen un/a dietista-nutricionista ni el metge/essa.

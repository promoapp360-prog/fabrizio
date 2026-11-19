# Analisi asset Vecciarì

| File fornito | Uso | Destinazione |
|---|---|---|
| Logo naming oro (VECCIARÌ ad arco + fiamma/spiga) PNG trasparente | Logo principale su fondo scuro | `public/brand/logo-naming-oro.{png,webp}` |
| Fiamma oro PNG trasparente | Marchio, favicon, decorazioni | `public/brand/fiamma-oro.{png,webp}`, `public/icon-*.png` |
| Logo fiamma nero PDF (vettoriale) | Versione per stampa/fondo chiaro | `public/brand/logo-fiamma-nero.pdf` (esportare SVG da Illustrator per il web) |
| Texture gradiente oro | Sfondi hero/sezioni | `public/brand/texture-oro.webp` |
| Brandguide | Riferimento | `public/brand/brandguide.jpg` |
| Kurdis (30 stili) | Titoli / naming "VECCIARÌ" | `public/fonts/Kurdis-{Black,Bold,Regular}.woff` |
| Aloevera Display | Testi, "Grano & Brace", motto | `public/fonts/AloeveraDisplay-{Light,Regular,SemiBold}.woff2` |

**Palette** (dal brandguide): nero `#0A0A08`, superfici `#161410`, oro `#E9C23A`, oro scuro `#C9961E`, gradiente oro `#F6E27A → #E9C23A → #C9961E`, bianco caldo `#FAF6EC`. Modificabile da Admin › Impostazioni › Aspetto.

**Payoff**: "Grano & Brace" · **Motto**: "Radici di grano – Anima di fuoco".

Mancano: versione SVG dei loghi (consigliata per nitidezza), versione orizzontale per header compatto, fotografie reali. La struttura li accoglie senza modifiche al codice (URL da Impostazioni › Aspetto e da Contenuti).

⚠️ **Licenze font**: verificare che le licenze Kurdis e Aloevera acquistate includano l'uso **web** (webfont). In caso contrario sostituire i file in `public/fonts`.

export const DEFAULT_SEO = {
  title: "Vecciarì – Grano & Brace | Ristorante a Matera",
  description: "Carni selezionate alla brace e sapori della tradizione materana. Scopri il menù e prenota.",
};

export const DEFAULT_FAVICON = "/icon-96.png";

// Aggiorna soltanto i vecchi valori iniziali, anche se salvati nel CMS di
// produzione. Le personalizzazioni dell'Admin non vanno sovrascritte.
export function resolveSeo(seo: typeof DEFAULT_SEO): typeof DEFAULT_SEO {
  return {
    title: seo.title === "Vecciarì — Matera" ? DEFAULT_SEO.title : seo.title,
    description: seo.description === "Vecciarì – Grano & Brace a Matera. Scopri il menu, il mondo della carne e prenota il tuo tavolo."
      ? DEFAULT_SEO.description : seo.description,
  };
}

export function resolveFavicon(url: string): string {
  return url === "/icon-32.png" ? DEFAULT_FAVICON : url;
}

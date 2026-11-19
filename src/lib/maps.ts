export function getMapsDirectionsUrl(address: string, configuredUrl?: string) {
  return configuredUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function getMapsEmbedUrl(address: string) {
  if (process.env.GOOGLE_MAPS_EMBED_URL) return process.env.GOOGLE_MAPS_EMBED_URL;
  const destination = encodeURIComponent(`Vecciarì, ${address}`);
  return `https://maps.google.com/maps?hl=it&q=${destination}&z=16&ie=UTF8&iwloc=B&output=embed`;
}

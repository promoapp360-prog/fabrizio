export function getMapsDirectionsUrl(address: string, configuredUrl?: string) {
  return configuredUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function getMapsEmbedUrl(address: string) {
  const destination = encodeURIComponent(address);
  return `https://maps.google.com/maps?hl=it&q=${destination}&z=16&ie=UTF8&iwloc=B&output=embed`;
}

/** File bytes go directly to this project's App Storage, never to the web server. */
export async function uploadMedia(file: File, gallery?: string) {
  const requested = await fetch("/api/admin/media-upload", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) });
  const pending = await requested.json();
  if (!requested.ok) throw new Error(pending.error || "Caricamento non disponibile");
  const uploaded = await fetch(pending.uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!uploaded.ok) throw new Error("Foto non caricata. Riprova.");
  const confirmed = await fetch("/api/admin/media-upload", { method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: pending.id, gallery }) });
  const media = await confirmed.json();
  if (!confirmed.ok) throw new Error(media.error || "Conferma del caricamento non riuscita");
  return media as { id: string; url: string };
}

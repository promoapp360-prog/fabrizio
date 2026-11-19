"use client";
import ResourceManager from "@/components/admin/ResourceManager";
import { formatEUR } from "@/lib/pricing";
/* eslint-disable @typescript-eslint/no-explicit-any */
const last = (cs: any[], k: string) => cs.find(c => c.kind === k)?.granted;
const messages: Record<string, string> = { sent: "Accettata dal servizio email", queued: "In attesa", sending: "Invio in corso", delivery_unknown: "Esito da verificare con il servizio email", failed: "Invio non riuscito", skipped_not_configured: "Servizio da configurare" };
export default function Clienti() {
  return <ResourceManager resource="customers" title="Rubrica clienti"
    fields={[{ name: "name", label: "Nome", required: true }, { name: "email", label: "Email" }, { name: "phone", label: "Telefono" }, { name: "preferences", label: "Preferenze comunicate dal cliente", type: "textarea" }, { name: "privateNotes", label: "Note operative riservate", type: "textarea" }]}
    columns={[{ key: "name", label: "Nome" }, { key: "contact", label: "Contatti", render: r => [r.phone, r.email].filter(Boolean).join(" · ") },
      { key: "res", label: "Prenotazioni", render: r => r.reservations.length },
      { key: "orders", label: "Ordini", render: r => <details><summary className="cursor-pointer text-gold">{r._count?.orders ?? r.orders?.length ?? 0} ordini</summary><ul className="mt-2 min-w-48 space-y-2 text-xs">{r.orders?.map((o: any) => <li key={o.id}><b>#{o.number}</b> · {o.channel === "TABLE" ? `Tavolo ${o.tableNumber}` : o.channel === "TAKEAWAY" ? "Asporto" : "Consegna"}<br />{new Date(o.createdAt).toLocaleString("it-IT")} · {formatEUR(o.finalCents ?? o.estimatedCents)}<br />{o.items.map((i: any) => `${i.quantity}× ${i.nameSnapshot}`).join(", ")}<br />{o.payments.some((p: any) => p.status === "PAID") ? "Pagato" : "Da pagare"}</li>)}</ul></details> },
      { key: "consent", label: "Consensi", render: r => <span className="text-xs">Privacy {last(r.consents, "privacy") ? "✓" : "–"} · Marketing {last(r.consents, "marketing_email") ? "✓" : "✗"}</span> },
      { key: "msg", label: "Comunicazioni", render: r => <details className="text-xs"><summary className="cursor-pointer">{r.messages.length} comunicazioni · {messages[r.messages[0]?.status] ?? "—"}</summary><ul className="mt-2 min-w-48 space-y-2">{r.messages.map((m: any) => <li key={m.id}><b>{m.subject || "Comunicazione"}</b><br />{messages[m.status] || m.status} · {new Date(m.createdAt).toLocaleString("it-IT")}</li>)}</ul></details> }]} />;
}

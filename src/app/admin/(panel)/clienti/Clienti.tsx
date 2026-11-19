"use client";
import ResourceManager from "@/components/admin/ResourceManager";
/* eslint-disable @typescript-eslint/no-explicit-any */
const last = (cs: any[], k: string) => cs.find(c => c.kind === k)?.granted;
export default function Clienti() {
  return <ResourceManager resource="customers" title="Rubrica clienti"
    fields={[{ name: "name", label: "Nome", required: true }, { name: "email", label: "Email" }, { name: "phone", label: "Telefono" }, { name: "preferences", label: "Preferenze comunicate dal cliente", type: "textarea" }, { name: "privateNotes", label: "Note operative riservate", type: "textarea" }]}
    columns={[{ key: "name", label: "Nome" }, { key: "contact", label: "Contatti", render: r => [r.phone, r.email].filter(Boolean).join(" · ") },
      { key: "res", label: "Prenotazioni", render: r => r.reservations.length },
      { key: "consent", label: "Consensi", render: r => <span className="text-xs">Privacy {last(r.consents, "privacy") ? "✓" : "–"} · Marketing {last(r.consents, "marketing_email") ? "✓" : "✗"}</span> },
      { key: "msg", label: "Comunicazioni", render: r => <span className="text-xs">{r.messages.length} ({r.messages[0]?.status ?? "—"})</span> }]} />;
}

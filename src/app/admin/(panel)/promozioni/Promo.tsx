"use client";
import ResourceManager from "@/components/admin/ResourceManager";
export default function Promo() {
  return <ResourceManager resource="promotions" title="Promozioni, speciali e degustazioni" defaults={{ kind: "banner", active: true, productIds: [] }}
    fields={[{ name: "title", label: "Titolo", required: true }, { name: "kind", label: "Tipo", type: "select", options: [{ value: "banner", label: "Banner" }, { value: "special", label: "Piatto speciale" }, { value: "tasting", label: "Menu degustazione" }, { value: "offer", label: "Offerta" }] },
      { name: "startsAt", label: "Inizio", type: "datetime" }, { name: "endsAt", label: "Fine", type: "datetime" }, { name: "description", label: "Descrizione", type: "textarea" }, { name: "image", label: "Immagine (URL)" }, { name: "active", label: "Attiva", type: "bool" }]}
    columns={[{ key: "title", label: "Titolo" }, { key: "kind", label: "Tipo" }, { key: "period", label: "Periodo", render: r => `${new Date(r.startsAt).toLocaleDateString("it-IT")} → ${new Date(r.endsAt).toLocaleDateString("it-IT")}` }, { key: "active", label: "Attiva", render: r => r.active ? "Sì" : "No" }]} />;
}

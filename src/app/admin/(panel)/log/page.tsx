import { db } from "@/lib/db";
import { guard } from "@/components/admin/Guard";
export default async function Log() {
  await guard("audit");
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { user: { select: { name: true } } } });
  return (<div><h1 className="text-3xl">Registro attività</h1>
    <table className="mt-6 w-full text-sm"><thead className="text-left text-xs uppercase text-cream/60"><tr><th className="p-2">Quando</th><th>Utente</th><th>Azione</th><th>Oggetto</th></tr></thead>
      <tbody>{logs.map(l => <tr key={l.id} className="border-t border-cream/10"><td className="p-2 text-cream/60">{l.createdAt.toLocaleString("it-IT")}</td><td>{l.user?.name ?? "sistema"}</td><td>{l.action}</td><td className="text-cream/60">{l.entity} {l.entityId?.slice(-6)}</td></tr>)}</tbody></table></div>);
}

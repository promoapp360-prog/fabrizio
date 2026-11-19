"use client";
import { useState } from "react";
export default function Login() {
  const [password, setPassword] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? "Errore"); setPassword(""); return; }
      const next = new URLSearchParams(location.search).get("next");
      location.href = next?.startsWith("/admin") ? next : j.role === "KITCHEN" ? "/admin/cucina" : "/admin";
    } catch { setErr("Connessione assente, riprova"); } finally { setBusy(false); }
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <img src="/brand/logo-naming-oro.webp" alt="Vecciarì" className="mx-auto h-24" />
        <h1 className="text-center text-xl">Area staff</h1>
        <label className="block"><span className="label">Password</span>
          <input className="input text-center text-lg tracking-widest" type="password" required autoFocus autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        {err && <p role="alert" className="text-center text-sm text-red-400">{err}</p>}
        <button className="btn-gold w-full" disabled={busy}>{busy ? "…" : "Accedi"}</button>
        <p className="text-center text-xs text-cream/50">Password dimenticata? Chiedi al responsabile.</p>
      </form>
    </main>);
}

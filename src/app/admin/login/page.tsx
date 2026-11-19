"use client";
import { useState } from "react";
export default function Login() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false); const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await fetch(forgot ? "/api/auth/reset" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(forgot ? { email } : { email, password }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Errore");
    if (forgot) return setSent(true);
    const next = new URLSearchParams(location.search).get("next");
    location.href = next?.startsWith("/admin") ? next : j.role === "KITCHEN" ? "/admin/cucina" : "/admin";
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <img src="/brand/logo-naming-oro.webp" alt="Vecciarì" className="mx-auto h-24" />
        <h1 className="text-center text-xl">{forgot ? "Recupera password" : "Gestionale"}</h1>
        {sent ? <p className="text-center text-sm text-cream/70">Se l&apos;indirizzo è registrato riceverai un link (valido 1 ora).</p> : <>
          <label className="block"><span className="label">Email</span><input className="input" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label>
          {!forgot && <label className="block"><span className="label">Password</span><input className="input" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>}
          {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
          <button className="btn-gold w-full" disabled={busy}>{busy ? "…" : forgot ? "Invia link" : "Accedi"}</button></>}
        <button type="button" className="w-full text-xs text-cream/60 underline" onClick={() => { setForgot(!forgot); setSent(false); setErr(""); }}>{forgot ? "Torna all'accesso" : "Password dimenticata?"}</button>
      </form>
    </main>);
}

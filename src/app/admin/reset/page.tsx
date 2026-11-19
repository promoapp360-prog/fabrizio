"use client";
import { useState } from "react";
export default function Reset() {
  const [pw, setPw] = useState(""); const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = new URLSearchParams(location.search).get("token");
    const r = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: pw }) });
    const j = await r.json(); setMsg(r.ok ? "Password aggiornata. Ora puoi accedere." : j.error);
  }
  return <main className="flex min-h-screen items-center justify-center p-4"><form onSubmit={submit} className="card w-full max-w-sm space-y-4"><h1 className="text-xl">Nuova password</h1>
    <input className="input" type="password" required minLength={10} autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Min 10 caratteri, lettere e numeri" />
    <button className="btn-gold w-full">Salva</button>{msg && <p className="text-sm">{msg} <a href="/admin/login" className="underline">Accedi</a></p>}</form></main>;
}

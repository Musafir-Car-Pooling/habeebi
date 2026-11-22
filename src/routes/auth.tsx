import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery } from "@/lib/auth";
import { LanguagePicker, useT } from "@/lib/i18n";
import { Logo } from "@/components/app/Logo";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "login" | "signup" | undefined } => ({
    mode: s["mode"] === "signup" ? "signup" : s["mode"] === "login" ? "login" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — HaBeeBi" },
      { name: "description", content: "Sign in or create your HaBeeBi account as a citizen or service provider." },
      { property: "og:title", content: "Sign in — HaBeeBi" },
      { property: "og:description", content: "Join HaBeeBi as a citizen or service provider in the UAE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const { t } = useT();
  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const { data: cats } = useQuery(categoriesQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", phone: "+971", email: "", password: "" });
  const [type, setType] = useState<"citizen" | "provider">("citizen");
  const [services, setServices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toggle = (id: string) => setServices((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup") {
      if (!f.name.trim() || f.phone.length < 8) { toast.error(t("needNamePhone")); return; }
      if (type === "provider" && services.length === 0) { toast.error(t("needService")); return; }
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: f.email.trim(),
          password: f.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: f.name.trim(), phone: f.phone.trim(), category_ids: type === "provider" ? services : [] },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw error;
      }
      qc.removeQueries({ queryKey: ["me"] });
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setMode("login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      navigate({ to: (roles ?? []).some((r) => r.role === "admin") ? "/admin" : "/home", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(/weak|pwned|easy to guess/i.test(msg) ? t("weakPwd") : msg || t("error"));
    } finally {
      setBusy(false);
    }
  }

  const active = (cats ?? []).filter((c) => c.active);
  const chip = (on: boolean) => `flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-semibold transition-colors ${on ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`;
  return (
    <div className="mx-auto min-h-screen max-w-md px-6 py-8">
      <div className="flex items-start justify-between gap-2"><Logo big /><LanguagePicker /></div>
      <div className="mt-8 flex rounded-2xl bg-secondary p-1">
        {(["login", "signup"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-xl py-2.5 font-semibold transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {m === "login" ? t("login") : t("signup")}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-6 space-y-3">
        {mode === "signup" && (
          <>
            <Input className="h-12 rounded-xl" placeholder={t("fullName")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <Input className="h-12 rounded-xl" placeholder={t("phone")} type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <div>
              <div className="mb-2 text-sm font-semibold text-muted-foreground">{t("iAm")}</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setType("citizen")} className={chip(type === "citizen")}><span className="text-xl">🏠</span>{t("citizen")}</button>
                <button type="button" onClick={() => setType("provider")} className={chip(type === "provider")}><span className="text-xl">🧰</span>{t("provider")}</button>
              </div>
            </div>
            {type === "provider" && (
              <div>
                <div className="mb-2 text-sm font-semibold text-muted-foreground">{t("pickServices")} ({services.length})</div>
                <div className="grid grid-cols-3 gap-2">
                  {active.map((c) => {
                    const on = services.includes(c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => toggle(c.id)} className={`relative ${chip(on)}`}>
                        {on && <Check className="absolute end-1 top-1 h-3.5 w-3.5 text-primary" />}
                        <span className="text-xl">{c.icon}</span>{c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
        <Input className="h-12 rounded-xl" placeholder={t("email")} type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Input className="h-12 rounded-xl" placeholder={t("password")} type="password" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button disabled={busy} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-60">
          {busy ? t("wait") : mode === "login" ? t("login") : t("createAccount")}
        </button>
      </form>
    </div>
  );
}

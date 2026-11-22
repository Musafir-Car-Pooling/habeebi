import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery } from "@/lib/auth";
import { Logo } from "@/components/app/Logo";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "login" | "signup" } => ({
    mode: s["mode"] === "signup" ? "signup" : s["mode"] === "login" ? "login" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Serviyo" },
      { name: "description", content: "Sign in or create your Serviyo account as a citizen or service provider." },
      { property: "og:title", content: "Sign in — Serviyo" },
      { property: "og:description", content: "Join Serviyo as a citizen or service provider in the UAE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const { data: cats } = useQuery(categoriesQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", phone: "+971", email: "", password: "", category: "citizen" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!f.name.trim() || f.phone.length < 8) { toast.error("Naam aur phone number zaroori hai"); return; }
        const { error } = await supabase.auth.signUp({
          email: f.email.trim(),
          password: f.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: f.name.trim(), phone: f.phone.trim(), category_id: f.category === "citizen" ? "" : f.category },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw error;
      }
      qc.removeQueries({ queryKey: ["me"] });
      const { data: u } = await supabase.auth.getUser();
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user?.id ?? "");
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (!u.user) { toast.success("Account ban gaya — ab sign in karein"); setMode("login"); return; }
      navigate({ to: isAdmin ? "/admin" : "/home", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kuch ghalat ho gaya");
    } finally {
      setBusy(false);
    }
  }

  const active = (cats ?? []).filter((c) => c.active);
  return (
    <div className="mx-auto min-h-screen max-w-md px-6 py-10">
      <Logo big />
      <div className="mt-8 flex rounded-2xl bg-secondary p-1">
        {(["login", "signup"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-xl py-2.5 font-semibold transition ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {m === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-6 space-y-3">
        {mode === "signup" && (
          <>
            <Input className="h-12 rounded-xl" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <Input className="h-12 rounded-xl" placeholder="Phone (+971…)" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <div>
              <div className="mb-2 text-sm font-semibold text-muted-foreground">I am a…</div>
              <div className="grid grid-cols-3 gap-2">
                <CatChip label="Citizen" icon="🏠" on={f.category === "citizen"} onClick={() => setF({ ...f, category: "citizen" })} />
                {active.map((c) => (
                  <CatChip key={c.id} label={c.name} icon={c.icon} on={f.category === c.id} onClick={() => setF({ ...f, category: c.id })} />
                ))}
              </div>
            </div>
          </>
        )}
        <Input className="h-12 rounded-xl" placeholder="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Input className="h-12 rounded-xl" placeholder="Password" type="password" required minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button disabled={busy} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-60">
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </div>
  );
}

function CatChip({ label, icon, on, onClick }: { label: string; icon: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-semibold transition ${on ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`}>
      <span className="text-xl">{icon}</span>{label}
    </button>
  );
}

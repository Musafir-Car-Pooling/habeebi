import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Home, Briefcase, User, LogOut, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { LanguagePicker, useT } from "@/lib/i18n";
import { Logo } from "./Logo";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { data: me } = useMe();
  const { t } = useT();
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  if (me?.blocked) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <h1 className="text-xl font-bold">{t("blocked")}</h1>
          <p className="mt-2 text-muted-foreground">{t("blockedD")}</p>
          <button onClick={signOut} className="mt-4 rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground">{t("signOut")}</button>
        </div>
      </div>
    );
  }
  const nav = "flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground";
  const active = { className: "text-primary" };
  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-background px-4 py-3">
        {title ? <h1 className="truncate text-lg font-bold">{title}</h1> : <Logo />}
        <div className="flex shrink-0 items-center gap-1">
          <LanguagePicker className="max-w-28" />
          <button onClick={signOut} className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label={t("signOut")}>
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>
      <main className="px-4 py-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t border-border bg-card">
        <Link to="/home" className={nav} activeProps={active}><Home className="h-5 w-5" />{t("home")}</Link>
        <Link to="/jobs" className={nav} activeProps={active}><Briefcase className="h-5 w-5" />{me?.account_type === "provider" ? t("myJobs") : t("myRequests")}</Link>
        {me?.isAdmin && <Link to="/admin" className={nav} activeProps={active}><Shield className="h-5 w-5" />{t("admin")}</Link>}
        <Link to="/profile" className={nav} activeProps={active}><User className="h-5 w-5" />{t("profile")}</Link>
      </nav>
    </div>
  );
}

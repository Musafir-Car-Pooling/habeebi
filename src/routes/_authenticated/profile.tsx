import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, useMe } from "@/lib/auth";
import { LanguagePicker, useT } from "@/lib/i18n";
import { AppShell } from "@/components/app/AppShell";
import { ProviderReviews } from "@/components/app/ProviderReviews";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Habeebi" }, { name: "description", content: "Your Habeebi profile" }] }),
  component: Profile,
});

function Profile() {
  const { data: me } = useMe();
  const { t } = useT();
  const { data: cats } = useQuery(categoriesQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => { if (me) { setName(me.full_name); setPhone(me.phone); } }, [me]);
  if (!me) return null;
  async function save() {
    const a = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", me!.id);
    const b = await supabase.from("profile_private").update({ phone: phone.trim() }).eq("id", me!.id);
    if (a.error || b.error) toast.error((a.error ?? b.error)!.message);
    else { toast.success(t("saved")); qc.invalidateQueries({ queryKey: ["me"] }); }
  }
  async function toggleService(id: string) {
    const on = me!.service_ids.includes(id);
    if (on && me!.service_ids.length === 1) { toast.error(t("needService")); return; }
    const { error } = on
      ? await supabase.from("provider_services").delete().eq("provider_id", me!.id).eq("category_id", id)
      : await supabase.from("provider_services").insert({ provider_id: me!.id, category_id: id });
    if (error) toast.error(error.message);
    else { qc.invalidateQueries({ queryKey: ["me"] }); qc.invalidateQueries({ queryKey: ["feed"] }); }
  }
  return (
    <AppShell title={t("profile")}>
      <div className="space-y-3 rounded-2xl bg-card p-4">
        <div className="text-sm text-muted-foreground">{me.email} · {me.account_type === "provider" ? t("provider_t") : t("citizen")}{me.isAdmin ? " · Admin" : ""}</div>
        <Input className="h-12 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("fullName")} />
        <Input className="h-12 rounded-xl" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phone")} />
        <button onClick={save} className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground">{t("save")}</button>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-card p-4">
        <span className="font-semibold">{t("language")}</span><LanguagePicker />
      </div>
      {me.account_type === "provider" && (
        <>
          <h2 className="mb-3 mt-6 text-lg font-bold">{t("myServices")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {(cats ?? []).filter((c) => c.active).map((c) => {
              const on = me.service_ids.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleService(c.id)} className={`relative flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-semibold transition-colors ${on ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`}>
                  {on && <Check className="absolute end-1 top-1 h-3.5 w-3.5 text-primary" />}
                  <span className="text-xl">{c.icon}</span>{c.name}
                </button>
              );
            })}
          </div>
          <div className="mt-6"><h2 className="mb-3 text-lg font-bold">{t("myRatings")}</h2><ProviderReviews providerId={me.id} /></div>
        </>
      )}
    </AppShell>
  );
}

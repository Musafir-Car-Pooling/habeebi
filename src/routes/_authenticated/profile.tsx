import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";
import { ProviderReviews } from "@/components/app/ProviderReviews";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Serviyo" }, { name: "description", content: "Your Serviyo profile" }] }),
  component: Profile,
});

function Profile() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => { if (me) { setName(me.full_name); setPhone(me.phone); } }, [me]);
  if (!me) return null;
  async function save() {
    const a = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", me!.id);
    const b = await supabase.from("profile_private").update({ phone: phone.trim() }).eq("id", me!.id);
    if (a.error || b.error) toast.error((a.error ?? b.error)!.message);
    else { toast.success("Profile save ho gaya"); qc.invalidateQueries({ queryKey: ["me"] }); }
  }
  return (
    <AppShell title="Profile">
      <div className="space-y-3 rounded-2xl bg-card p-4">
        <div className="text-sm text-muted-foreground">{me.email} · {me.account_type === "provider" ? `Provider — ${me.category_name ?? ""}` : "Citizen"}{me.isAdmin ? " · Admin" : ""}</div>
        <Input className="h-12 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        <Input className="h-12 rounded-xl" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
        <button onClick={save} className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground">Save</button>
      </div>
      {me.account_type === "provider" && <div className="mt-6"><h2 className="mb-3 text-lg font-bold">My ratings</h2><ProviderReviews providerId={me.id} /></div>}
    </AppShell>
  );
}

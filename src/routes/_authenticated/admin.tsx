import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Ban, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { aed, categoriesQuery, timeAgo, useMe } from "@/lib/auth";
import { adminDeleteUser } from "@/lib/admin.functions";
import { AppShell } from "@/components/app/AppShell";
import { Stars } from "@/components/app/Stars";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — HaBeeBi" }, { name: "description", content: "HaBeeBi admin dashboard" }] }),
  component: Admin,
});

const tabs = ["Overview", "Services", "Users", "Requests", "Reviews", "Settings"] as const;
type Tab = (typeof tabs)[number];

function Admin() {
  const { data: me, isLoading } = useMe();
  const [tab, setTab] = useState<Tab>("Overview");
  if (isLoading) return null;
  if (!me?.isAdmin) return <AppShell title="Admin"><p className="text-muted-foreground">Sirf admin ke liye.</p></AppShell>;
  return (
    <AppShell title="Admin dashboard">
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{t}</button>
        ))}
      </div>
      {tab === "Overview" && <Overview />}
      {tab === "Services" && <Services />}
      {tab === "Users" && <Users />}
      {tab === "Requests" && <Requests />}
      {tab === "Reviews" && <Reviews />}
      {tab === "Settings" && <Settings />}
    </AppShell>
  );
}

function Overview() {
  const q = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const c = async (t: "profiles" | "service_requests" | "bids" | "reviews", f?: [string, string]) => {
        let qq = supabase.from(t).select("*", { count: "exact", head: true });
        if (f) qq = qq.eq(f[0], f[1]);
        return (await qq).count ?? 0;
      };
      const [users, providers, requests, open, completed, bids, reviews] = await Promise.all([
        c("profiles"), c("profiles", ["account_type", "provider"]), c("service_requests"),
        c("service_requests", ["status", "open"]), c("service_requests", ["status", "completed"]), c("bids"), c("reviews"),
      ]);
      const { data: acc } = await supabase.from("service_requests").select("accepted_bid_id").in("status", ["accepted", "completed"]);
      const ids = (acc ?? []).map((a) => a.accepted_bid_id).filter((x): x is string => !!x);
      const { data: bidRows } = ids.length ? await supabase.from("bids").select("amount_aed").in("id", ids) : { data: [] };
      const volume = (bidRows ?? []).reduce((s, b) => s + Number(b.amount_aed), 0);
      return { users, providers, citizens: users - providers, requests, open, completed, bids, reviews, volume };
    },
  });
  const s = q.data;
  const cards = s ? [
    ["Total users", s.users], ["Providers", s.providers], ["Citizens", s.citizens], ["Requests", s.requests],
    ["Open now", s.open], ["Completed", s.completed], ["Bids", s.bids], ["Reviews", s.reviews],
  ] : [];
  return (
    <div>
      <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <div className="text-sm font-semibold opacity-80">Booked job volume</div>
        <div className="text-3xl font-extrabold">{s ? aed(s.volume) : "…"}</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {cards.map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-card p-4"><div className="text-sm text-muted-foreground">{l}</div><div className="text-2xl font-extrabold">{v}</div></div>
        ))}
      </div>
    </div>
  );
}

function Services() {
  const qc = useQueryClient();
  const { data: cats } = useQuery(categoriesQuery);
  const [edit, setEdit] = useState<{ id?: string; name: string; icon: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["categories"] });
  async function save() {
    if (!edit?.name.trim()) return;
    const row = { name: edit.name.trim(), icon: edit.icon.trim() || "🛠️" };
    const { error } = edit.id
      ? await supabase.from("service_categories").update(row).eq("id", edit.id)
      : await supabase.from("service_categories").insert({ ...row, sort: (cats?.length ?? 0) + 1 });
    if (error) toast.error(error.message); else { toast.success("Saved"); setEdit(null); refresh(); }
  }
  async function del(id: string) {
    if (!confirm("Ye service delete karein? Is ki requests bhi delete ho jayengi.")) return;
    const { error } = await supabase.from("service_categories").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }
  async function toggle(id: string, active: boolean) {
    await supabase.from("service_categories").update({ active }).eq("id", id);
    refresh();
  }
  return (
    <div className="space-y-3">
      {edit ? (
        <div className="space-y-2 rounded-2xl bg-card p-4">
          <div className="flex gap-2">
            <Input className="h-12 w-16 rounded-xl text-center text-xl" value={edit.icon} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} />
            <Input className="h-12 flex-1 rounded-xl" placeholder="Service name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setEdit(null)} className="rounded-xl bg-secondary py-2.5 font-semibold">Cancel</button>
            <button onClick={save} className="rounded-xl bg-primary py-2.5 font-bold text-primary-foreground">Save</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEdit({ name: "", icon: "🛠️" })} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-bold text-primary-foreground"><Plus className="h-5 w-5" />Add service</button>
      )}
      {cats?.map((c) => (
        <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
          <span className="text-2xl">{c.icon}</span>
          <span className="flex-1 font-semibold">{c.name}</span>
          <Switch checked={c.active} onCheckedChange={(v) => toggle(c.id, v)} aria-label="Active" />
          <button onClick={() => setEdit({ id: c.id, name: c.name, icon: c.icon })} className="rounded-full p-2 hover:bg-secondary" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => del(c.id)} className="rounded-full p-2 text-destructive hover:bg-secondary" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const del = useServerFn(adminDeleteUser);
  const { data: cats } = useQuery(categoriesQuery);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const q = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const [{ data: p }, { data: priv }, { data: svc }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("profile_private").select("*"),
        supabase.from("provider_services").select("provider_id, category_id"),
      ]);
      const map = new Map((priv ?? []).map((x) => [x.id, x]));
      const sv = new Map<string, string[]>();
      for (const r of svc ?? []) sv.set(r.provider_id, [...(sv.get(r.provider_id) ?? []), r.category_id]);
      return (p ?? []).map((u) => ({ ...u, services: sv.get(u.id) ?? [], phone: map.get(u.id)?.phone ?? "", email: map.get(u.id)?.email ?? "" }));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });
  const remove = useMutation({
    mutationFn: (userId: string) => del({ data: { userId } }),
    onSuccess: () => { toast.success("User delete ho gaya"); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  async function block(id: string, blocked: boolean) {
    const { error } = await supabase.from("profiles").update({ blocked }).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }
  async function toggleService(id: string, current: string[], cat: string) {
    const on = current.includes(cat);
    const next = on ? current.filter((x) => x !== cat) : [...current, cat];
    const r1 = on
      ? await supabase.from("provider_services").delete().eq("provider_id", id).eq("category_id", cat)
      : await supabase.from("provider_services").insert({ provider_id: id, category_id: cat });
    const r2 = await supabase.from("profiles").update({ account_type: next.length ? "provider" : "citizen", category_id: next[0] ?? null }).eq("id", id);
    if (r1.error || r2.error) toast.error((r1.error ?? r2.error)!.message); else refresh();
  }
  const list = (q.data ?? []).filter((u) => {
    const s = search.toLowerCase();
    const okS = !s || u.full_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.phone.includes(s);
    const okF = filter === "all" || (filter === "citizen" ? u.account_type === "citizen" : u.services.includes(filter));
    return okS && okF;
  });
  return (
    <div className="space-y-3">
      <Input className="h-11 rounded-xl" placeholder="Search name, email, phone" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card px-3">
        <option value="all">All users</option>
        <option value="citizen">Citizens</option>
        {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="text-sm text-muted-foreground">{list.length} users</div>
      {list.map((u) => (
        <div key={u.id} className="rounded-2xl bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold">{u.full_name || "—"} {u.blocked && <span className="ms-1 rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">Blocked</span>}</div>
              <div className="truncate text-xs text-muted-foreground">{u.email} · {u.phone}</div>
            </div>
            <div className="flex shrink-0">
              <button onClick={() => block(u.id, !u.blocked)} className="rounded-full p-2 hover:bg-secondary" aria-label={u.blocked ? "Unblock" : "Block"}>
                {u.blocked ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Ban className="h-4 w-4 text-warning" />}
              </button>
              <button onClick={() => confirm("Is user ko hamesha ke liye delete karein?") && remove.mutate(u.id)} className="rounded-full p-2 text-destructive hover:bg-secondary" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-muted px-2 py-1 text-xs">{u.services.length ? "Provider" : "Citizen"}</span>
            {cats?.map((c) => {
              const on = u.services.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleService(u.id, u.services, c.id)} className={`rounded-full border px-2 py-1 text-xs font-semibold ${on ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground"}`}>
                  {c.icon} {c.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Requests() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const q = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: async () => (await supabase.from("service_requests").select("*, service_categories(name, icon), citizen:profiles!service_requests_citizen_id_fkey(full_name), bids(id)").order("created_at", { ascending: false }).limit(300)).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "requests"] });
  async function cancel(id: string) { await supabase.from("service_requests").update({ status: "cancelled" }).eq("id", id); refresh(); }
  async function del(id: string) { if (!confirm("Request delete karein?")) return; await supabase.from("service_requests").delete().eq("id", id); refresh(); }
  const list = (q.data ?? []).filter((r) => status === "all" || r.status === status);
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto">
        {["all", "open", "accepted", "completed", "cancelled"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${status === s ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>{s}</button>
        ))}
      </div>
      {list.map((r) => (
        <div key={r.id} className="rounded-2xl bg-card p-3">
          <div className="flex items-center justify-between">
            <Link to="/request/$id" params={{ id: r.id }} className="font-bold hover:underline">{r.service_categories?.icon} {r.service_categories?.name}</Link>
            <span className="text-xs capitalize text-muted-foreground">{r.status}</span>
          </div>
          <p className="line-clamp-1 text-sm">{r.description}</p>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{r.citizen?.full_name} · {aed(r.price_aed)} · {r.bids?.length ?? 0} bids · {timeAgo(r.created_at)}</span>
            <span className="flex gap-1">
              {r.status === "open" && <button onClick={() => cancel(r.id)} className="rounded-full p-1.5 hover:bg-secondary" aria-label="Cancel"><Ban className="h-4 w-4" /></button>}
              <button onClick={() => del(r.id)} className="rounded-full p-1.5 text-destructive hover:bg-secondary" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Reviews() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async () => (await supabase.from("reviews").select("*, provider:profiles!reviews_provider_id_fkey(full_name), citizen:profiles!reviews_citizen_id_fkey(full_name)").order("created_at", { ascending: false })).data ?? [],
  });
  async function del(id: string) { await supabase.from("reviews").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin", "reviews"] }); }
  return (
    <div className="space-y-3">
      {q.data?.length === 0 && <p className="text-muted-foreground">No reviews yet.</p>}
      {q.data?.map((r) => (
        <div key={r.id} className="flex gap-2 rounded-2xl bg-card p-3">
          <div className="flex-1">
            <div className="text-sm"><b>{r.citizen?.full_name}</b> → <b>{r.provider?.full_name}</b></div>
            <Stars value={r.rating} size={12} />
            {r.comment && <p className="text-sm">{r.comment}</p>}
          </div>
          <button onClick={() => del(r.id)} className="self-start rounded-full p-2 text-destructive hover:bg-secondary" aria-label="Delete review"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

function Settings() {
  const q = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("app_settings").select("*").eq("id", 1).single()).data });
  const [f, setF] = useState({ app_name: "", slogan: "", currency: "AED", commission_pct: "10" });
  useEffect(() => { if (q.data) setF({ app_name: q.data.app_name, slogan: q.data.slogan, currency: q.data.currency, commission_pct: String(q.data.commission_pct) }); }, [q.data]);
  async function save() {
    const { error } = await supabase.from("app_settings").update({ ...f, commission_pct: Number(f.commission_pct) || 0 }).eq("id", 1);
    if (error) toast.error(error.message); else toast.success("Settings saved");
  }
  return (
    <div className="space-y-3 rounded-2xl bg-card p-4">
      {([["app_name", "App name"], ["slogan", "Slogan"], ["currency", "Currency"], ["commission_pct", "Commission %"]] as const).map(([k, l]) => (
        <label key={k} className="block"><span className="text-sm text-muted-foreground">{l}</span>
          <Input className="mt-1 h-11 rounded-xl" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
      ))}
      <button onClick={save} className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground">Save settings</button>
    </div>
  );
}

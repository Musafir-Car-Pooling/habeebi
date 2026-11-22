import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapPin, Mic, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { aed, categoriesQuery, distanceKm, timeAgo, useMe } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — HaBeeBi" }, { name: "description", content: "HaBeeBi home" }] }),
  component: HomePage,
});

function HomePage() {
  const { data: me, isLoading } = useMe();
  const { t } = useT();
  if (isLoading || !me) return <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>;
  return <AppShell>{me.account_type === "provider" ? <ProviderFeed serviceIds={me.service_ids} meId={me.id} /> : <CitizenHome name={me.full_name} />}</AppShell>;
}

function CitizenHome({ name }: { name: string }) {
  const { data: cats } = useQuery(categoriesQuery);
  const { t } = useT();
  return (
    <div className="rise-in">
      <p className="text-muted-foreground">{t("hello")}, {name.split(" ")[0] || ""} 👋</p>
      <h2 className="mt-1 text-2xl font-extrabold">{t("whatService")}</h2>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {(cats ?? []).filter((c) => c.active).map((c) => (
          <Link key={c.id} to="/request/new" search={{ category: c.id }} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-card p-2 text-center transition-colors hover:bg-accent">
            <span className="text-3xl">{c.icon}</span>
            <span className="text-xs font-semibold">{c.name}</span>
          </Link>
        ))}
      </div>
      <Link to="/jobs" className="mt-6 block rounded-2xl bg-secondary p-4 text-center font-semibold">{t("viewRequests")}</Link>
    </div>
  );
}

function ProviderFeed({ serviceIds, meId }: { serviceIds: string[]; meId: string }) {
  const qc = useQueryClient();
  const { t } = useT();
  const { data: cats } = useQuery(categoriesQuery);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const key = serviceIds.slice().sort().join(",");
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { maximumAge: 300_000 });
  }, []);
  const q = useQuery({
    queryKey: ["feed", key],
    enabled: serviceIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("id, description, price_aed, address, lat, lng, voice_url, created_at, category_id, profiles!service_requests_citizen_id_fkey(full_name), bids(provider_id)")
        .eq("status", "open").in("category_id", serviceIds)
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, myBid: (r.bids ?? []).some((b) => b.provider_id === meId) }));
    },
  });
  useEffect(() => {
    if (!key) return;
    const ch = supabase.channel(`feed-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter: `category_id=in.(${key})` }, () => qc.invalidateQueries({ queryKey: ["feed", key] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, key]);

  if (serviceIds.length === 0) return <p className="text-muted-foreground">{t("noServices")}</p>;
  const catMap = new Map((cats ?? []).map((c) => [c.id, c]));
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-primary"><Radio className="h-4 w-4" /> {t("liveRequests")}</div>
      <h2 className="mt-1 text-2xl font-extrabold">{t("jobsNear")}</h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {serviceIds.map((id) => <span key={id} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">{catMap.get(id)?.icon} {catMap.get(id)?.name}</span>)}
      </div>
      <div className="mt-5 space-y-3">
        {q.isLoading && <p className="text-muted-foreground">{t("loading")}</p>}
        {q.data?.length === 0 && <div className="rounded-2xl bg-card p-6 text-center text-muted-foreground">{t("noRequests")}</div>}
        {q.data?.map((r) => (
          <Link key={r.id} to="/request/$id" params={{ id: r.id }} className="block rounded-2xl bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-primary">{catMap.get(r.category_id)?.icon} {catMap.get(r.category_id)?.name}</div>
                <div className="text-sm text-muted-foreground">{r.profiles?.full_name} · {timeAgo(r.created_at)}</div>
                <p className="mt-1 line-clamp-2 font-medium">{r.description}</p>
              </div>
              <div className="shrink-0 rounded-xl bg-primary px-3 py-1.5 font-extrabold text-primary-foreground">{aed(r.price_aed)}</div>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              {r.address && <span className="flex min-w-0 items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{r.address}</span></span>}
              {pos && r.lat != null && r.lng != null && <span className="shrink-0">{distanceKm(pos, { lat: r.lat, lng: r.lng }).toFixed(1)} km</span>}
              {r.voice_url && <Mic className="h-3.5 w-3.5 shrink-0" />}
              {r.myBid && <span className="ms-auto shrink-0 rounded-full bg-accent px-2 py-0.5 text-accent-foreground">{t("bidSent")}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

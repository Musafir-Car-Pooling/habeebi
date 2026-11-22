import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { aed, timeAgo, useMe } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "My jobs — Habeebi" }, { name: "description", content: "Your requests and jobs" }] }),
  component: Jobs,
});

const badge: Record<string, string> = {
  open: "bg-accent text-accent-foreground",
  accepted: "bg-primary text-primary-foreground",
  completed: "bg-secondary text-success",
  cancelled: "bg-secondary text-muted-foreground",
};

function Jobs() {
  const { data: me } = useMe();
  const { t } = useT();
  const q = useQuery({
    queryKey: ["jobs", me?.id, me?.account_type],
    enabled: !!me,
    queryFn: async () => {
      const col = me!.account_type === "provider" ? "provider_id" : "citizen_id";
      const { data, error } = await supabase.from("service_requests").select("id, status, description, price_aed, created_at, service_categories(name, icon), bids(id, status)").eq(col, me!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <AppShell title={me?.account_type === "provider" ? t("myJobs") : t("myRequests")}>
      <div className="space-y-3">
        {q.data?.length === 0 && <div className="rounded-2xl bg-card p-6 text-center text-muted-foreground">{t("nothing")}</div>}
        {q.data?.map((r) => (
          <Link key={r.id} to="/request/$id" params={{ id: r.id }} className="block rounded-2xl bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold">{r.service_categories?.icon} {r.service_categories?.name}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge[r.status]}`}>{t(`st_${r.status}` as "st_open")}</span>
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{r.description}</p>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{aed(r.price_aed)} · {timeAgo(r.created_at)}</span>
              {r.status === "open" && <span className="text-primary">{(r.bids ?? []).filter((b) => b.status === "pending").length} {t("offers")}</span>}
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

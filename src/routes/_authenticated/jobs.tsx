import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { aed, meQuery, timeAgo, useMe, type Me } from "@/lib/auth";
import { jobsQuery } from "@/lib/app-queries";
import { canDeleteRequest } from "@/lib/profile-validation";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/app/AppShell";
import { PageLoading, PageError, PageNotFound } from "@/components/app/PageStates";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "My jobs — Habeebi" }, { name: "description", content: "Your UAE service requests and jobs on Habeebi." }] }),
  loader: async ({ context }) => { const me = await context.queryClient.ensureQueryData(meQuery); if (me) await context.queryClient.ensureQueryData(jobsQuery(me)); },
  pendingMs: 150, pendingComponent: PageLoading, errorComponent: PageError, notFoundComponent: PageNotFound,
  component: Jobs,
});
const badge: Record<string, string> = { open: "bg-accent text-accent-foreground", accepted: "bg-primary text-primary-foreground", completed: "bg-secondary text-success", cancelled: "bg-secondary text-muted-foreground" };
function Jobs() {
  const { data: me } = useMe();
  if (!me) return <PageLoading />;
  return <JobList me={me} />;
}
function JobList({ me }: { me: Me }) {
  const { t } = useT();
  const qc = useQueryClient();
  const { data: jobs } = useSuspenseQuery(jobsQuery(me));
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const row = jobs.find((r) => r.id === id);
      if (!row || !canDeleteRequest(row.status, row.citizen_id, me.id)) throw new Error(t("unavailable"));
      const { data, error } = await supabase.from("service_requests").delete().eq("id", id).eq("citizen_id", me.id).eq("status", "cancelled").select("id");
      if (error) throw error;
      if (!data?.length) throw new Error(t("unavailable"));
    },
    onSuccess: (_data, id) => { qc.setQueryData(jobsQuery(me).queryKey, jobs.filter((r) => r.id !== id)); qc.removeQueries({ queryKey: ["request", id] }); toast.success(t("deleted")); qc.invalidateQueries({ queryKey: ["jobs"] }); },
    onError: (e) => toast.error(e.message),
  });
  return <AppShell title={me.account_type === "provider" ? t("myJobs") : t("myRequests")}>
    <div className="space-y-3">
      {jobs.length === 0 && <div className="py-6 text-center text-muted-foreground">{t("nothing")}</div>}
      {jobs.map((r) => <article key={r.id} className="relative rounded-lg bg-card">
        <Link to="/request/$id" params={{ id: r.id }} className={`block p-4 ${canDeleteRequest(r.status, r.citizen_id, me.id) ? "pe-14" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">{r.service_categories?.icon} {r.service_categories?.name}</span><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge[r.status]}`}>{t(`st_${r.status}` as "st_open")}</span></div>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{r.description}</p>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{aed(r.price_aed)} · {timeAgo(r.created_at)}</span>{r.status === "open" && <span className="text-primary">{r.bids.filter((b) => b.status === "pending").length} {t("offers")}</span>}</div>
        </Link>
        {canDeleteRequest(r.status, r.citizen_id, me.id) && <Button variant="ghost" size="icon" title={t("deleteRequest")} aria-label={t("deleteRequest")} disabled={remove.isPending} className="absolute end-2 top-3 text-destructive" onClick={() => { if (confirm(t("confirmDelete"))) remove.mutate(r.id); }}><Trash2 /></Button>}
      </article>)}
    </div>
  </AppShell>;
}

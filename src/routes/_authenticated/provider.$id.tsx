import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { ProviderReviews } from "@/components/app/ProviderReviews";

export const Route = createFileRoute("/_authenticated/provider/$id")({
  head: () => ({ meta: [{ title: "Provider — Serviyo" }, { name: "description", content: "Provider profile and reviews" }] }),
  component: ProviderPage,
});

function ProviderPage() {
  const { id } = Route.useParams();
  const p = useQuery({
    queryKey: ["provider", id],
    queryFn: async () => (await supabase.from("profiles").select("full_name, created_at, service_categories(name, icon)").eq("id", id).maybeSingle()).data,
  });
  const jobs = useQuery({
    queryKey: ["providerJobs", id],
    queryFn: async () => (await supabase.from("reviews").select("id", { count: "exact", head: true }).eq("provider_id", id)).count ?? 0,
  });
  return (
    <AppShell title="Provider">
      <div className="mb-4 flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-2xl font-extrabold text-primary-foreground">{(p.data?.full_name ?? "?").charAt(0)}</div>
        <div>
          <div className="text-xl font-extrabold">{p.data?.full_name}</div>
          <div className="text-sm text-muted-foreground">{p.data?.service_categories?.icon} {p.data?.service_categories?.name} · {jobs.data} jobs reviewed</div>
        </div>
      </div>
      <ProviderReviews providerId={id} />
    </AppShell>
  );
}

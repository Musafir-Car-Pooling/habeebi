import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/auth";
import { Stars } from "./Stars";
import { useT } from "@/lib/i18n";


export function ProviderReviews({ providerId }: { providerId: string }) {
  const q = useQuery({
    queryKey: ["reviews", providerId],
    queryFn: async () => (await supabase.from("reviews").select("*, citizen:profiles!reviews_citizen_id_fkey(full_name)").eq("provider_id", providerId).order("created_at", { ascending: false })).data ?? [],
  });
  const { t } = useT();
  const list = q.data ?? [];
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  return (
    <div>
      <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
        <div className="text-4xl font-extrabold">{list.length ? avg.toFixed(1) : "–"}</div>
        <div><Stars value={avg} size={18} /><div className="text-sm text-muted-foreground">{list.length} {t("reviews")}</div></div>
      </div>
      <div className="mt-3 space-y-2">
        {list.map((r) => (
          <div key={r.id} className="rounded-2xl bg-card p-3">
            <div className="flex items-center justify-between text-sm"><span className="font-semibold">{r.citizen?.full_name}</span><span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span></div>
            <Stars value={r.rating} size={12} />
            {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

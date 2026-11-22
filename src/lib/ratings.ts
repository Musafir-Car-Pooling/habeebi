import { supabase } from "@/integrations/supabase/client";

export type RatingInfo = { avg: number; count: number };

export async function fetchRatings(providerIds: string[]): Promise<Record<string, RatingInfo>> {
  const out: Record<string, RatingInfo> = {};
  if (!providerIds.length) return out;
  const { data } = await supabase.from("reviews").select("provider_id, rating").in("provider_id", providerIds);
  for (const r of data ?? []) {
    const cur = out[r.provider_id] ?? { avg: 0, count: 0 };
    cur.avg = (cur.avg * cur.count + r.rating) / (cur.count + 1);
    cur.count += 1;
    out[r.provider_id] = cur;
  }
  return out;
}

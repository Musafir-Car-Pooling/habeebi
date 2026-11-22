import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Me } from "@/lib/auth";

export const jobsQuery = (me: Me) => queryOptions({
  queryKey: ["jobs", me.id, me.account_type], staleTime: 60_000,
  queryFn: async () => {
    const col = me.account_type === "provider" ? "provider_id" : "citizen_id";
    const { data, error } = await supabase.from("service_requests").select("id, citizen_id, status, description, price_aed, created_at, service_categories(name, icon), bids(id, status)").eq(col, me.id).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data ?? [];
  },
});
export const feedQuery = (serviceIds: string[], meId: string) => queryOptions({
  queryKey: ["feed", meId, serviceIds.slice().sort().join(",")], staleTime: 60_000,
  queryFn: async () => {
    if (!serviceIds.length) return [];
    const { data, error } = await supabase.from("service_requests")
      .select("id, description, price_aed, address, lat, lng, voice_url, created_at, category_id, profiles!service_requests_citizen_id_fkey(full_name), bids(provider_id)")
      .eq("status", "open").in("category_id", serviceIds).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r, myBid: (r.bids ?? []).some((b) => b.provider_id === meId) }));
  },
});
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Me = {
  id: string;
  email: string;
  full_name: string;
  account_type: "citizen" | "provider";
  category_id: string | null;
  category_name: string | null;
  service_ids: string[];
  blocked: boolean;
  phone: string;
  gender: string | null;
  avatar_path: string | null;
  isAdmin: boolean;
};

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    // The protected layout validates identity; avoid a second auth network round-trip on each page.
    const { data: u } = await supabase.auth.getSession();
    const user = u.session?.user;
    if (!user) return null;
    const [profile, privateDetails, roleRows, serviceRows] = await Promise.all([
      supabase.from("profiles").select("*, service_categories!profiles_category_id_fkey(name)").eq("id", user.id).maybeSingle(),
      supabase.from("profile_private").select("phone, gender").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("provider_services").select("category_id").eq("provider_id", user.id),
    ]);
    for (const result of [profile, privateDetails, roleRows, serviceRows]) if (result.error) throw result.error;
    const p = profile.data, priv = privateDetails.data, roles = roleRows.data, svc = serviceRows.data;
    // Right after sign-up the session can race the first read; retry instead of caching an empty profile.
    if (!p) throw new Error("Profile not ready");
    return {
      id: user.id,
      email: user.email ?? "",
      full_name: p?.full_name ?? "",
      account_type: (p?.account_type as Me["account_type"]) ?? "citizen",
      category_id: p?.category_id ?? null,
      category_name: (p as { service_categories?: { name: string } | null } | null)?.service_categories?.name ?? null,
      service_ids: (svc ?? []).map((x) => x.category_id),
      blocked: p?.blocked ?? false,
      phone: priv?.phone ?? "",
      gender: priv?.gender ?? null,
      avatar_path: p.avatar_path,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    };
  },
  staleTime: 5 * 60_000,
  retry: 4,
  retryDelay: 400,
  refetchOnMount: false,
});

export function useMe() {
  return useQuery(meQuery);
}

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("service_categories").select("*").order("sort").order("name");
    if (error) throw error;
    return data;
  },
  staleTime: 10 * 60_000,
});

export const aed = (n: number | string) =>
  `AED ${Number(n).toLocaleString("en-AE", { maximumFractionDigits: 2 })}`;

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export async function signedMediaUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("media").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function ProfileAvatar({ path, name }: { path: string | null; name: string }) {
  const photo = useQuery({
    queryKey: ["avatar", path], enabled: !!path, staleTime: 45 * 60_000,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-2xl font-bold text-accent-foreground">
    {photo.data ? <img src={photo.data} alt={name} width={80} height={80} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
  </div>;
}
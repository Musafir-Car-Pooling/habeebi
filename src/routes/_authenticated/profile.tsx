import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, meQuery, useMe } from "@/lib/auth";
import { LanguagePicker, useT } from "@/lib/i18n";
import { detailsSchema, mobileDigits, mobileSchema, UAE_CODE } from "@/lib/profile-validation";
import { compressPhoto } from "@/lib/compress-photo";
import { AppShell } from "@/components/app/AppShell";
import { ProviderReviews } from "@/components/app/ProviderReviews";
import { MobileInput } from "@/components/app/MobileInput";
import { GenderSelect } from "@/components/app/GenderSelect";
import { ProfileAvatar } from "@/components/app/ProfileAvatar";
import { LoadingBubbles } from "@/components/app/LoadingBubbles";
import { PageLoading, PageError, PageNotFound } from "@/components/app/PageStates";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => pageMeta("Profile — Habeebi", "Your Habeebi profile, photo and services."),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(categoriesQuery)]); },
  pendingMs: 150, pendingComponent: PageLoading, errorComponent: PageError, notFoundComponent: PageNotFound,
  component: Profile,
});

function Profile() {
  const { data: me } = useMe();
  const { t } = useT();
  const { data: cats } = useSuspenseQuery(categoriesQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [serviceBusy, setServiceBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (me) { setName(me.full_name); setPhone(mobileDigits(me.phone)); setGender(me.gender ?? ""); } }, [me]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me || busy) return;
    if (!mobileSchema.safeParse(phone).success) { toast.error(t("invalidMobile")); return; }
    const valid = detailsSchema.safeParse({ name, phone, gender });
    if (!valid.success) { toast.error(t(!gender ? "selectGender" : "needNamePhone")); return; }
    setBusy(true);
    try {
      const a = await supabase.from("profiles").update({ full_name: valid.data.name }).eq("id", me.id);
      if (a.error) throw a.error;
      const b = await supabase.from("profile_private").update({ phone: UAE_CODE + valid.data.phone, gender: valid.data.gender }).eq("id", me.id);
      if (b.error) throw b.error;
      toast.success(t("saved")); await qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : t("error")); }
    finally { setBusy(false); }
  }
  async function uploadPhoto(file: File) {
    if (!me || uploading) return;
    setUploading(true);
    let uploaded: string | null = null;
    try {
      const photo = await compressPhoto(file);
      const path = `${me.id}/${crypto.randomUUID()}.${photo.type === "image/webp" ? "webp" : "jpg"}`;
      const { error } = await supabase.storage.from("avatars").upload(path, photo, { contentType: photo.type });
      if (error) throw error;
      uploaded = path;
      const result = await supabase.from("profiles").update({ avatar_path: path }).eq("id", me.id);
      if (result.error) throw result.error;
      if (me.avatar_path) await supabase.storage.from("avatars").remove([me.avatar_path]);
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(t("saved"));
    } catch (e) {
      if (uploaded) await supabase.storage.from("avatars").remove([uploaded]);
      toast.error(e instanceof Error && e.message === "photoInvalid" ? t("photoInvalid") : t("error"));
    } finally { setUploading(false); if (fileInput.current) fileInput.current.value = ""; }
  }
  async function toggleService(id: string) {
    if (!me || serviceBusy) return;
    const on = me.service_ids.includes(id);
    if (on && me.service_ids.length === 1) { toast.error(t("needService")); return; }
    setServiceBusy(true);
    const { error } = on
      ? await supabase.from("provider_services").delete().eq("provider_id", me.id).eq("category_id", id)
      : await supabase.from("provider_services").insert({ provider_id: me.id, category_id: id });
    if (error) toast.error(error.message);
    else { await qc.invalidateQueries({ queryKey: ["me"] }); qc.invalidateQueries({ queryKey: ["feed"] }); }
    setServiceBusy(false);
  }
  if (!me) return <PageLoading />;
  return (
    <AppShell title={t("profile")}>
      <div className="mb-5 flex items-center gap-4">
        <ProfileAvatar path={me.avatar_path} name={me.full_name} />
        <div className="min-w-0 space-y-2">
          <p className="font-semibold">{t("profilePhoto")}</p>
          <Button variant="secondary" disabled={uploading} onClick={() => fileInput.current?.click()}>{uploading ? <LoadingBubbles compact /> : <><Camera />{t("changePhoto")}</>}</Button>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label={t("profilePhoto")} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadPhoto(file); }} />
        </div>
      </div>
      <form onSubmit={save} className="space-y-3">
        <div className="break-words text-sm text-muted-foreground">{me.email} · {me.account_type === "provider" ? t("provider_t") : t("citizen")}{me.isAdmin ? ` · ${t("admin")}` : ""}</div>
        <Input className="h-12" aria-label={t("fullName")} value={name} required maxLength={100} onChange={(e) => setName(e.target.value)} placeholder={t("fullName")} />
        <MobileInput value={phone} onChange={setPhone} />
        <GenderSelect value={gender} onChange={setGender} />
        <Button type="submit" disabled={busy || uploading} className="h-12 w-full font-bold">{busy ? <LoadingBubbles compact /> : t("save")}</Button>
      </form>
      <div className="mt-5 flex items-center justify-between border-y border-border py-4">
        <span className="font-semibold">{t("language")}</span><LanguagePicker />
      </div>
      {me.account_type === "provider" && <>
        <h2 className="mb-3 mt-6 text-lg font-bold">{t("myServices")}</h2>
        <div className="grid grid-cols-3 gap-2">{cats.filter((c) => c.active).map((c) => {
          const on = me.service_ids.includes(c.id);
          return <Button variant="outline" key={c.id} disabled={serviceBusy} aria-pressed={on} onClick={() => toggleService(c.id)} className={`relative h-auto min-h-20 flex-col whitespace-normal rounded-lg p-2 text-xs ${on ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"}`}>
            {on && <Check className="absolute end-1 top-1 h-3.5 w-3.5 text-primary" />}<span className="text-xl">{c.icon}</span>{c.name}
          </Button>;
        })}</div>
        <div className="mt-6"><h2 className="mb-3 text-lg font-bold">{t("myRatings")}</h2><ProviderReviews providerId={me.id} /></div>
      </>}
    </AppShell>
  );
}

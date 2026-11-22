import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Crosshair, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, useMe } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";
import { VoiceRecorder } from "@/components/app/VoiceRecorder";
import { MapView } from "@/components/app/MapView";
import { useT } from "@/lib/i18n";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/request/new")({
  validateSearch: (s: Record<string, unknown>): { category: string } => ({ category: String(s["category"] ?? "") }),
  head: () => ({ meta: [{ title: "New request — Habeebi" }, { name: "description", content: "Post a service request" }] }),
  component: NewRequest,
});

function NewRequest() {
  const { category } = Route.useSearch();
  const { data: cats } = useQuery(categoriesQuery);
  const { data: me } = useMe();
  const navigate = useNavigate();
  const { t } = useT();
  const cat = cats?.find((c) => c.id === category);
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [voice, setVoice] = useState<Blob | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);

  function locate() {
    if (!navigator.geolocation) { toast.error(t("noGps")); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (p) => {
      const l = { lat: p.coords.latitude, lng: p.coords.longitude };
      setLoc(l);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${l.lat}&lon=${l.lng}`);
        const j = await r.json();
        setAddress(j.display_name ?? "");
      } catch { /* keep manual */ }
      setLocating(false);
    }, () => { setLocating(false); toast.error(t("noGps")); }, { enableHighAccuracy: true, timeout: 15000 });
  }

  async function send() {
    if (!me || !cat) return;
    const p = Number(price);
    if (desc.trim().length < 5) { toast.error(t("needDesc")); return; }
    if (!p || p <= 0) { toast.error(t("needPrice")); return; }
    setBusy(true);
    try {
      let voice_url: string | null = null;
      if (voice) {
        const path = `${me.id}/${Date.now()}.webm`;
        const { error } = await supabase.storage.from("media").upload(path, voice, { contentType: voice.type });
        if (error) throw error;
        voice_url = path;
      }
      const { data, error } = await supabase.from("service_requests").insert({
        citizen_id: me.id, category_id: cat.id, description: desc.trim(), price_aed: p,
        lat: loc?.lat ?? null, lng: loc?.lng ?? null, address: address.trim() || null, voice_url,
      }).select("id").single();
      if (error) throw error;
      navigate({ to: "/request/$id", params: { id: data.id }, replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("error"));
    } finally { setBusy(false); }
  }

  return (
    <AppShell title={cat ? `${cat.icon} ${cat.name}` : t("sendRequest")}>
      <div className="space-y-5">
        <section>
          <label className="mb-2 block text-sm font-semibold text-muted-foreground">{t("taskDesc")}</label>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("taskPh")} className="min-h-28 rounded-2xl bg-card text-base" maxLength={1000} />
        </section>
        <section>
          <label className="mb-2 block text-sm font-semibold text-muted-foreground">{t("voiceNote")}</label>
          <VoiceRecorder value={voice} onChange={setVoice} />
        </section>
        <section>
          <label className="mb-2 block text-sm font-semibold text-muted-foreground">{t("location")}</label>
          <button type="button" onClick={locate} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-3 font-semibold">
            {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crosshair className="h-5 w-5 text-primary" />} {t("useLocation")}
          </button>
          {loc && <div className="mt-3"><MapView lat={loc.lat} lng={loc.lng} autoLoad /></div>}
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("address")} className="mt-3 h-12 w-full rounded-2xl border border-input bg-card px-4" />
        </section>
        <section>
          <label className="mb-2 block text-sm font-semibold text-muted-foreground">{t("offerPrice")}</label>
          <div className="flex items-center rounded-2xl bg-card px-4">
            <span className="text-xl font-extrabold text-primary">AED</span>
            <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" className="h-16 w-full bg-transparent px-3 text-3xl font-extrabold outline-none" />
          </div>
        </section>
        <button onClick={send} disabled={busy} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-60">
          {busy ? t("sending") : t("sendRequest")}
        </button>
      </div>
    </AppShell>
  );
}

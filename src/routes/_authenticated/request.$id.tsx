import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Clock, MapPin, MessageCircle, Phone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { aed, signedMediaUrl, timeAgo, useMe } from "@/lib/auth";
import { fetchRatings } from "@/lib/ratings";
import { AppShell } from "@/components/app/AppShell";
import { MapView } from "@/components/app/MapView";
import { Stars } from "@/components/app/Stars";
import { useT } from "@/lib/i18n";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/request/$id")({
  head: () => ({ meta: [{ title: "Request — Habeebi" }, { name: "description", content: "Service request details and bids" }] }),
  component: RequestPage,
});

function useRequest(id: string) {
  return useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*, service_categories(name, icon), citizen:profiles!service_requests_citizen_id_fkey(full_name), provider:profiles!service_requests_provider_id_fkey(full_name)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function RequestPage() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const { data: req, isLoading } = useRequest(id);
  const qc = useQueryClient();
  const { t } = useT();
  useEffect(() => {
    const ch = supabase.channel(`req-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bids", filter: `request_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["bids", id] }))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_requests", filter: `id=eq.${id}` }, () => { qc.invalidateQueries({ queryKey: ["request", id] }); qc.invalidateQueries({ queryKey: ["bids", id] }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  if (isLoading || !me) return <AppShell><p className="text-muted-foreground">{t("loading")}</p></AppShell>;
  if (!req) return <AppShell><p className="text-muted-foreground">{t("unavailable")}</p></AppShell>;
  const isCitizen = req.citizen_id === me.id;
  const title = `${req.service_categories?.icon ?? ""} ${req.service_categories?.name ?? "Request"}`;
  return (
    <AppShell title={title}>
      {isCitizen && req.status === "open" ? (
        <Searching req={req} />
      ) : (
        <div className="space-y-4">
          <Summary req={req} />
          {req.status === "open" && !isCitizen && <BidForm req={req} meId={me.id} />}
          {(req.status === "accepted" || req.status === "completed") && (req.provider_id === me.id || isCitizen) && (
            <Matched req={req} isCitizen={isCitizen} />
          )}
          {req.status === "cancelled" && <p className="rounded-2xl bg-card p-4 text-center text-muted-foreground">{t("cancelled")}</p>}
        </div>
      )}
    </AppShell>
  );
}

type Req = NonNullable<ReturnType<typeof useRequest>["data"]>;

function Summary({ req }: { req: Req }) {
  const voice = useQuery({ queryKey: ["voice", req.voice_url], enabled: !!req.voice_url, queryFn: () => signedMediaUrl(req.voice_url) });
  return (
    <div className="space-y-3 rounded-2xl bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{req.citizen?.full_name} · {timeAgo(req.created_at)}</div>
          <p className="mt-1 whitespace-pre-wrap">{req.description}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-primary px-3 py-1.5 font-extrabold text-primary-foreground">{aed(req.price_aed)}</div>
      </div>
      {voice.data && <audio src={voice.data} controls preload="none" className="h-10 w-full" />}
      {req.address && <div className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{req.address}</div>}
      {req.lat != null && req.lng != null && <MapView lat={req.lat} lng={req.lng} height={140} />}
    </div>
  );
}

function useBids(id: string) {
  return useQuery({
    queryKey: ["bids", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bids").select("*, profiles(full_name)").eq("request_id", id).order("created_at");
      if (error) throw error;
      const ratings = await fetchRatings([...new Set((data ?? []).map((b) => b.provider_id))]);
      return (data ?? []).map((b) => ({ ...b, rating: ratings[b.provider_id] ?? { avg: 0, count: 0 } }));
    },
  });
}

function Searching({ req }: { req: Req }) {
  const qc = useQueryClient();
  const { data: bids } = useBids(req.id);
  const { t } = useT();
  const pending = (bids ?? []).filter((b) => b.status === "pending");
  const accept = useMutation({
    mutationFn: async (bidId: string) => { const { error } = await supabase.rpc("accept_bid", { _bid_id: bidId }); if (error) throw error; },
    onSuccess: () => { toast.success(t("offerAccepted")); qc.invalidateQueries({ queryKey: ["request", req.id] }); },
    onError: (e) => toast.error(e.message),
  });
  const decline = useMutation({
    mutationFn: async (bidId: string) => { const { error } = await supabase.from("bids").update({ status: "rejected" }).eq("id", bidId); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bids", req.id] }),
  });
  async function cancel() {
    const { error } = await supabase.from("service_requests").update({ status: "cancelled" }).eq("id", req.id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["request", req.id] });
  }
  return (
    <div>
      <div className="relative mx-auto my-6 grid h-52 w-52 place-items-center">
        {[0, 0.8, 1.6].map((d) => (
          <span key={d} className="radar-ring absolute inset-0 m-auto h-24 w-24 rounded-full border-2 border-primary" style={{ animationDelay: `${d}s` }} />
        ))}
        <div className="relative grid h-20 w-20 place-items-center rounded-full bg-primary text-4xl">{req.service_categories?.icon}</div>
      </div>
      <h2 className="text-center text-xl font-extrabold">{t("searching")}</h2>
      <p className="mt-1 text-center text-sm text-muted-foreground">{t("yourOffer")}: <span className="font-bold text-primary">{aed(req.price_aed)}</span> · {t("offersAppear")}</p>
      <div className="mt-6 space-y-3">
        {pending.map((b) => (
          <div key={b.id} className="rise-in rounded-2xl bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-accent text-lg font-bold text-accent-foreground">{(b.profiles?.full_name ?? "?").charAt(0)}</div>
              <div className="min-w-0 flex-1">
                <Link to="/provider/$id" params={{ id: b.provider_id }} className="font-bold hover:underline">{b.profiles?.full_name}</Link>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Stars value={b.rating.avg} size={12} /> {b.rating.count ? `${b.rating.avg.toFixed(1)} (${b.rating.count})` : t("newPro")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold">{aed(b.amount_aed)}</div>
                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{b.eta_minutes} min</div>
              </div>
            </div>
            {b.message && <p className="mt-2 text-sm text-muted-foreground">“{b.message}”</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => decline.mutate(b.id)} className="flex items-center justify-center gap-1 rounded-xl bg-secondary py-2.5 font-semibold"><X className="h-4 w-4" />{t("decline")}</button>
              <button onClick={() => accept.mutate(b.id)} disabled={accept.isPending} className="flex items-center justify-center gap-1 rounded-xl bg-primary py-2.5 font-bold text-primary-foreground"><Check className="h-4 w-4" />{t("accept")}</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={cancel} className="mt-6 w-full rounded-2xl bg-secondary py-3 font-semibold text-destructive">{t("cancelRequest")}</button>
    </div>
  );
}

function BidForm({ req, meId }: { req: Req; meId: string }) {
  const qc = useQueryClient();
  const { data: bids } = useBids(req.id);
  const { t } = useT();
  const mine = bids?.find((b) => b.provider_id === meId);
  const [amount, setAmount] = useState(String(req.price_aed));
  const [eta, setEta] = useState("30");
  const [msg, setMsg] = useState("");
  const send = useMutation({
    mutationFn: async (value: number) => {
      const { error } = await supabase.from("bids").insert({ request_id: req.id, provider_id: meId, amount_aed: value, eta_minutes: Number(eta) || 30, message: msg.trim() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("offerSent")); qc.invalidateQueries({ queryKey: ["bids", req.id] }); },
    onError: (e) => toast.error(e.message),
  });
  if (mine) {
    return (
      <div className="rounded-2xl bg-accent p-4 text-accent-foreground">
        <div className="font-bold">{t("yourOffer")}: {aed(mine.amount_aed)}</div>
        <div className="text-sm">{mine.status === "pending" ? t("waitingReply") : mine.status === "rejected" ? t("declined") : t("st_accepted")}</div>
        {mine.status === "pending" && (
          <button onClick={async () => { await supabase.from("bids").delete().eq("id", mine.id); qc.invalidateQueries({ queryKey: ["bids", req.id] }); }} className="mt-3 text-sm underline">{t("withdraw")}</button>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl bg-card p-4">
      <button onClick={() => send.mutate(Number(req.price_aed))} disabled={send.isPending} className="w-full rounded-2xl bg-primary py-3.5 font-bold text-primary-foreground">
        {t("acceptFor")} {aed(req.price_aed)}
      </button>
      <div className="text-center text-xs text-muted-foreground">{t("orOffer")}</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="rounded-xl bg-secondary px-3 py-2"><span className="text-xs text-muted-foreground">{t("yourPrice")}</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} className="w-full bg-transparent text-xl font-extrabold outline-none" /></label>
        <label className="rounded-xl bg-secondary px-3 py-2"><span className="text-xs text-muted-foreground">{t("arrival")}</span>
          <input inputMode="numeric" value={eta} onChange={(e) => setEta(e.target.value.replace(/\D/g, ""))} className="w-full bg-transparent text-xl font-extrabold outline-none" /></label>
      </div>
      <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t("messageOpt")} className="rounded-xl bg-secondary" maxLength={300} />
      <button onClick={() => { const v = Number(amount); if (!v) { toast.error(t("needPrice")); return; } send.mutate(v); }} disabled={send.isPending} className="w-full rounded-2xl bg-secondary py-3.5 font-bold">
        {t("sendOffer")} {amount ? aed(amount) : ""}
      </button>
    </div>
  );
}

function Matched({ req, isCitizen }: { req: Req; isCitizen: boolean }) {
  const qc = useQueryClient();
  const contacts = useQuery({
    queryKey: ["contacts", req.id],
    queryFn: async () => { const { data } = await supabase.rpc("get_contacts", { _request_id: req.id }); return data?.[0] ?? null; },
  });
  const bid = useQuery({
    queryKey: ["acceptedBid", req.accepted_bid_id],
    enabled: !!req.accepted_bid_id,
    queryFn: async () => (await supabase.from("bids").select("amount_aed").eq("id", req.accepted_bid_id!).maybeSingle()).data,
  });
  const review = useQuery({
    queryKey: ["review", req.id],
    queryFn: async () => (await supabase.from("reviews").select("*").eq("request_id", req.id).maybeSingle()).data,
  });
  const { t } = useT();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const otherName = isCitizen ? req.provider?.full_name : req.citizen?.full_name;
  const otherPhone = isCitizen ? contacts.data?.provider_phone : contacts.data?.citizen_phone;

  async function complete() {
    const { error } = await supabase.rpc("complete_request", { _request_id: req.id });
    if (error) toast.error(error.message); else { toast.success(t("jobDone")); qc.invalidateQueries({ queryKey: ["request", req.id] }); }
  }
  async function submitReview() {
    const { error } = await supabase.from("reviews").insert({ request_id: req.id, provider_id: req.provider_id!, citizen_id: req.citizen_id, rating, comment: comment.trim() });
    if (error) toast.error(error.message); else { toast.success(t("thanksReview")); qc.invalidateQueries({ queryKey: ["review", req.id] }); }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
        <div className="text-sm font-semibold opacity-80">{req.status === "completed" ? t("completed") : t("matched")} · {bid.data ? aed(bid.data.amount_aed) : ""}</div>
        <div className="mt-1 text-2xl font-extrabold">{otherName}</div>
        {otherPhone && <div className="mt-1 text-lg font-bold">{otherPhone}</div>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={otherPhone ? `tel:${otherPhone}` : undefined} className="flex items-center justify-center gap-2 rounded-xl bg-primary-foreground py-3 font-bold text-primary"><Phone className="h-4 w-4" />{t("call")}</a>
          <Link to="/chat/$id" params={{ id: req.id }} className="flex items-center justify-center gap-2 rounded-xl bg-primary-foreground py-3 font-bold text-primary"><MessageCircle className="h-4 w-4" />{t("chat")}</Link>
        </div>
      </div>
      {req.status === "accepted" && (
        <button onClick={complete} className="w-full rounded-2xl bg-secondary py-3.5 font-bold">{t("markDone")}</button>
      )}
      {req.status === "completed" && isCitizen && !review.isLoading && (
        review.data ? (
          <div className="rounded-2xl bg-card p-4"><div className="text-sm text-muted-foreground">{t("yourReview")}</div><Stars value={review.data.rating} size={18} /><p className="mt-1">{review.data.comment}</p></div>
        ) : (
          <div className="space-y-3 rounded-2xl bg-card p-4">
            <div className="font-bold">{t("rate")} {otherName}</div>
            <Stars value={rating} size={30} onChange={setRating} />
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("reviewPh")} className="rounded-xl bg-secondary" maxLength={500} />
            <button onClick={submitReview} className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground">{t("submitReview")}</button>
          </div>
        )
      )}
    </div>
  );
}

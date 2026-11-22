import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Gavel, LayoutGrid, MapPin, MessageCircle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LanguagePicker, useT, type TKey } from "@/lib/i18n";
import logo from "@/assets/habeebi-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HaBeeBi — Find UAE service providers & get bids in AED" },
      { name: "description", content: "Post your job, share your location and get competing offers from plumbers, electricians, cleaners and more in the UAE." },
      { property: "og:title", content: "HaBeeBi — An ultimate service provider" },
      { property: "og:description", content: "Post your job and get bids from trusted UAE service providers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SLIDES: { icon: typeof Gavel; t: TKey; d: TKey }[] = [
  { icon: LayoutGrid, t: "ob1t", d: "ob1d" },
  { icon: Wallet, t: "ob2t", d: "ob2d" },
  { icon: MapPin, t: "ob3t", d: "ob3d" },
  { icon: Gavel, t: "ob4t", d: "ob4d" },
  { icon: MessageCircle, t: "ob5t", d: "ob5d" },
];

function Index() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"splash" | "onboarding">("splash");
  useEffect(() => {
    const started = Date.now();
    supabase.auth.getSession().then(({ data }) => {
      const wait = Math.max(0, 1400 - (Date.now() - started));
      setTimeout(() => {
        if (data.session) navigate({ to: "/home", replace: true });
        else if (localStorage.getItem("hb-onboarded")) navigate({ to: "/auth", search: { mode: "login" }, replace: true });
        else setPhase("onboarding");
      }, wait);
    });
  }, [navigate]);
  return phase === "splash" ? <Splash /> : <Onboarding />;
}

function Splash() {
  const { t } = useT();
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center">
        <div className="relative grid place-items-center">
          <span className="radar-ring absolute h-28 w-28 rounded-full border-2 border-primary" />
          <img src={logo} alt="HaBeeBi logo" width={128} height={128} className="pop-in relative h-32 w-32" />
        </div>
        <h1 className="rise-in mt-6 text-4xl font-extrabold tracking-tight" style={{ animationDelay: "0.25s" }}>
          Ha<span className="text-primary">Bee</span>Bi
        </h1>
        <p className="rise-in mt-1 text-muted-foreground" style={{ animationDelay: "0.4s" }}>{t("slogan")}</p>
      </div>
    </div>
  );
}

function Onboarding() {
  const { t } = useT();
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i]!;
  const finish = () => localStorage.setItem("hb-onboarded", "1");
  const go = (n: number) => setI(Math.min(SLIDES.length - 1, Math.max(0, n)));
  return (
    <div
      className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-6"
      onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        const s = touchX.current; const x = e.changedTouches[0]?.clientX;
        if (s == null || x == null) return;
        const dx = x - s;
        const rtl = document.documentElement.dir === "rtl";
        if (Math.abs(dx) > 50) go(i + ((dx < 0) !== rtl ? 1 : -1));
      }}
    >
      <div className="flex items-center justify-between">
        <LanguagePicker />
        {!last && <Link to="/auth" search={{ mode: "signup" }} onClick={finish} className="text-sm font-semibold text-muted-foreground">{t("skip")}</Link>}
      </div>
      <div key={i} className="rise-in flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative grid h-48 w-48 place-items-center rounded-full bg-accent">
          <div className="grid h-28 w-28 place-items-center rounded-full bg-primary text-primary-foreground">
            <slide.icon className="h-12 w-12" strokeWidth={2.2} />
          </div>
          <img src={logo} alt="" width={56} height={56} className="absolute -right-1 top-2 h-14 w-14" />
        </div>
        <h2 className="mt-10 text-3xl font-extrabold leading-tight">{t(slide.t)}</h2>
        <p className="mt-3 max-w-xs text-muted-foreground">{t(slide.d)}</p>
      </div>
      <div className="mb-6 flex justify-center gap-2">
        {SLIDES.map((_, n) => (
          <button key={n} onClick={() => go(n)} aria-label={`Slide ${n + 1}`} className={`h-2 rounded-full transition-all ${n === i ? "w-8 bg-primary" : "w-2 bg-muted"}`} />
        ))}
      </div>
      {last ? (
        <div className="space-y-3">
          <Link to="/auth" search={{ mode: "signup" }} onClick={finish} className="block w-full rounded-2xl bg-primary py-4 text-center text-lg font-bold text-primary-foreground">{t("getStarted")}</Link>
          <Link to="/auth" search={{ mode: "login" }} onClick={finish} className="block w-full rounded-2xl bg-secondary py-4 text-center font-semibold">{t("haveAccount")}</Link>
        </div>
      ) : (
        <button onClick={() => go(i + 1)} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground">{t("next")}</button>
      )}
    </div>
  );
}

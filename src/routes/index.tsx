import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Gavel, MapPin, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Serviyo — Find UAE service providers & get bids in AED" },
      { name: "description", content: "Post your job, share your location and get competing offers from plumbers, electricians, cleaners and more in the UAE." },
      { property: "og:title", content: "Serviyo — An ultimate service provider" },
      { property: "og:description", content: "Post your job and get bids from trusted UAE service providers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);
  const items = [
    { icon: MapPin, t: "Location share karein", d: "GPS se exact jagah bhejein" },
    { icon: Gavel, t: "Bids hasil karein", d: "Providers apni offers AED mein dete hain" },
    { icon: ShieldCheck, t: "Ratings dekh kar chunein", d: "Reviews ke sath behtareen choose karein" },
  ];
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <Logo big />
      <h1 className="mt-12 text-4xl font-extrabold leading-tight tracking-tight">
        Your price.<br /><span className="text-primary">Your pro.</span>
      </h1>
      <p className="mt-3 text-muted-foreground">Electrician, plumber, cleaner, maid, cook — UAE mein har service, apni offer ke sath.</p>
      <div className="mt-8 space-y-3">
        {items.map((i) => (
          <div key={i.t} className="flex items-center gap-4 rounded-2xl bg-card p-4">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground"><i.icon className="h-5 w-5" /></div>
            <div><div className="font-semibold">{i.t}</div><div className="text-sm text-muted-foreground">{i.d}</div></div>
          </div>
        ))}
      </div>
      <div className="mt-auto space-y-3 pt-10">
        <Link to="/auth" search={{ mode: "signup" }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground">
          Get started <ArrowRight className="h-5 w-5" />
        </Link>
        <Link to="/auth" search={{ mode: "login" }} className="block w-full rounded-2xl bg-secondary py-4 text-center font-semibold">
          I already have an account
        </Link>
      </div>
    </div>
  );
}

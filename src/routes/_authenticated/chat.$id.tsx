import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useT } from "@/lib/i18n";


export const Route = createFileRoute("/_authenticated/chat/$id")({
  head: () => ({ meta: [{ title: "Chat — HaBeeBi" }, { name: "description", content: "In-app chat" }] }),
  component: Chat,
});

function Chat() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { t } = useT();
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const req = useQuery({
    queryKey: ["chatReq", id],
    queryFn: async () => (await supabase.from("service_requests").select("citizen_id, provider_id, citizen:profiles!service_requests_citizen_id_fkey(full_name), provider:profiles!service_requests_provider_id_fkey(full_name)").eq("id", id).maybeSingle()).data,
  });
  const msgs = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => (await supabase.from("messages").select("*").eq("request_id", id).order("created_at")).data ?? [],
  });
  useEffect(() => {
    const ch = supabase.channel(`chat-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["messages", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.data?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !me) return;
    setText("");
    await supabase.from("messages").insert({ request_id: id, sender_id: me.id, body });
    qc.invalidateQueries({ queryKey: ["messages", id] });
  }
  const other = req.data ? (req.data.citizen_id === me?.id ? req.data.provider?.full_name : req.data.citizen?.full_name) : "";
  return (
    <div className="mx-auto flex h-screen max-w-md flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link to="/request/$id" params={{ id }} className="rounded-full p-1 hover:bg-secondary" aria-label="Back"><ArrowLeft className="h-5 w-5 rtl:rotate-180" /></Link>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-accent font-bold text-accent-foreground">{(other ?? "?").charAt(0)}</div>
        <div className="font-bold">{other}</div>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.data?.map((m) => {
          const mine = m.sender_id === me?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${mine ? "rounded-ee-sm bg-primary text-primary-foreground" : "rounded-es-sm bg-card"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <div className="mt-0.5 text-right text-[10px] opacity-60">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("messagePh")} maxLength={2000} className="h-12 flex-1 rounded-full bg-card px-4 outline-none" />
        <button className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Send"><Send className="h-5 w-5" /></button>
      </form>
    </div>
  );
}

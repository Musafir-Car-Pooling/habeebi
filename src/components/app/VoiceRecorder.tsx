import { useEffect, useRef, useState } from "react";
import { Mic, Trash2, Square } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function VoiceRecorder({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [secs, setSecs] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const { t } = useT();
  const active = useRef(true);
  const holding = useRef(false);
  const startingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false; holding.current = false;
      if (timer.current) clearInterval(timer.current);
      const rec = recRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!value) { setUrl(null); return; }
    const u = URL.createObjectURL(value);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [value]);

  async function start() {
    if (startingRef.current || recRef.current?.state === "recording") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error(t("micUnavailable")); return;
    }
    startingRef.current = true; setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (!active.current || !holding.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
      const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        recRef.current = null; streamRef.current = null;
        if (!active.current) return;
        setRecording(false);
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size) onChangeRef.current(blob);
      };
      rec.onerror = () => { stop(); toast.error(t("micUnavailable")); };
      rec.start(250);
      recRef.current = rec;
      setSecs(0);
      setRecording(true);
      let elapsed = 0;
      timer.current = setInterval(() => {
        elapsed += 1; setSecs(elapsed);
        if (elapsed >= 120) stop();
      }, 1000);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (active.current) toast.error(t("micDenied"));
    } finally { startingRef.current = false; if (active.current) setStarting(false); }
  }
  function stop() {
    holding.current = false;
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    if (active.current) setRecording(false);
    if (timer.current) clearInterval(timer.current);
  }

  if (value && url) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-secondary p-2">
        <audio src={url} controls className="h-10 min-w-0 flex-1" preload="metadata" />
        <Button variant="ghost" size="icon" type="button" onClick={() => onChange(null)} className="shrink-0 rounded-full text-destructive" aria-label={t("deleteVoice")}>
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-secondary p-2 pl-4">
      <span className="flex-1 text-sm text-muted-foreground">
        {recording ? (
          <span className="flex items-center gap-2 text-destructive">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")} · {t("recording")}
          </span>
        ) : (
          starting ? t("wait") : t("holdRecord")
        )}
      </span>
      <Button
        type="button"
        onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); holding.current = true; void start(); }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); holding.current = true; void start(); } }}
        onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); stop(); } }}
        className="grid h-12 w-12 shrink-0 touch-none select-none place-items-center rounded-full bg-primary text-primary-foreground"
        aria-label={t("holdRecord")}
        aria-pressed={recording}
      >
        {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
    </div>
  );
}

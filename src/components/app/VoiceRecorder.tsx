import { useEffect, useRef, useState } from "react";
import { Mic, Trash2, Square } from "lucide-react";
import { toast } from "sonner";

export function VoiceRecorder({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) { setUrl(null); return; }
    const u = URL.createObjectURL(value);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [value]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        onChange(new Blob(chunks.current, { type: rec.mimeType || "audio/webm" }));
      };
      rec.start();
      recRef.current = rec;
      setSecs(0);
      setRecording(true);
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      toast.error("Microphone ki permission nahi mili");
    }
  }
  function stop() {
    recRef.current?.stop();
    setRecording(false);
    if (timer.current) clearInterval(timer.current);
  }

  if (value && url) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-secondary p-2">
        <audio src={url} controls className="h-10 flex-1" />
        <button type="button" onClick={() => onChange(null)} className="rounded-full p-2 text-destructive hover:bg-muted" aria-label="Delete voice note">
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-secondary p-2 pl-4">
      <span className="flex-1 text-sm text-muted-foreground">
        {recording ? (
          <span className="flex items-center gap-2 text-destructive">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            Recording… 0:{String(secs).padStart(2, "0")} — chhorein to save
          </span>
        ) : (
          "Hold to record voice note"
        )}
      </span>
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); start(); }}
        onPointerUp={stop}
        onPointerLeave={() => recording && stop()}
        className={`grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground transition ${recording ? "scale-125" : ""}`}
        aria-label="Hold to record"
      >
        {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
    </div>
  );
}

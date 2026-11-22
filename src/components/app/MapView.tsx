import { useState } from "react";
import { Map } from "lucide-react";
import { useT } from "@/lib/i18n";

export function MapView({ lat, lng, height = 160, autoLoad = false }: { lat: number; lng: number; height?: number; autoLoad?: boolean }) {
  const [show, setShow] = useState(autoLoad);
  const { t } = useT();
  if (!show) {
    return (
      <button type="button" onClick={() => setShow(true)} style={{ height: 56 }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-secondary text-sm font-semibold">
        <Map className="h-4 w-4 text-primary" /> {t("showMap")}
      </button>
    );
  }
  const d = 0.006;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
  return <iframe title="Location map" src={src} style={{ height }} className="w-full rounded-2xl border border-border" loading="lazy" />;
}

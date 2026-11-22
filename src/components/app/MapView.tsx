export function MapView({ lat, lng, height = 160 }: { lat: number; lng: number; height?: number }) {
  const d = 0.006;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <iframe
      title="Location map"
      src={src}
      style={{ height }}
      className="w-full rounded-2xl border border-border"
      loading="lazy"
    />
  );
}

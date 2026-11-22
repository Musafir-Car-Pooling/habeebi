import { useT } from "@/lib/i18n";

export function LoadingBubbles({ compact = false }: { compact?: boolean }) {
  const { t } = useT();
  return <div role="status" aria-label={t("loading")} className={compact ? "inline-flex items-center justify-center" : "flex min-h-40 items-center justify-center"}>
    <span className="loading-bubbles" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} />)}</span>
    <span className="sr-only">{t("loading")}</span>
  </div>;
}
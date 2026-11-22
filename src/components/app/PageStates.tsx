import { useRouter } from "@tanstack/react-router";
import { AppShell } from "./AppShell";
import { LoadingBubbles } from "./LoadingBubbles";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export function PageLoading() { return <AppShell><LoadingBubbles /></AppShell>; }
export function PageError() {
  const router = useRouter(); const { t } = useT();
  return <AppShell><div role="alert" className="space-y-4 py-8 text-center"><p>{t("error")}</p><Button onClick={() => router.invalidate()}>{t("retry")}</Button></div></AppShell>;
}
export function PageNotFound() { const { t } = useT(); return <AppShell><p>{t("unavailable")}</p></AppShell>; }
import logo from "@/assets/habeebi-logo.webp";
import { useT } from "@/lib/i18n";

export function Logo({ big = false }: { big?: boolean }) {
  const { t } = useT();
  const size = big ? 56 : 34;
  return (
    <div className="flex flex-row items-center gap-2 whitespace-nowrap">
      <img src={logo} alt="Habeebi logo" width={size} height={size} style={{ width: size, height: size }} />
      <div className="leading-tight">
        <div className={`font-extrabold tracking-tight ${big ? "text-3xl" : "text-lg"}`}>Habee<span className="text-primary">bi</span></div>
        {big && <div className="text-sm text-muted-foreground">{t("slogan")}</div>}
      </div>
    </div>
  );
}

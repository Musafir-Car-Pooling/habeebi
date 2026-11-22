import logo from "@/assets/habeebi-logo.png";
import { useT } from "@/lib/i18n";

export function Logo({ big = false }: { big?: boolean }) {
  const { t } = useT();
  const size = big ? 56 : 34;
  return (
    <div className="flex items-center gap-2">
      <img src={logo} alt="HaBeeBi logo" width={size} height={size} style={{ width: size, height: size }} />
      <div className="leading-tight">
        <div className={`font-extrabold tracking-tight ${big ? "text-3xl" : "text-lg"}`}>Ha<span className="text-primary">Bee</span>Bi</div>
        {big && <div className="text-sm text-muted-foreground">{t("slogan")}</div>}
      </div>
    </div>
  );
}

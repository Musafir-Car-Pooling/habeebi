import { useT } from "@/lib/i18n";

export function GenderSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useT();
  return <label className="block space-y-2 text-sm font-semibold">
    <span>{t("gender")}</span>
    <select aria-label={t("gender")} required value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-md border border-input bg-card px-3">
      <option value="" disabled>{t("selectGender")}</option>
      {(["male", "female", "other", "prefer_not_to_say"] as const).map((g) => <option key={g} value={g}>{t(g)}</option>)}
    </select>
  </label>;
}
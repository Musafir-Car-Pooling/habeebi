import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { UAE_CODE } from "@/lib/profile-validation";

export function MobileInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useT();
  return <div dir="ltr" className="flex items-center gap-2">
    <Input aria-label={t("countryCode")} value={UAE_CODE} readOnly className="h-12 w-20 shrink-0 bg-secondary text-center" />
    <Input aria-label={t("mobileNumber")} placeholder="50 123 4567" type="tel" inputMode="numeric" autoComplete="tel-national" pattern="5[024568][0-9]{7}" required maxLength={9} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 9))} className="h-12 min-w-0 flex-1" />
  </div>;
}
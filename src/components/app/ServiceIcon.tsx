import { Zap, Wrench, Sparkles, ChefHat, HardHat, Paintbrush, Hammer, Snowflake, Car, Baby, Leaf, Truck, Shirt, Bug, Laptop, Scissors, Briefcase, type LucideIcon } from "lucide-react";

const MAP: [RegExp, LucideIcon][] = [
  [/electric/i, Zap], [/plumb/i, Wrench], [/clean|maid/i, Sparkles], [/cook|chef|sheff/i, ChefHat],
  [/labou?r|construct|mason/i, HardHat], [/paint/i, Paintbrush], [/carpent|wood|furni/i, Hammer],
  [/ac\b|air|hvac|cool/i, Snowflake], [/driv|car|mechanic/i, Car], [/baby|nanny/i, Baby],
  [/garden/i, Leaf], [/mov|shift|deliver/i, Truck], [/laundr|iron/i, Shirt], [/pest/i, Bug],
  [/it\b|computer|tech/i, Laptop], [/salon|barber|hair|beauty/i, Scissors],
];

export function ServiceIcon({ name, size = "md" }: { name?: string | null | undefined; size?: "sm" | "md" }) {
  const Icon = MAP.find(([r]) => r.test(name ?? ""))?.[1] ?? Briefcase;
  const box = size === "sm" ? "h-9 w-9 rounded-xl" : "h-12 w-12 rounded-2xl";
  return (
    <span className={`grid shrink-0 place-items-center bg-primary text-primary-foreground shadow-sm ${box}`}>
      <Icon className={size === "sm" ? "h-5 w-5" : "h-6 w-6"} strokeWidth={2.2} />
    </span>
  );
}

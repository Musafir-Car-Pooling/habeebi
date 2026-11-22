import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          aria-label={`${i} star`}
          className={cn(!onChange && "cursor-default")}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(i <= Math.round(value) ? "fill-warning text-warning" : "text-muted-foreground/40")}
          />
        </button>
      ))}
    </div>
  );
}

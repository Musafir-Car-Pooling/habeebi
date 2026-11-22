export function Logo({ big = false }: { big?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`grid place-items-center rounded-xl bg-primary font-extrabold text-primary-foreground ${big ? "h-12 w-12 text-2xl" : "h-8 w-8 text-base"}`}>
        S
      </div>
      <div className="leading-tight">
        <div className={`font-extrabold tracking-tight ${big ? "text-3xl" : "text-lg"}`}>serviyo</div>
        {big && <div className="text-sm text-muted-foreground">an ultimate service provider</div>}
      </div>
    </div>
  );
}

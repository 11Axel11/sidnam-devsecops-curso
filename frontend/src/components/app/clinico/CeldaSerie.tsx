import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Celda de una serie histórica: los registros anulados (solo visibles con «Mostrar anulados») se atenúan.
export default function CeldaSerie({ anulado, children, className }: { anulado: boolean; children: ReactNode; className?: string }) {
  return <span className={cn("whitespace-nowrap", anulado && "text-muted-foreground", className)}>{children}</span>;
}

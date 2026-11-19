import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { idCampo } from "./idCampo";

type Props = {
  /** Nombre del campo del DTO; el control interno debe usar id={`campo-${nombre}`}. */
  nombre: string;
  etiqueta: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

export default function CampoValoracion({ nombre, etiqueta, error, className, children }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={idCampo(nombre)}>{etiqueta}</Label>
      {children}
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}

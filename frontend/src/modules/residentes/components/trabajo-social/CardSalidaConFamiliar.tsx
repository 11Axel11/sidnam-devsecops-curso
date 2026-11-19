import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, User } from "lucide-react";
import type { GetSalidasOngoingDto } from "../../models/enfermeria";

export interface CardSalidaFamiliarProps {
  salida: GetSalidasOngoingDto;
  title?: string;
}

const CardSalidaFamiliar = ({ salida, title = "Salida programada" }: CardSalidaFamiliarProps) => {
  const [open, setOpen] = useState(false);
  const familiarCompleto = [salida.nombre_familiar, salida.apellido1_familiar, salida.apellido2_familiar]
    .filter(Boolean)
    .join(" ");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="lg:w-135 h-60 cursor-pointer overflow-hidden border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-lg flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base leading-snug break-words">{title}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground break-words overflow-hidden">
              <strong className="font-semibold text-foreground">Familiar:</strong> {familiarCompleto} ({salida.parentesco})
            </CardDescription>
          </CardHeader>

          <CardContent className="relative flex-1 flex flex-col gap-2 overflow-hidden break-words text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              <span>
                <strong>Salida:</strong> {salida.fecha_salida} a las {salida.hora_salida}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                <strong>Regreso:</strong> {salida.fecha_regreso} a las {salida.hora_regreso}
              </span>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="w-full sm:max-w-lg md:max-w-xl p-7 rounded-2xl border-border/60 bg-background">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl break-words">Detalles de la salida familiar</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-start gap-3 pb-4 border-b border-border/50">
            <div className="bg-primary/10 p-3 rounded-full shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="text-sm text-muted-foreground font-medium">A cargo de</h4>
              <p className="text-base font-semibold text-foreground">{familiarCompleto}</p>
              <p className="text-sm text-muted-foreground capitalize">Parentesco: {salida.parentesco}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-sm text-gray-800">Fecha y Hora de Salida:</h4>
              <div className="rounded-md border border-border bg-background p-3 shadow-sm">
                <p className="text-sm font-medium">{salida.fecha_salida}</p>
                <p className="text-sm text-muted-foreground">{salida.hora_salida}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-sm text-gray-800">Fecha y Hora de Regreso:</h4>
              <div className="rounded-md border border-border bg-background p-3 shadow-sm">
                <p className="text-sm font-medium">{salida.fecha_regreso}</p>
                <p className="text-sm text-muted-foreground">{salida.hora_regreso}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-end">
          <DialogClose asChild>
            <Button variant="outline">Cerrar detalles</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CardSalidaFamiliar;
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter as DialogFooterComp } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CardBitacoraProps } from "../../types/enfermeriaProps";
import { renderRichText } from "../../utils/richText";

const CardBitacora = ({ entry }: CardBitacoraProps) => {
  const [open, setOpen] = useState(false);

  const titulo = (entry?.titulo ?? "").trim() || "(Sin título)";
  
  // Maneja diferentes tipos de fechas según el tipo de bitácora
  const fecha = 
    entry?.fecha ?? 
    entry?.fecha_curacion ?? 
    entry?.fecha_consulta ?? 
    entry?.fechaActividad ??
    "—";
  
  // Maneja diferentes tipos de contenido según el tipo de bitácora
  const contenido = 
    entry?.nota ?? 
    entry?.descripcion ?? 
    entry?.descripcionCompleta ?? 
    "";
  
  const nota = typeof contenido === "string" ? contenido : (contenido ?? "");
  const notaRenderizada = renderRichText(nota);

  const tipoLabelMap: Record<string, string> = {
    bitacora: "Bitácora de enfermería",
    nota: "Nota de enfermería",
    curacion: "Curación",
    consulta_especialista: "Consulta especialista",
    consulta_ebais: "Consulta EBAIS",
    libro_de_campo: "Libro de campo",
  };

  const tipoNota = typeof entry?.tipo === "string" ? entry.tipo : "nota";
  const tipoNotaLabel = tipoLabelMap[tipoNota] ?? "Registro de enfermería";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="lg:w-135 cursor-pointer overflow-hidden border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-lg flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base leading-snug break-words">{titulo}</CardTitle>
          </CardHeader>
          <CardContent className="relative flex-1 overflow-hidden break-words">
            {nota ? (
              <div
                className="max-h-28 text-justify overflow-hidden text-sm leading-relaxed text-muted-foreground prose prose-sm max-w-none prose-strong:font-semibold prose-em:italic prose-u:underline"
                dangerouslySetInnerHTML={{ __html: notaRenderizada }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Sin contenido.</p>
            )}
          </CardContent>
          <CardFooter className="mt-auto border-t border-border/60 pt-4 text-xs font-medium tracking-wide text-muted-foreground break-all">
            {fecha}
          </CardFooter>
        </Card>
      </DialogTrigger>

      <DialogContent className="w-[95vw] max-w-3xl mx-auto h-[85vh] overflow-hidden rounded-2xl border-border/70 bg-background p-0 shadow-2xl">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="space-y-3 border-b border-border/60 bg-muted/25 px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold text-muted-foreground">{tipoNotaLabel}</p>
            </div>
            <DialogTitle className="text-lg leading-snug break-all">{titulo}</DialogTitle>
            <CardDescription>
              <p className="text-xs tracking-wide break-all">Fecha del registro: {fecha}</p>
            </CardDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 text-justify break-words scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent">
            <section className="">
              <div
                className="prose prose-sm max-w-none text-foreground leading-relaxed prose-p:my-3 prose-li:my-1 prose-strong:font-semibold prose-em:italic prose-u:underline"
                dangerouslySetInnerHTML={{ __html: notaRenderizada }}
              />
            </section>
          </div>

          <DialogFooterComp className="border-t border-border/60 bg-muted/20 px-6 py-4">
            <DialogClose asChild>
              <Button variant="outline" className="min-w-24">
                Cerrar
              </Button>
            </DialogClose>
          </DialogFooterComp>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CardBitacora;

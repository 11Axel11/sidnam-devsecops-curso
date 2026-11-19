import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getReporteSemestralPdf } from "../services/reporteSemestralServices";
import {
  descargarBlob, mensajeErrorReporte, mensajeSiNoEsPdf, nombreArchivoReporte, semestreActual,
} from "../utils/reporteSemestral";

type Props = { onClose: () => void };

const ANIO_MIN = 2020;
const ANIO_MAX = 2100;

// Reporte semestral de Terapia Física (RF-TF-12): arma los parámetros y descarga el PDF que genera el backend.
// Nada se guarda. El nombre de la profesional NO se precarga con la sesión: se escribe con su título y viaja tal cual.
// El padre lo monta solo mientras está abierto.
export default function ReporteSemestralDialogo({ onClose }: Props) {
  const [inicial] = useState(semestreActual);
  const [anio, setAnio] = useState(String(inicial.anio));
  const [semestre, setSemestre] = useState<"1" | "2">(String(inicial.semestre) as "1" | "2");
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anioNum = Number(anio);
  const anioValido = Number.isInteger(anioNum) && anioNum >= ANIO_MIN && anioNum <= ANIO_MAX;

  const generar = async () => {
    if (generando) return;
    if (!anioValido) {
      setError(`El año debe estar entre ${ANIO_MIN} y ${ANIO_MAX}.`);
      return;
    }
    setError(null);
    setGenerando(true);
    try {
      const blob = await getReporteSemestralPdf({
        anio: anioNum,
        semestre: Number(semestre) as 1 | 2,
        profesionalNombre: nombre.trim() || undefined,
        profesionalCodigo: codigo.trim() || undefined,
      });
      const noPdf = await mensajeSiNoEsPdf(blob);
      if (noPdf) {
        setError(noPdf);
        return;
      }
      descargarBlob(blob, nombreArchivoReporte(anioNum, Number(semestre)));
      toast.success("Reporte generado", { description: nombreArchivoReporte(anioNum, Number(semestre)) });
      onClose();
    } catch (err) {
      setError(await mensajeErrorReporte(err));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(abierto) => { if (!abierto && !generando) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generar reporte semestral</DialogTitle>
          <DialogDescription>
            PDF con los residentes evaluados en el semestre. No se guarda nada: se genera y se descarga.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 text-left"
          noValidate
          onSubmit={(e) => { e.preventDefault(); void generar(); }}
        >
          {error && (
            <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="reporte-anio">Año *</Label>
              <Input
                id="reporte-anio" type="number" inputMode="numeric" min={ANIO_MIN} max={ANIO_MAX}
                value={anio} onChange={(e) => setAnio(e.target.value)} disabled={generando}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reporte-semestre">Semestre *</Label>
              <Select value={semestre} onValueChange={(v) => setSemestre(v as "1" | "2")} disabled={generando}>
                <SelectTrigger id="reporte-semestre" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">I (enero–junio)</SelectItem>
                  <SelectItem value="2">II (julio–diciembre)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reporte-nombre">Nombre de la profesional</Label>
            <Input
              id="reporte-nombre" maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)}
              disabled={generando} autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">Opcional. Se imprime tal cual, con su título: por ejemplo «Dra. Mariela Vargas».</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reporte-codigo">Código de colegiada</Label>
            <Input
              id="reporte-codigo" maxLength={30} value={codigo} onChange={(e) => setCodigo(e.target.value)}
              disabled={generando} autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">Opcional.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={generando}>Cancelar</Button>
            <Button type="submit" variant="create" disabled={generando}>
              {generando ? "Generando PDF… puede tardar" : "Generar PDF"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

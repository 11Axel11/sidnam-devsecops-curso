import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReporteSemestralDialogo from "./ReporteSemestralDialogo";

// Botón «Generar reporte semestral» (RF-TF-12). Quien lo coloca lo envuelve en `IfPerm` con `TerapiaFisica:Ver`.
export default function BotonReporteSemestral() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <FileText /> Generar reporte semestral
      </Button>
      {abierto && <ReporteSemestralDialogo onClose={() => setAbierto(false)} />}
    </>
  );
}

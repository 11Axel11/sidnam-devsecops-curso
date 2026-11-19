import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import TextareaAutoexpandible from "@/components/app/TextareaAutoexpandible";
import { clasificarErrorEnvio } from "@/components/app/clinico/clasificarErrorEnvio";
import CampoValoracion from "@/components/app/clinico/CampoValoracion";
import DialogoRegistro from "@/components/app/clinico/DialogoRegistro";
import { useExpedienteActivo } from "@/components/app/clinico/useExpedienteActivo";
import { idCampo } from "@/components/app/clinico/idCampo";
import { MENSAJE_RED, toastRedCaida } from "@/components/app/clinico/mensajesRed";
import CalendarField from "@/components/CalendarField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { controlNutricionalKeys, useCrearControlNutricional } from "../hooks/controlNutricionalHooks";
import { controlNutricionalSchema } from "../schemas/controlNutricionalSchema";
import {
  construirPayloadCrear, formatearMedida, valoresIniciales, type ValoresControlNutricional,
} from "../utils/controlNutricionalForm";
import { CAMPOS_CONTROL_NUTRICIONAL, traducirFormatoControl } from "../utils/errores";

type Props = {
  expedienteId: number;
  onClose: () => void;
};

type Campo = (typeof CAMPOS_CONTROL_NUTRICIONAL)[number];

type CampoMedidaProps = {
  nombre: Exclude<Campo, "fecha" | "interpretacion">;
  etiqueta: string;
  ejemplo: string;
  valores: ValoresControlNutricional;
  errores: Partial<Record<Campo, string>>;
  cambiar: (parche: Partial<ValoresControlNutricional>, campo: Campo) => void;
};

function CampoMedida({ nombre, etiqueta, ejemplo, valores, errores, cambiar }: CampoMedidaProps) {
  return (
    <CampoValoracion nombre={nombre} etiqueta={etiqueta} error={errores[nombre]}>
      <Input
        id={idCampo(nombre)}
        inputMode="decimal"
        autoComplete="off"
        placeholder={ejemplo}
        value={valores[nombre]}
        aria-invalid={!!errores[nombre]}
        onChange={(e) => cambiar({ [nombre]: e.target.value } as Partial<ValoresControlNutricional>, nombre)}
      />
    </CampoValoracion>
  );
}

// Un control no se edita: este diálogo solo registra uno nuevo. El IMC y la edad al control los
// calcula el backend; aquí no se calculan, no se previsualizan y no se envían.
// El padre lo monta solo mientras está abierto, así cada apertura arranca con su estado.
export default function ControlNutricionalDialogo({ expedienteId, onClose }: Props) {
  const qc = useQueryClient();
  const crear = useCrearControlNutricional();
  const { refrescar: refrescarExpediente } = useExpedienteActivo(expedienteId);

  const [valores, setValores] = useState<ValoresControlNutricional>(valoresIniciales);
  // Estado con el que abrió el formulario: sirve para saber si hay cambios sin guardar.
  const [inicial] = useState<ValoresControlNutricional>(valores);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [erroresServidor, setErroresServidor] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  const sinGuardar = JSON.stringify(valores) !== JSON.stringify(inicial);
  const guardando = crear.isPending;

  const cambiar = (parche: Partial<ValoresControlNutricional>, campo: Campo) => {
    setValores((v) => ({ ...v, ...parche }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setErroresServidor([]);
    setAviso(null);
  };

  const manejarError = (err: unknown) => {
    const e = clasificarErrorEnvio(err, {
      campos: CAMPOS_CONTROL_NUTRICIONAL,
      traducir: traducirFormatoControl,
      fallback: "No se pudo registrar el control.",
      noExiste: "El expediente ya no existe.",
      conflicto: "No se pudo registrar el control.",
    });
    switch (e.tipo) {
      case "errores":
        setErroresServidor(e.lista);
        break;
      case "campos":
        setErrores((prev) => ({ ...prev, ...(e.campos as Partial<Record<Campo, string>>) }));
        if (e.otros.length) setErroresServidor(e.otros);
        break;
      case "no-existe":
        setAviso(e.mensaje);
        qc.invalidateQueries({ queryKey: controlNutricionalKeys.raiz });
        break;
      // 409: el expediente no tiene la fecha de nacimiento del residente (no se puede calcular la edad).
      // 409 `EXPEDIENTE_INACTIVO`: lo cerraron con el formulario abierto. Se avisa, se refresca el estado y
      // lo escrito se conserva.
      case "expediente-inactivo":
        setAviso(e.mensaje);
        refrescarExpediente();
        toast.warning("Expediente inactivo", { description: "Tus cambios siguen en el formulario." });
        break;
      case "conflicto":
      case "otro":
        setAviso(e.mensaje);
        break;
      // Sin respuesta del servidor = problema de conexión: el diálogo sigue abierto con lo escrito.
      case "red":
        setAviso(MENSAJE_RED);
        toastRedCaida();
        break;
    }
  };

  // Devuelve `true` si se guardó: el armazón cierra el diálogo y apaga el aviso de salida.
  const guardar = async (): Promise<boolean> => {
    setErroresServidor([]);
    setAviso(null);

    const parsed = controlNutricionalSchema.safeParse(valores);
    if (!parsed.success) {
      const campos: Partial<Record<Campo, string>> = {};
      for (const issue of parsed.error.issues) {
        const campo = issue.path[0] as Campo;
        if (!campos[campo]) campos[campo] = issue.message;
      }
      setErrores(campos);
      const primero = CAMPOS_CONTROL_NUTRICIONAL.find((c) => campos[c]);
      if (primero) document.getElementById(idCampo(primero))?.focus();
      return false;
    }
    setErrores({});

    try {
      const control = await crear.mutateAsync({ expedienteId, body: construirPayloadCrear(valores) });
      // IMC y edad son los del backend (se almacenan con el control y no se recalculan).
      toast.success("Control registrado", {
        description: `IMC ${formatearMedida(control.imc)} kg/m² · Edad al control: ${control.edadMomentoControl} años`,
        duration: 6000,
      });
      return true;
    } catch (err) {
      manejarError(err);
      return false;
    }
  };

  return (
    <DialogoRegistro
      expedienteId={expedienteId}
      titulo="Nuevo control nutricional"
      descripcion="Un control guardado no se puede editar: si hay un error, se anula con motivo y se registra uno nuevo. El IMC y la edad al control los calcula el sistema al guardar."
      textoGuardar="Registrar control"
      perdida="los datos de este control"
      sinGuardar={sinGuardar}
      guardando={guardando}
      aviso={aviso}
      erroresServidor={erroresServidor}
      onGuardar={guardar}
      onClose={onClose}
    >
      <div id={idCampo("fecha")} tabIndex={-1} className="space-y-2 outline-none">
        <Label>Fecha</Label>
        <CalendarField
          className="w-full max-w-[240px]"
          disableFuture
          value={valores.fecha}
          onChange={(iso) => cambiar({ fecha: iso }, "fecha")}
        />
        {errores.fecha && <p className="text-sm text-red-700" role="alert">{errores.fecha}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoMedida nombre="peso" etiqueta="Peso (kg) *" ejemplo="Ej. 58,4" valores={valores} errores={errores} cambiar={cambiar} />
        <CampoMedida nombre="talla" etiqueta="Talla (cm) *" ejemplo="Ej. 152 (en centímetros)" valores={valores} errores={errores} cambiar={cambiar} />
        <CampoMedida nombre="circunferenciaBraquial" etiqueta="Circunferencia braquial (cm)" ejemplo="Ej. 27,5" valores={valores} errores={errores} cambiar={cambiar} />
        <CampoMedida nombre="circunferenciaPantorrilla" etiqueta="Circunferencia de la pantorrilla (cm)" ejemplo="Ej. 32" valores={valores} errores={errores} cambiar={cambiar} />
        <CampoMedida nombre="alturaRodilla" etiqueta="Altura de la rodilla (cm)" ejemplo="Ej. 47,5" valores={valores} errores={errores} cambiar={cambiar} />
        <CampoMedida nombre="fuerzaMuscular" etiqueta="Fuerza muscular (kgf)" ejemplo="Ej. 18,5" valores={valores} errores={errores} cambiar={cambiar} />
      </div>
      <p className="text-xs text-muted-foreground">* Obligatorio. Se admite hasta 1 decimal (coma o punto).</p>

      <CampoValoracion nombre="interpretacion" etiqueta="Interpretación" error={errores.interpretacion}>
        <TextareaAutoexpandible
          id={idCampo("interpretacion")}
          value={valores.interpretacion}
          maxLength={20000}
          mostrarContador
          placeholder="La registra la persona profesional (el sistema no la sugiere)"
          aria-invalid={!!errores.interpretacion}
          onChange={(e) => cambiar({ interpretacion: e.target.value }, "interpretacion")}
        />
      </CampoValoracion>
    </DialogoRegistro>
  );
}

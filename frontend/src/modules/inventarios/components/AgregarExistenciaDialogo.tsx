import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetUnidadesMedida } from "@/hooks/use-unidadesMedida";
import { nombreSede } from "@/lib/sede";
import type { Sede } from "@/store/sedeStore";
import { agregarProductoSchema } from "../schemas/schemaInventarios";
import { useGetSubCategorias } from "../hooks/inventarioHooks";
import { usePostExistencia } from "../hooks/existenciaHooks";
import { getProductosCatalogo } from "../services/existenciaService";
import type { ProductoCatalogo } from "../models/existencia";
import { dataDe, mensajeError, statusDe } from "@/utils/apiError";

type Conflicto =
  | { tipo: 'catalogo'; producto: ProductoCatalogo }
  | { tipo: 'existencia'; inventarioExistenteId?: number; message: string };

type Props = { sede: Sede; categoryId: number };

export default function AgregarExistenciaDialogo({ sede, categoryId }: Props) {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [conflicto, setConflicto] = useState<Conflicto | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const crear = usePostExistencia();
  const { data: unidades } = useGetUnidadesMedida(1);
  const { subcategorias } = useGetSubCategorias();
  const esAlimentos = categoryId === 1;

  const cerrar = (v: boolean) => {
    setOpen(v);
    if (!v) { setConflicto(null); setFormErrors({}); form.reset(); }
  };

  const manejarError = (err: unknown) => {
    const status = statusDe(err);
    if (status === 409) {
      const d = dataDe<{ message?: string; inventarioExistenteId?: number }>(err);
      setConflicto({
        tipo: 'existencia',
        inventarioExistenteId: d?.inventarioExistenteId,
        message: d?.message ?? 'Este producto ya existe en la sede.',
      });
    } else if (status === 403) {
      toast.warning('Acceso denegado', { description: mensajeError(err, 'No tienes permisos para esta acción.') });
    } else {
      setFormErrors({ server: mensajeError(err, 'Error en el servidor, por favor intenta más tarde') });
    }
  };

  const habilitar = async (producto: ProductoCatalogo) => {
    try {
      const unidad = form.getFieldValue('unidadMedida');
      await crear.mutateAsync({
        productoId: producto.id,
        sede,
        ...(unidad > 0 ? { unidadMedidaId: unidad } : {}),
      });
      toast.success(`"${producto.nombre}" habilitado en ${nombreSede[sede]}`);
      cerrar(false);
    } catch (err) {
      manejarError(err);
    }
  };

  const form = useForm({
    defaultValues: { nombre: "", codigo: "", unidadMedida: 0, subcategoriaId: 1, imagen_url: "" },
    onSubmit: async ({ value }) => {
      setFormErrors({});
      setConflicto(null);

      const codigo = value.codigo.trim().toUpperCase();
      if (codigo) {
        try {
          const catalogo = await qc.fetchQuery({
            queryKey: ['productosCatalogo'],
            queryFn: getProductosCatalogo,
            staleTime: 0,
          });
          const existente = catalogo.find((p) => p.codigo.toUpperCase() === codigo);
          if (existente && !existente.sedes.includes(sede)) {
            setConflicto({ tipo: 'catalogo', producto: existente });
            return;
          }
        } catch {
          // si la consulta del catálogo falla, el backend decide en el POST
        }
      }

      const result = agregarProductoSchema.safeParse({ ...value, categoriaId: categoryId });
      if (!result.success) {
        const fe: Record<string, string> = {};
        result.error.issues.forEach((i) => { fe[String(i.path[0])] = i.message; });
        setFormErrors(fe);
        return;
      }

      try {
        const resp = await crear.mutateAsync({
          sede,
          unidadMedidaId: value.unidadMedida,
          producto: {
            nombre: value.nombre.trim(),
            codigo: value.codigo.trim(),
            categoriaId: categoryId,
            ...(esAlimentos
              ? { subcategoriaId: value.subcategoriaId || undefined, imagen_url: value.imagen_url || undefined }
              : {}),
          },
        });
        if (resp.productoCreado === false && resp.producto && resp.producto.nombre !== value.nombre.trim()) {
          toast.info(`Ya existía en el catálogo como «${resp.producto.nombre}»; se agregó a ${nombreSede[sede]}.`);
        } else {
          toast.success('Producto agregado exitosamente', { description: 'Puedes visualizarlo en el inventario' });
        }
        cerrar(false);
      } catch (err) {
        manejarError(err);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogTrigger asChild>
        <Button variant="create"><Plus /> Agregar producto</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar producto</DialogTitle>
          <DialogDescription>
            Ingresa los datos del producto para agregarlo a {nombreSede[sede]}.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
          className="space-y-4 text-left text-black"
        >
          <form.Field name="codigo" children={(field) => (
            <div>
              <Label className="font-semibold" htmlFor="codigo">Código:</Label>
              <Input
                id="codigo" className="mt-1" value={field.state.value} maxLength={6} placeholder="Ejemplo: ARZ001"
                onChange={(e) => { setConflicto(null); field.handleChange(e.target.value); }}
              />
              {formErrors.codigo && <p className="text-red-700 text-sm">{formErrors.codigo}</p>}
            </div>
          )} />

          <form.Field name="nombre" children={(field) => (
            <div>
              <Label className="font-semibold" htmlFor="nombre">Nombre:</Label>
              <Input
                id="nombre" className="mt-1" value={field.state.value} maxLength={50} placeholder="Ejemplo: Arroz"
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {formErrors.nombre && <p className="text-red-700 text-sm">{formErrors.nombre}</p>}
            </div>
          )} />

          <form.Field name="unidadMedida" children={(field) => (
            <div>
              <Label className="font-semibold">Unidad de medida en {nombreSede[sede]}:</Label>
              <Select
                value={field.state.value ? String(field.state.value) : ''}
                onValueChange={(v) => field.handleChange(Number(v))}
              >
                <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccione una unidad de medida" /></SelectTrigger>
                <SelectContent>
                  {(unidades ?? []).map((u) => (
                    <SelectItem key={u.id_unidad} value={u.id_unidad.toString()}>{u.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.unidadMedida && <p className="text-red-700 text-sm">{formErrors.unidadMedida}</p>}
            </div>
          )} />

          {esAlimentos && (
            <>
              <form.Field name="subcategoriaId" children={(field) => (
                <div>
                  <Label className="font-semibold">Subcategoría:</Label>
                  <Select value={String(field.state.value)} onValueChange={(v) => field.handleChange(Number(v))}>
                    <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccione una subcategoría" /></SelectTrigger>
                    <SelectContent>
                      {(subcategorias ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.subcategoriaId && <p className="text-red-700 text-sm">{formErrors.subcategoriaId}</p>}
                </div>
              )} />
              <form.Field name="imagen_url" children={(field) => (
                <div>
                  <Label className="font-semibold" htmlFor="imagen_url">URL de la imagen:</Label>
                  <Input
                    id="imagen_url" type="url" className="mt-1" value={field.state.value}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {formErrors.imagen_url && <p className="text-red-700 text-sm">{formErrors.imagen_url}</p>}
                </div>
              )} />
            </>
          )}

          {conflicto?.tipo === 'catalogo' && (
            <div className="rounded-md bg-amber-50 p-4 text-amber-900" role="alert">
              <p className="font-semibold text-sm">Este código ya existe en el catálogo</p>
              <p className="text-xs mt-1">
                "{conflicto.producto.nombre}" ya está registrado en el sistema. No se creará un producto duplicado.
              </p>
              <Button
                type="button" variant="create" size="sm" className="mt-3" disabled={crear.isPending}
                onClick={() => habilitar(conflicto.producto)}
              >
                Habilitar en {nombreSede[sede]}
              </Button>
            </div>
          )}

          {conflicto?.tipo === 'existencia' && (
            <div className="rounded-md bg-amber-50 p-4 text-amber-900" role="alert">
              <p className="font-semibold text-sm">Este producto ya existe en {nombreSede[sede]}</p>
              <p className="text-xs mt-1">{conflicto.message} No se creará un producto duplicado.</p>
              {conflicto.inventarioExistenteId && (
                <Button
                  type="button" variant="create" size="sm" className="mt-3"
                  onClick={() => {
                    cerrar(false);
                    navigate({
                      to: '/inventarios/$categoryId/entradas',
                      params: { categoryId: String(categoryId) },
                      search: { sede, inventarioId: conflicto.inventarioExistenteId } as never,
                    });
                  }}
                >
                  Ir a registrar una entrada
                </Button>
              )}
            </div>
          )}

          {formErrors.server && <p className="text-red-700 text-sm text-center">{formErrors.server}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => cerrar(false)}>Cancelar</Button>
            {!conflicto && (
              <Button type="submit" variant="create" disabled={crear.isPending}>
                {crear.isPending ? 'Agregando…' : 'Agregar'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

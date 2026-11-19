import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from "@/components/ui/table";
import { useGetPermisos, useGetAcciones, useCreatePermisosRol } from "../hooks/rolesHooks";
import type { Permiso } from "../models/roles";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/animate-ui/radix/accordion";
import { useConfirmacion } from "@/hooks/useConfirmar";

type Props = {
  rolId: number;
  rolNombre?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

type SelectionState = Record<number, Set<number>>; 

export default function FormAsignarPermisosSimple({
  rolId, rolNombre, onSuccess, onCancel,
}: Props) {
  const { Permisos, loadingPermisos, errorPermisos } = useGetPermisos();
  const { Acciones, loadingAcciones, errorAcciones } = useGetAcciones();
  const create = useCreatePermisosRol();
  const confirmar = useConfirmacion();

  const [selected, setSelected] = useState<SelectionState>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isLoading = loadingPermisos || loadingAcciones;
  
  const handleCancelar = async () => {
        if (totalPairs > 0) {
            const ok = await confirmar(
                <>
                    Tienes <strong>{totalPairs}</strong> acciones seleccionadas.<br />
                    ¿Deseas <strong>crear el rol sin permisos</strong> y descartar lo seleccionado?
                </>,
                "destructive"
            );
            if (!ok) return;
        } else {
            const ok = await confirmar(
                <>
                    El rol se creará <strong>sin permisos</strong>.<br />
                    Podrás asignarlos más tarde desde la gestión de roles.
                </>,
                "destructive"
            );
            if (!ok) return;
        }
        onSuccess?.();
   };

  const accionesOrdenadas = useMemo(() => {
    if (!Acciones) return [];
    const order = ["Ver", "Crear", "Actualizar", "Eliminar"];
    const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    return [...Acciones].sort((a, b) =>
      order.indexOf(order.find(o => normalize(o) === normalize(a.accion)) ?? "unknown") -
      order.indexOf(order.find(o => normalize(o) === normalize(b.accion)) ?? "unknown")
    );
  }, [Acciones]);
  const verId = useMemo(() => {
    const a = Acciones?.find(x => x.accion.toLowerCase().startsWith("ver"));
    return a?.id ?? 1; 
  }, [Acciones]);

  const grouped = useMemo(() => {
    const map = new Map<string, Permiso[]>();
    (Permisos ?? []).forEach(p => {
      if (!map.has(p.modulo)) map.set(p.modulo, []);
      map.get(p.modulo)!.push(p);
    });
    for (const [m, arr] of map.entries()) {
      arr.sort((a, b) => a.seccion.localeCompare(b.seccion));
      map.set(m, arr);
    }
    return map;
  }, [Permisos]);

  const isChecked = (permisoId: number, accionId: number) =>
    selected[permisoId]?.has(accionId) ?? false;

  const setChecked = (permisoId: number, accionId: number, checked: boolean) => {
    setSelected(prev => {
      const next: SelectionState = { ...prev };
      const set = new Set(next[permisoId] ?? []);
      if (checked) {
        set.add(accionId);
        if (accionId !== verId) set.add(verId);
      } else {
        set.delete(accionId);
        if (accionId === verId) {
          for (const a of (Acciones ?? [])) set.delete(a.id);
        }
      }
      next[permisoId] = set;
      return next;
    });
  };

  const toggleRowAll = (permisoId: number, allActionIds: number[], checked: boolean) => {
    setSelected(prev => {
      const next = { ...prev };
      next[permisoId] = new Set(checked ? allActionIds : []);
      if (checked && !next[permisoId].has(verId)) next[permisoId].add(verId);
      return next;
    });
  };

  const moduleSelect = (permisoIds: number[], allActionIds: number[], checked: boolean) => {
    setSelected(prev => {
      const next = { ...prev };
      for (const pid of permisoIds) {
        next[pid] = new Set(checked ? allActionIds : []);
        if (checked && !next[pid].has(verId)) next[pid].add(verId);
      }
      return next;
    });
  };

  const totalPairs = useMemo(
    () => Object.values(selected).reduce((sum, set) => sum + set.size, 0),
    [selected]
  );
  
  const handleSave = async () => {
    if (!Acciones || totalPairs === 0) return;
    setSaving(true);
    setServerError(null);
    try {
      const calls: Promise<unknown>[] = [];
      for (const [permisoIdStr, setAcc] of Object.entries(selected)) {
        const permisoId = Number(permisoIdStr);
        for (const accionId of setAcc) {
          calls.push(create.mutateAsync({ rolId, permisoId, accionId }));
        }
      }
      const res = await Promise.allSettled(calls);
      const failed = res.filter(r => r.status === "rejected").length;
      if (failed) setServerError(`Algunas asignaciones fallaron (${failed}).`);
      else {
        setSelected({});
        onSuccess?.();
      }
    } finally {
      setSaving(false);
    }
  };

  if (errorPermisos || errorAcciones) {
    return (
      <div className="p-4">
        <p className="text-red-600">Error al cargar catálogos.</p>
        <div className="mt-2 flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cerrar</Button>
        </div>
      </div>
    );
  }

  return (
      <div className="max-w-5xl h-[80vh] flex flex-col">
          <div className="pt-4 pb-2">
              <h2 className="text-lg font-semibold">
                  Asignar permisos al rol {rolNombre ? `${rolNombre}` : ""}
              </h2>
              <p className="text-sm text-muted-foreground">
                  Selecciona las acciones por sección. 
                  Usa "Ver todo / Todo / Limpiar" para atajos.
              </p>
          </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-10">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando permisos y acciones...
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-3
            scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent">
          <Accordion type="multiple" defaultValue={[...grouped.keys()]}>
            {[...grouped.entries()].map(([modulo, permisosDelModulo]) => {
              const permisoIds = permisosDelModulo.map(p => p.id_permiso);
              const allActionIds = (accionesOrdenadas ?? []).map(a => a.id);
              return (
                <AccordionItem key={modulo} value={modulo}>
                  <AccordionTrigger className="text-base font-medium hover:cursor-pointer">
                    {modulo}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex gap-2 mb-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => moduleSelect(permisoIds, [verId], true)}
                      >
                        Ver todo
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => moduleSelect(permisoIds, allActionIds, true)}
                      >
                        Todo
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moduleSelect(permisoIds, [], false)}
                      >
                        Limpiar
                      </Button>
                    </div>

                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="w-[45%]">Sección</TableHead>
                            {accionesOrdenadas.map((a) => (
                              <TableHead key={a.id} className="text-center">{a.accion}</TableHead>
                            ))}
                            <TableHead className="text-center">Todo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {permisosDelModulo.map((perm) => {
                            const rowAllChecked = accionesOrdenadas.every(a => isChecked(perm.id_permiso, a.id));
                            return (
                              <TableRow key={perm.id_permiso} className="align-middle">
                                <TableCell className="text-sm">{perm.seccion}</TableCell>

                                {accionesOrdenadas.map((a) => (
                                  <TableCell key={a.id} className="text-center">
                                    <Checkbox
                                      checked={isChecked(perm.id_permiso, a.id)}
                                      onCheckedChange={(v) => setChecked(perm.id_permiso, a.id, Boolean(v))}
                                    />
                                  </TableCell>
                                ))}

                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={rowAllChecked}
                                    onCheckedChange={(v) =>
                                      toggleRowAll(perm.id_permiso, allActionIds, Boolean(v))
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {serverError && <p className="text-red-600 text-sm mt-3">{serverError}</p>}
        </div>
      )}
          <div className="border-t bg-background/60 backdrop-blur-md px-4 py-3 flex items-center justify-end gap-2">
              <div className="mr-auto text-sm text-muted-foreground">
                  Seleccionadas: <span className="font-medium">{totalPairs}</span> acciones
              </div>
              <Button variant="outline" onClick={() => setSelected({})} disabled={saving || totalPairs === 0}>
                  Limpiar todo
              </Button>
              <Button variant="approve" onClick={handleSave} disabled={saving || totalPairs === 0}>
                  {saving ? (<> <Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando... </>) : "Guardar"}
              </Button>
              <Button
                  variant="secondary"
                  onClick={handleCancelar}
                  disabled={saving}
              >
                  Cancelar
              </Button>
          </div>
      </div>
  );
}

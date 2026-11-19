/* eslint-disable @typescript-eslint/no-explicit-any */
import IfPerm from '@/components/auth/IfPerm';
import WebLoader from '@/components/Loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { capitalize } from '@/lib/pathNameMap';
import ActionChip from '@/modules/gestionPermisos/roles/components/ActionChip';
import EditableActionChip from '@/modules/gestionPermisos/roles/components/EditableActionChip';
import FormEditarRol from '@/modules/gestionPermisos/roles/components/FormEditarRol';
import { useActivarRol, useDesactivarRol, useGetPermisosDeRol, useGetPermisos, useGetAcciones, useCreatePermisosRol, useRemovePermisoRol } from '@/modules/gestionPermisos/roles/hooks/rolesHooks';
import { ensurePerms, makeCan } from '@/services/authHelpers';

import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useParams } from '@tanstack/react-router';
import { CircleCheck, CircleMinus, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfirmacion } from '@/hooks/useConfirmar';

export const Route = createFileRoute('/usuarios/roles/$rolId')({
  component: RouteComponent,
  parseParams: (params) => ({ rolId: params.rolId }),
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Seguridad.Usuarios:Ver',
      'Seguridad.Roles:Ver'
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
});

function RouteComponent() {
  const { rolId } = useParams({ from: "/usuarios/roles/$rolId" });
  const { rol, loadingRol } = useGetPermisosDeRol(rolId);
  const isActivo = !!rol?.estado;
  const qc = useQueryClient();
  const confirmar = useConfirmacion();

  const activarMutation = useActivarRol();
  const desactivarMutation = useDesactivarRol();

  const activar = async () => {
    try {
      await activarMutation.mutateAsync({ rolId: Number(rolId) });
      toast.success("Rol activado correctamente");
      qc.invalidateQueries({ queryKey: ["rol", rolId] });
      qc.invalidateQueries({ queryKey: ["roles"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "No se pudo activar el rol");
    }
  };

  const desactivar = async () => {
    const confirmado = await confirmar(
      <>
        <p>¿Estás seguro que quieres <strong>desactivar</strong> este rol?</p>
        <p>Desactivar un rol también desactivará todos los usuarios que cuenten con este rol.</p>
      </>,
      "destructive"
    );

    if (!confirmado) {
      toast("Acción cancelada");
      return;
    }

    try {
      await desactivarMutation.mutateAsync({ rolId: Number(rolId) });
      toast.success("Rol desactivado correctamente");
      qc.invalidateQueries({ queryKey: ["rol", rolId] });
      qc.invalidateQueries({ queryKey: ["roles"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "No se pudo desactivar el rol");
    }
  };

  const [editMode, setEditMode] = useState(false);

  const modoEdicion = () => {
    setEditMode(v => !v);
  }

  const { Permisos, loadingPermisos } = useGetPermisos();
  const { Acciones, loadingAcciones } = useGetAcciones();

  const initialActivePairs = useMemo(() => {
    const S = new Set<string>();
    (rol?.permisos ?? []).forEach((p) =>
      p.acciones.forEach(a => { if (a.activo) S.add(`${p.id_permiso}-${a.id_accion}`); })
    );
    return S;
  }, [rol]);

  const [activePairs, setActivePairs] = useState<Set<string>>(initialActivePairs);
  useEffect(() => { setActivePairs(initialActivePairs); }, [initialActivePairs]);

  const add = useCreatePermisosRol();
  const remove = useRemovePermisoRol();

  const isPairActive = (permisoId: number, accionId: number) =>
    activePairs.has(`${permisoId}-${accionId}`);

  const togglePair = async (permisoId: number, accionId: number) => {
    const key = `${permisoId}-${accionId}`;
    const wasActive = activePairs.has(key);

    setActivePairs(prev => {
      const next = new Set(prev);
      if (wasActive) next.delete(key); else next.add(key);
      return next;
    });

    try {
      if (wasActive) {
        await remove.mutateAsync({ rolId: Number(rolId), permisoId, accionId });
        toast.success("Se eliminaron los permisos correctamente");
      } else {
        await add.mutateAsync({ rolId: Number(rolId), permisoId, accionId });
        toast.success("Se agregaron los permisos correctamente");
      }
      qc.invalidateQueries({ queryKey: ["rol", rolId] });
    } catch (err: any) {
      setActivePairs(prev => {
        const next = new Set(prev);
        if (wasActive) next.add(key); else next.delete(key);
        return next;
      });
      toast.error(err?.response?.data?.message ?? "No se pudo actualizar el permiso");
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, { id_permiso: number; seccion: string }[]>();
    (Permisos ?? []).forEach(p => {
      if (!map.has(p.modulo)) map.set(p.modulo, []);
      map.get(p.modulo)!.push({ id_permiso: p.id_permiso, seccion: p.seccion });
    });
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.seccion.localeCompare(b.seccion));
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [Permisos]);

  if (loadingRol) return <WebLoader />;
  if (!rol) return <p className="text-muted-foreground px-4 py-8">No se ha encontrado ese rol…</p>;

  const loadingCatalogos = loadingPermisos || loadingAcciones;
  const busy = activarMutation.isPending || desactivarMutation.isPending || add.isPending || remove.isPending;

  return (
    <section className="w-full h-[90svh] overflow-hidden mx-auto lg:p-5">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <aside className="border rounded-xl p-5 overflow-y-auto">
          <div className="flex h-full flex-col">
            <h2 className="text-2xl font-semibold mb-2">{capitalize(rol.nombre)}</h2>
            <p className="text-muted-foreground">{rol.descripcion || "Sin descripción"}</p>
            <div className='mt-4'>
              <Badge variant={isActivo ? "accepted" : "denied"}>
                {isActivo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <div className="mt-auto pt-10 flex items-center justify-center gap-4">
              <IfPerm perm="Seguridad.Roles:Actualizar">
                <FormEditarRol rol={rol} />
              </IfPerm>
              <IfPerm perm="Seguridad.Roles:Actualizar">
                <Button
                  onClick={isActivo ? desactivar : activar}
                  variant={isActivo ? "destructive" : "approve"}
                  type="button"
                  disabled={busy}
                >
                  {desactivarMutation.isPending || activarMutation.isPending ? (
                    <>
                      {isActivo ? "Desactivando..." : "Activando..."}
                    </>
                  ) : (
                    <>
                      {isActivo ? (
                        <CircleMinus size={12} aria-hidden="true" />
                      ) : (
                        <CircleCheck size={12} aria-hidden="true" />
                      )}
                      {isActivo ? "Desactivar" : "Activar"}
                    </>
                  )}
                </Button>
              </IfPerm>
            </div>
          </div>
        </aside>

        <main className="border rounded-xl p-5 h-full overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Permisos del rol </h2>
            {editMode && (<p className='text-gray-500 italic text-sm'>
              Haz click en las acciones que desea asociar al rol {rol.nombre}
            </p>)}
            <IfPerm perm="Seguridad.Roles:Actualizar">
              <Button
                size="sm"
                variant={editMode ? "outline" : "update"}
                onClick={modoEdicion}
                disabled={busy || loadingCatalogos || !isActivo}
              >
                <Pencil /> {editMode ? "Dejar de editar" : "Editar permisos"}
              </Button>
            </IfPerm>
          </div>

          <div className="h-full p-5 overflow-y-auto pr-2
                          scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent">
            <div className="space-y-8">
              {loadingCatalogos && <WebLoader />}

              {!loadingCatalogos && grouped.length === 0 && (
                <p className="text-muted-foreground">No hay permisos disponibles.</p>
              )}

              {!loadingCatalogos && grouped.map(([modulo, permisosDelModulo]) => (
                <div key={modulo}>
                  <div className="font-medium text-lg mb-3 text-justify">{modulo}</div>
                  <div className="pl-4 border-l-2">
                    {permisosDelModulo.map((perm) => (
                      <div key={perm.id_permiso} className="mb-5">
                        <div className="text-md mb-1 text-justify">
                          <span className="font-semibold">Sección: {perm.seccion}: </span>
                        </div>

                        <div className="text-md mb-2 flex items-center gap-3 justify-evenly">
                          <span>Permisos:</span>
                          <div className="flex gap-4 flex-wrap">
                            {(Acciones ?? []).map((a) => {
                              const active = isPairActive(perm.id_permiso, a.id);
                              return editMode ? (
                                <EditableActionChip
                                  key={`${perm.id_permiso}-${a.id}`}
                                  name={a.accion}
                                  active={active}
                                  disabled={add.isPending || remove.isPending}
                                  onToggle={() => togglePair(perm.id_permiso, a.id)}
                                />
                              ) : (
                                <ActionChip
                                  key={`${perm.id_permiso}-${a.id}`}
                                  name={a.accion}
                                  active={active}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}

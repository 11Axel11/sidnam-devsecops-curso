import { getAvatarSvg } from '@/components/app/avatarGenerator';
import IfPerm from '@/components/auth/IfPerm';
import WebLoader from '@/components/Loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { capitalize } from '@/lib/pathNameMap';
import ActionChip from '@/modules/gestionPermisos/roles/components/ActionChip';
import type { PermisoRol } from '@/modules/gestionPermisos/roles/models/roles';
import { useActivarUsuario, useDesactivarUsuario, useGetUsuarioPorCedula } from '@/modules/gestionPermisos/usuarios/hooks/usuariosHooks';
import { ensurePerms, makeCan } from '@/services/authHelpers';
import { parseFechaDDMMYY } from '@/utils/parseFecha';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate, useParams } from '@tanstack/react-router';
import { CircleCheck, CircleMinus, SquareArrowOutUpRight } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useConfirmacion } from '@/hooks/useConfirmar';


export const Route = createFileRoute('/usuarios/$cedula')({
  component: RouteComponent,
  parseParams: (p) => ({ cedula: p.cedula }),
  beforeLoad: async ({ context, location }) => {
    const perms = await ensurePerms(context.queryClient)
    const { canAny } = makeCan(perms)
    const ok = canAny([
      'Seguridad.Usuarios:Ver',
    ])
    if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
  },
});

function RouteComponent() {
  const { cedula } = useParams({ from: "/usuarios/$cedula" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirmar = useConfirmacion();
  const { data: usuario, isLoading: loadingUsuario } = useGetUsuarioPorCedula(cedula);

  const isActivo = typeof usuario?.estado === "boolean"
    ? usuario.estado
    : (typeof usuario?.estado === "string"
      ? usuario.estado.toLowerCase() === "activo"
      : undefined);

  const activarMutation = useActivarUsuario();
  const desactivarMutation = useDesactivarUsuario();

  const getBackendErrorMessage = (error: unknown, fallback: string) => {
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      typeof (error as { response?: unknown }).response === "object" &&
      (error as { response?: unknown }).response !== null &&
      "data" in ((error as { response?: unknown }).response as Record<string, unknown>)
    ) {
      const data = ((error as { response?: { data?: unknown } }).response?.data ?? null) as
        | { message?: unknown }
        | null;
      if (typeof data?.message === "string" && data.message.trim().length > 0) {
        return data.message;
      }
    }

    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return fallback;
  };

  const activar = async () => {
    try {
      await activarMutation.mutateAsync({ idUsuario: Number(usuario?.id) });
      toast.success("Usuario activado correctamente");
      qc.invalidateQueries({ queryKey: ["usuario", cedula] });
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (error) {
      toast.error(getBackendErrorMessage(error, "No se pudo activar el usuario"));
    }
  };

  const desactivar = async () => {
    const confirmado = await confirmar(
      <>
        ¿Estás seguro que quieres <strong>desactivar</strong> este usuario? Esta acción es delicada.
      </>,
      "destructive"
    );

    if (!confirmado) {
      toast("Acción cancelada");
      return;
    }

    try {
      await desactivarMutation.mutateAsync({ idUsuario: Number(usuario?.id) });
      toast.success("Usuario desactivado correctamente");
      qc.invalidateQueries({ queryKey: ["usuario", cedula] });
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (error) {
      toast.error(getBackendErrorMessage(error, "No se pudo desactivar el usuario"));
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, PermisoRol[]>();
    (usuario?.rol?.permisos ?? []).forEach((p) => {
      if (!map.has(p.modulo)) map.set(p.modulo, []);
      map.get(p.modulo)!.push(p);
    });
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.seccion.localeCompare(b.seccion));
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [usuario]);

  const busy = activarMutation.isPending || desactivarMutation.isPending;


  if (loadingUsuario) return <WebLoader />;

  if (!usuario) {
    return <p className="text-muted-foreground px-4 py-8">No se ha encontrado ese usuario…</p>;
  }

  return (
    <section className="w-full h-[90svh] overflow-hidden mx-auto lg:p-5">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <aside className="border rounded-xl p-5 overflow-y-auto">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={getAvatarSvg(usuario.name, usuario.apellido1)}
                alt={`Avatar de ${usuario.name}`}
                className="w-23 h-23 rounded-full"
              />
              <div className='text-justify'>
                <h2 className="text-xl font-semibold ">
                  {capitalize(`${usuario.name ?? ``} ${usuario.apellido1 ?? ``} ${usuario.apellido2 ?? ``}`.trim())}
                </h2>
                <Badge variant={'received'}>{capitalize(usuario.rol?.nombre ?? "Rol")}</Badge>
              </div>
            </div>

            <div className="space-y-4 text-sm text-justify">
              <div>
                <p className="text-muted-foreground">Cédula</p>
                <p className="font-medium">{usuario.cedula ?? "—"}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Correo electrónico</p>
                <p className="font-medium">{usuario.email ?? "—"}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Fecha de creación</p>
                <p className="font-medium">{parseFechaDDMMYY(usuario.createdAt)}</p>
              </div>

              {typeof isActivo !== "undefined" && (
                <div>
                  <Badge variant={isActivo ? "accepted" : "denied"}>
                    {isActivo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              )}
            </div>
            <div className="mt-auto">
              {typeof isActivo !== "undefined" && (
                <IfPerm perm="Seguridad.Roles:Actualizar">
                  <Button
                    onClick={isActivo ? desactivar : activar}
                    variant={isActivo ? "destructive" : "approve"}
                    type="button"
                    disabled={busy}
                    className='w-full'
                  >
                    {isActivo ? (
                      <>
                        <CircleMinus className="mr-2 h-4 w-4" />
                        {desactivarMutation.isPending ? "Desactivando..." : "Desactivar"}
                      </>
                    ) : (
                      <>
                        <CircleCheck className="mr-2 h-4 w-4" />
                        {activarMutation.isPending ? "Activando..." : "Activar"}
                      </>
                    )}
                  </Button>
                </IfPerm>
              )}
            </div>
          </div>
        </aside>

        <main className="border rounded-xl p-5 h-full overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className='flex gap-2 items-center'>
              <h2 className="text-xl font-semibold flex gap-1 items-center">
                Permisos del rol
                <p className=''>
                  {usuario.rol?.nombre ?? "Rol"}
                </p>
              </h2>
            </div>

            {isActivo && (
              usuario.rol?.id_rol ? (
                <IfPerm perm="Seguridad.Roles:Actualizar">
                  <Button
                    size="sm"
                    variant="read"
                    onClick={() =>
                      navigate({
                        to: "/usuarios/roles/$rolId",
                        params: { rolId: String(usuario.rol!.id_rol) },
                      })
                    }
                  >
                    <SquareArrowOutUpRight />
                    Ver rol
                  </Button>
                </IfPerm>
              ) : null
            )}
          </div>

          <div className="h-full text-justify p-5 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent">

            {!usuario.rol?.id_rol ? (
              <p className="text-muted-foreground">
                Este usuario no tiene un rol asignado. Asigna uno para ver sus permisos.
              </p>
            ) : (usuario.rol.permisos?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground">El rol no tiene permisos configurados.</p>
            ) : (
              <div className="space-y-8">
                {grouped.map(([modulo, permisosDelModulo]) => (
                  <div key={modulo}>
                    <div className="font-medium text-lg mb-3 text-justify">{modulo}</div>
                    <div className="pl-4 border-l-2 ">
                      {permisosDelModulo.map((perm) => (
                        <div key={perm.id_permiso} className="mb-5">
                          <div className="text-md mb-1 text-justify">
                            <span className="font-semibold">Sección: {perm.seccion}: </span>
                          </div>

                          <div className="text-md mb-2 flex items-center gap-3 justify-evenly">
                            <span>Permisos:</span>
                            <div className="flex gap-4 flex-wrap">
                              {perm.acciones.map((a) => (
                                <ActionChip key={a.id_accion} name={a.accion} active={a.activo} />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}

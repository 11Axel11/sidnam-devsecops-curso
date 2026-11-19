import { createFileRoute } from '@tanstack/react-router'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ItemUsuario from '@/modules/gestionPermisos/usuarios/components/ItemUsuario';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import FormCambiarContrasena from '@/modules/gestionPermisos/usuarios/components/FormCambiarContrasena';
import { useGetUsuarioPerfil } from '@/modules/gestionPermisos/usuarios/hooks/usuariosHooks';
import WebLoader from '@/components/Loader';
import EditarPerfilDialogForm from '@/modules/gestionPermisos/usuarios/components/EditarPerfilDialogForm';

export const Route = createFileRoute('/perfil/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { UsuarioPerfil, loadingUsuarioPerfil, fetchingUsuarioPerfil } 
  = useGetUsuarioPerfil()

  if (loadingUsuarioPerfil || fetchingUsuarioPerfil) return <WebLoader />;
  if (!UsuarioPerfil) return <section>No se encontró el perfil.</section>;
  const initialValues = {
    cedula: UsuarioPerfil.cedula ?? "",
    email: UsuarioPerfil.email ?? "",
    name: UsuarioPerfil.name ?? "",
    apellido1: UsuarioPerfil.apellido1 ?? "",
    apellido2: UsuarioPerfil.apellido2 ?? undefined,
  };
  return (
    <div className="w-full h-90">
      <div className="relative z-0 w-full overflow-hidden">
        <img
          src="https://i.ibb.co/PvPb7fzw/seniors-7451914-1280.jpg"
          alt="Banner"
          loading="eager"
          decoding="async"
          className="h-56 w-full object-cover sm:h-40 md:h-104"
        />
      </div>

      <div className="container mx-auto -mt-14 grid grid-cols-1 gap-6 px-4 pb-10 
                      sm:-mt-16 md:grid-cols-12 md:-mt-20">
        <aside className="z-10 md:col-span-4 lg:col-span-3">
          <div className="flex h-2/2 flex-col items-center gap-4 rounded-2xl border bg-background p-5 shadow-sm sm:p-6">
            <img
              src={UsuarioPerfil.imagenUrl}
              alt="Perfil del usuario"
              className="z-20 h-28 w-28 rounded-full object-cover ring-2 ring-muted"
            />

            <div className="flex h-1/3 w-full flex-col items-center justify-between text-center">
              <p className="text-lg font-medium sm:text-xl">{UsuarioPerfil?.name} {UsuarioPerfil.apellido1} {UsuarioPerfil.apellido2}</p>
              <Badge variant="secondary">{UsuarioPerfil.rol.nombre}</Badge>
            </div>
          </div>
        </aside>

        <section className="z-10 md:col-span-8 lg:col-span-9">
          <Card className="h-2/2 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl">Tu perfil</CardTitle>
              <div className="mt-2 h-px w-full bg-muted" />
            </CardHeader>

            <CardContent className="space-y-6">
              <ItemUsuario label="Cédula" value={UsuarioPerfil.cedula} />
              <ItemUsuario label="Correo electrónico" value={UsuarioPerfil.email} />
              <CardDescription className='text-justify'>
                Creado en: {UsuarioPerfil.createdAt}
              </CardDescription>
            </CardContent>

            <CardFooter className="flex justify-end gap-4">
              <CardAction>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="update">
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-[640px]">
                    <DialogHeader>
                      <DialogTitle className="sr-only">Editar perfil</DialogTitle>
                    </DialogHeader>

                    <EditarPerfilDialogForm
                      idUsuario={UsuarioPerfil.id} 
                      initialValues={initialValues}
                    />
                  </DialogContent>
                </Dialog>
              </CardAction>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="update">
                    <KeyRound /> Cambiar contraseña
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="sr-only">Reestablecer contraseña</DialogTitle>
                  </DialogHeader>
                  <FormCambiarContrasena />
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        </section>
      </div>
    </div>
  )
}

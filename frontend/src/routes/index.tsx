import { createFileRoute } from '@tanstack/react-router'
import dashboard from "@/assets/dashboard.png";
import { useGetUsuarioPerfil } from '@/modules/gestionPermisos/usuarios/hooks/usuariosHooks';

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { UsuarioPerfil,loadingUsuarioPerfil } = useGetUsuarioPerfil()
  return (
    <section className="container mx-auto p-4 flex flex-col items-center mt-6">
      {loadingUsuarioPerfil ? <p>Cargando perfil...</p> :<>
        <h1 className='text-3xl font-bold'>¡Hola, {UsuarioPerfil?.name}!</h1>
        <p>Bienvenido al sistema SIDNAM</p>
        </>}
      <div className="relative w-full ">
          <div className='flex w-full justify-center mt-10 '>
          <img width={600} src={dashboard} alt="" />
          </div>
      </div>
    </section>
  );
}

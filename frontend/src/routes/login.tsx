import { LoginForm } from '@/components/auth/LoginForm'
import Divider from '@/components/Divider'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  staticData: { isPublic: true, hideChrome: true, authLanding: true },
  component: Index,
})

function Index() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center px-4 gap-4 md:flex-row md:justify-evenly md:px-0 md:gap-0">
      <div className="flex items-center justify-center md:block">
        <img
          src="/logo_hogar_san_blas.webp"
          alt="Logo Hogar San Blas"
          className="w-40 md:w-80"
          loading="eager"
          fetchPriority="high"
        />
      </div>

      <div className="hidden md:block">
        <Divider />
      </div>

      <div className="w-full max-w-xs md:w-auto md:max-w-none">
        <LoginForm />
      </div>
    </div>
  )
}
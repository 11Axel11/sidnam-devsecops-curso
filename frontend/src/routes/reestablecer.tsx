
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/reestablecer')({
  component: RouteComponent,
  staticData: { isPublic: true, hideChrome: true },
})

function RouteComponent() {
  return <div className='w-screen h-screen flex items-center justify-center'>
    <ResetPasswordForm/>
  </div>
}

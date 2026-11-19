
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/forgotpassword')({
  staticData: { isPublic: true, hideChrome: true },
  component: RouteComponent,
})

function RouteComponent() {
  return <div className='w-screen h-screen flex items-center justify-center'>
    <ForgotPasswordForm/>
  </div>
}

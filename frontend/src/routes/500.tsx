import ErrorPage from '@/components/app/ErrorPage';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/500')({
  staticData: { isPublic: true, hideChrome: true },
  component: () => (
    <ErrorPage
      code="500"
      title="Error del servidor"
      message="Lo sentimos, algo salió mal de nuestra parte. Prueba a intentar de nuevo más tarde."
      actions={[{ type: "link", to: "/", label: "Volver al inicio" }]}
    />
  ),
});
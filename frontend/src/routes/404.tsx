import ErrorPage from '@/components/app/ErrorPage';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/404')({
  staticData: { isPublic: true, hideChrome: true },
  component: () => (
    <ErrorPage
      code="404"
      title="No encontrado"
      message="La página o recurso no existe."
      actions={[{ type: "link", to: "/", label: "Volver al inicio" }]}
    />
  ),
});
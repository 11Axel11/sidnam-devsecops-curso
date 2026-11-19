import ErrorPage from '@/components/app/ErrorPage';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute("/403")({
  staticData: { isPublic: true, hideChrome: true },
  component: () => (
    <ErrorPage
      code="403"
      title="Sin permiso"
      message="No tienes acceso a esta sección."
      actions={[{ type: "link", to: "/", label: "Volver al inicio" }]}
    />
  ),
});
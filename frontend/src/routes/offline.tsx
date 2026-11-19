import ErrorPage from '@/components/app/ErrorPage';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/offline')({
  staticData: { isPublic: true, hideChrome: true },
  component: () => (
    <ErrorPage
      code="Offline"
      title="Sin conexión"
      message="Parece que no hay internet. Verifica tu conexión."
      actions={[{ type: "reload", label: "Reintentar" }]}
    />
  ),
});
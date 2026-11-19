import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/voluntarios/gestion/editar/')({
  component: RouteComponent,
  beforeLoad: ({ location }) => {
      if (location.pathname === '/voluntarios/gestion/editar/') {
        throw redirect({
          to: '/voluntarios/gestion',
        });
      }
    },
})

function RouteComponent() {
  return <div></div>
}

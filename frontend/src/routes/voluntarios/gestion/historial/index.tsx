import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/voluntarios/gestion/historial/')({
  component: RouteComponent,
  beforeLoad: ({ location }) => {
    if (location.pathname === '/voluntarios/gestion/historial/') {
      throw redirect({
        to: '/voluntarios/gestion',
      });
    }
  },
})

function RouteComponent() {
  return <></>
}

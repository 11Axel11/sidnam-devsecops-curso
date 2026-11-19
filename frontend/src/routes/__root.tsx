import { createRootRouteWithContext, Outlet, useMatches, useNavigate, useRouterState } from '@tanstack/react-router'
import App from '@/App'
import { useAuth } from '@/hooks/useAuth'
import { LOGIN_PATH, isPublicPath } from '@/lib/authPaths'
import { useEffect } from 'react'
import WebLoader from '@/components/Loader'
import { Toaster } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    hideChrome?: boolean;
    isPublic?: boolean;
    authLanding?: boolean;
  }
}
function NotFoundRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate({ to: '/404', replace: true })
  }, [navigate])
  return null
}


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  notFoundComponent: NotFoundRedirect
})

function RootLayout() {
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const matches = useMatches()

  const routeIsPublic = matches.some(m => m.staticData?.isPublic)
  const routeHideChrome = matches.some(m => m.staticData?.hideChrome)
  const routeIsAuthLanding = matches.some(m => m.staticData?.authLanding)

  const isPublic = isPublicPath(pathname) || routeIsPublic

  const isAuthLanding = pathname === LOGIN_PATH || routeIsAuthLanding

  const hideChrome =
    isPublic || routeHideChrome

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated && !isPublic) {
      navigate({ to: '/login' })
      return
    }
    if (isAuthenticated && isAuthLanding) {
      navigate({ to: '/' })
    }
  }, [isAuthenticated, isPublic, isAuthLanding, loading, navigate])

  if (loading) return <WebLoader />

  return (
    <>
      {hideChrome ? (
          <main>
            <Outlet />
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              duration={7000}
              toastOptions={{
                className: 'rounded-xl',
              }}
            />
        </main>
      ) : (
        <App>
          <Outlet />
        </App>
      )}

    </>
  )
}
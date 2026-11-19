import { Toaster } from 'sonner';
import { AppSidebar } from './components/app/AppSidebar'
import {Breadcrumbs} from './components/app/Breadcrumbs'
import ConfirmModal from './components/app/ConfirmModal'
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar'
import { useSolicitudesSocket } from './hooks/useSolicitudesSocket';
import { WebSocketNotification } from './components/notifications/WebSocketNotification';

function App({ children }: { children: React.ReactNode }) {
  useSolicitudesSocket();
  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <main className='flex flex-col flex-1 min-w-0 p-3 space-y-2'>
          <header className='flex items-center gap-4'>
            <SidebarTrigger />
            <Breadcrumbs />
          </header>
          <hr />
          <ConfirmModal/>
          {children}
        </main>
      </SidebarProvider>

      <WebSocketNotification />
      
      <Toaster
      position="bottom-right"
      richColors
      closeButton
      duration={7000}
      toastOptions={{
        className: 'rounded-xl',
      }}
      />
    </>
  )
}

export default App

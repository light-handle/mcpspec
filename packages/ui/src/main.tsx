import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { routerInstance } from './routes/route-tree';
import { useUiStore } from './stores/ui-store';
import './styles/globals.css';

// Initialize theme before render to prevent flash
useUiStore.getState().initTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={routerInstance} />
    </QueryClientProvider>
  </StrictMode>,
);

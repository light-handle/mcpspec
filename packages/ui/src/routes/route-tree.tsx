import { createRouter, createRootRoute, createRoute, Outlet, useRouter } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/app-layout';
import { DashboardPage } from './pages/dashboard';
import { ServersPage } from './pages/servers';
import { CollectionsPage } from './pages/collections';
import { RunsPage } from './pages/runs';
import { RunDetailPage } from './pages/run-detail';
import { InspectPage } from './pages/inspect';
import { AuditPage } from './pages/audit';
import { BenchmarkPage } from './pages/benchmark';
import { DocsPage } from './pages/docs';
import { ScorePage } from './pages/score';

const rootRoute = createRootRoute({
  component: function RootComponent() {
    const router = useRouter();
    const currentPath = router.state.location.pathname;

    return (
      <AppLayout
        currentPath={currentPath}
        onNavigate={(path) => router.navigate({ to: path })}
      >
        <Outlet />
      </AppLayout>
    );
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const serversRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/servers',
  component: ServersPage,
});

const collectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collections',
  component: CollectionsPage,
});

const runsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/runs',
  component: RunsPage,
});

const runDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/runs/$runId',
  component: RunDetailPage,
});

const inspectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inspect',
  component: InspectPage,
});

const auditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audit',
  component: AuditPage,
});

const benchmarkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/benchmark',
  component: BenchmarkPage,
});

const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/docs',
  component: DocsPage,
});

const scoreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/score',
  component: ScorePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  serversRoute,
  collectionsRoute,
  runsRoute,
  runDetailRoute,
  inspectRoute,
  auditRoute,
  benchmarkRoute,
  docsRoute,
  scoreRoute,
]);

export const routerInstance = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof routerInstance;
  }
}

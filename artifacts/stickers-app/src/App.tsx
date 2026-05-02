import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import { DevQuickSwitch } from "@/components/dev/DevQuickSwitch";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Login } from "@/pages/auth/Login";
import { Home } from "@/pages/Home";
import { AlbumList } from "@/pages/album/AlbumList";
import { DemoExpiredScreen } from "@/pages/DemoExpiredScreen";

const AlbumDetail = lazy(() => import("@/pages/album/AlbumDetail").then((m) => ({ default: m.AlbumDetail })));
const MatchList = lazy(() => import("@/pages/match/MatchList").then((m) => ({ default: m.MatchList })));
const MatchDetail = lazy(() => import("@/pages/match/MatchDetail").then((m) => ({ default: m.MatchDetail })));
const ChatRoom = lazy(() => import("@/pages/chat/ChatRoom").then((m) => ({ default: m.ChatRoom })));
const Profile = lazy(() => import("@/pages/Profile").then((m) => ({ default: m.Profile })));

const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard").then((m) => ({ default: m.AdminDashboard })));
const AdminAlbums = lazy(() => import("@/pages/admin/Albums").then((m) => ({ default: m.AdminAlbums })));
const AdminFigurine = lazy(() => import("@/pages/admin/Figurine").then((m) => ({ default: m.AdminFigurine })));
const AdminUsers = lazy(() => import("@/pages/admin/Users").then((m) => ({ default: m.AdminUsers })));
const AdminMessages = lazy(() => import("@/pages/admin/Messages").then((m) => ({ default: m.AdminMessages })));
const AdminPremium = lazy(() => import("@/pages/admin/Premium").then((m) => ({ default: m.AdminPremium })));
const AdminSettings = lazy(() => import("@/pages/admin/Settings").then((m) => ({ default: m.AdminSettings })));

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function useAuthRedirect(target: string | null) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (target) setLocation(target);
  }, [target, setLocation]);
}

function ProtectedUserRoute({
  component: Component,
  requirePremium = false,
}: {
  component: React.FC;
  requirePremium?: boolean;
}) {
  const { isAuthenticated, currentUser } = useAuth();
  const redirect = !isAuthenticated
    ? "/login"
    : currentUser?.isAdmin
      ? "/admin"
      : null;
  useAuthRedirect(redirect);

  if (redirect) return null;

  if (requirePremium && currentUser?.demoStatus === "demo_expired") {
    return (
      <MobileLayout>
        <DemoExpiredScreen />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <Component />
    </MobileLayout>
  );
}

function ProtectedChatRoute({ component: Component }: { component: React.FC }) {
  const { isAuthenticated, currentUser } = useAuth();
  const redirect = !isAuthenticated
    ? "/login"
    : currentUser?.isAdmin
      ? "/admin"
      : null;
  useAuthRedirect(redirect);

  if (redirect) return null;

  if (currentUser?.demoStatus === "demo_expired") {
    return (
      <MobileLayout>
        <DemoExpiredScreen />
      </MobileLayout>
    );
  }

  return <Component />;
}

function ProtectedAdminRoute({ component: Component }: { component: React.FC }) {
  const { isAuthenticated, currentUser } = useAuth();
  const redirect = !isAuthenticated
    ? "/login"
    : !currentUser?.isAdmin
      ? "/"
      : null;
  useAuthRedirect(redirect);

  if (redirect) return null;

  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function Router() {
  return (
    <>
      <Suspense fallback={<PageSkeleton />}>
      <Switch>
        <Route path="/login" component={Login} />

        {/* User routes */}
        <Route path="/" component={() => <ProtectedUserRoute component={Home} />} />
        <Route path="/album" component={() => <ProtectedUserRoute component={AlbumList} />} />
        <Route path="/album/:id" component={() => <ProtectedUserRoute component={AlbumDetail} />} />
        <Route path="/match" component={() => <ProtectedUserRoute component={MatchList} requirePremium />} />
        <Route path="/match/:userId" component={() => <ProtectedUserRoute component={MatchDetail} requirePremium />} />
        <Route path="/chat/:chatId" component={() => <ProtectedChatRoute component={ChatRoom} />} />
        <Route path="/profilo" component={() => <ProtectedUserRoute component={Profile} />} />

        {/* Admin routes */}
        <Route path="/admin" component={() => <ProtectedAdminRoute component={AdminDashboard} />} />
        <Route path="/admin/album" component={() => <ProtectedAdminRoute component={AdminAlbums} />} />
        <Route path="/admin/figurine" component={() => <ProtectedAdminRoute component={AdminFigurine} />} />
        <Route path="/admin/utenti" component={() => <ProtectedAdminRoute component={AdminUsers} />} />
        <Route path="/admin/messaggi" component={() => <ProtectedAdminRoute component={AdminMessages} />} />
        <Route path="/admin/premium" component={() => <ProtectedAdminRoute component={AdminPremium} />} />
        <Route path="/admin/impostazioni" component={() => <ProtectedAdminRoute component={AdminSettings} />} />

        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
              <DevQuickSwitch />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

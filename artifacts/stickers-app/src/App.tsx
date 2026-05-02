import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DevSwitcher } from "@/components/dev/DevSwitcher";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";

import { MobileLayout } from "@/components/layout/MobileLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Login } from "@/pages/auth/Login";
import { Home } from "@/pages/Home";
import { AlbumList } from "@/pages/album/AlbumList";
import { AlbumDetail } from "@/pages/album/AlbumDetail";
import { MatchList } from "@/pages/match/MatchList";
import { MatchDetail } from "@/pages/match/MatchDetail";
import { ChatRoom } from "@/pages/chat/ChatRoom";
import { Profile } from "@/pages/Profile";
import { AdminDashboard } from "@/pages/admin/Dashboard";
import { AdminAlbums } from "@/pages/admin/Albums";
import { AdminFigurine } from "@/pages/admin/Figurine";
import { AdminUsers } from "@/pages/admin/Users";
import { AdminMessages } from "@/pages/admin/Messages";
import { AdminPremium } from "@/pages/admin/Premium";
import { AdminSettings } from "@/pages/admin/Settings";
import { DemoExpiredScreen } from "@/pages/DemoExpiredScreen";

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

      {/* Dev-only: global user switcher — visible on every page */}
      <DevSwitcher />
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
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

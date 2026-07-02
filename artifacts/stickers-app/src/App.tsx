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
import { CookieBanner } from "@/components/CookieBanner";
import { ConfirmProvider } from "@/components/admin/ConfirmDialog";
import { dismissBootSplash } from "@/components/brand/SplashScreen";
import { setFetchFailureObserver } from "@workspace/api-client-react";
import { installGlobalErrorCapture, reportApiFailure } from "@/lib/error-capture";

// Cattura errori globali (JS non gestiti, promise, chunk falliti) il prima
// possibile, prima ancora del render: così nessun errore silente sfugge.
installGlobalErrorCapture();
// Ogni chiamata API che fallisce con 5xx o per rete assente diventa una
// segnalazione automatica (i 4xx normali — PIN errato, paywall — sono esclusi).
setFetchFailureObserver(reportApiFailure);

// Recupero automatico dallo "schermo bianco": se un chunk lazy non si scarica
// (deploy nuovo, rete instabile), ricarica UNA volta la pagina invece di
// lasciare l'utente bloccato. Il guard in sessionStorage evita loop infiniti.
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", () => {
    try {
      const KEY = "sticker_chunk_reloaded";
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        window.location.reload();
      }
    } catch {
      /* sessionStorage può non essere disponibile: non bloccare */
    }
  });
}

import { MobileLayout } from "@/components/layout/MobileLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Login } from "@/pages/auth/Login";
import { Recover } from "@/pages/auth/Recover";
import { Home } from "@/pages/Home";
import { AlbumList } from "@/pages/album/AlbumList";
import { LegalPage } from "@/pages/LegalPage";

const importAlbumDetail = () => import("@/pages/album/AlbumDetail");
const importMatchList = () => import("@/pages/match/MatchList");
const importMatchDetail = () => import("@/pages/match/MatchDetail");
const importMessages = () => import("@/pages/chat/Messages");
const importChatRoom = () => import("@/pages/chat/ChatRoom");
const importProfile = () => import("@/pages/Profile");
const importAdminDashboard = () => import("@/pages/admin/Dashboard");
const importAdminAlbums = () => import("@/pages/admin/Albums");
const importAdminUsers = () => import("@/pages/admin/Users");
const importAdminMessages = () => import("@/pages/admin/Messages");
const importAdminErrors = () => import("@/pages/admin/Errors");
const importAdminPremium = () => import("@/pages/admin/Premium");
const importAdminSettings = () => import("@/pages/admin/Settings");

const AlbumDetail = lazy(() => importAlbumDetail().then((m) => ({ default: m.AlbumDetail })));
const MatchList = lazy(() => importMatchList().then((m) => ({ default: m.MatchList })));
const MatchDetail = lazy(() => importMatchDetail().then((m) => ({ default: m.MatchDetail })));
const Messages = lazy(() => importMessages().then((m) => ({ default: m.Messages })));
const ChatRoom = lazy(() => importChatRoom().then((m) => ({ default: m.ChatRoom })));
const Profile = lazy(() => importProfile().then((m) => ({ default: m.Profile })));

const AdminDashboard = lazy(() => importAdminDashboard().then((m) => ({ default: m.AdminDashboard })));
const AdminAlbums = lazy(() => importAdminAlbums().then((m) => ({ default: m.AdminAlbums })));
const AdminUsers = lazy(() => importAdminUsers().then((m) => ({ default: m.AdminUsers })));
const AdminMessages = lazy(() => importAdminMessages().then((m) => ({ default: m.AdminMessages })));
const AdminErrors = lazy(() => importAdminErrors().then((m) => ({ default: m.AdminErrors })));
const AdminPremium = lazy(() => importAdminPremium().then((m) => ({ default: m.AdminPremium })));
const AdminSettings = lazy(() => importAdminSettings().then((m) => ({ default: m.AdminSettings })));

function prefetchUserChunks() {
  // Prefetch lazy chunks after first paint so navigations feel instant.
  void importAlbumDetail();
  void importMatchList();
  void importMatchDetail();
  void importMessages();
  void importChatRoom();
  void importProfile();
}

function prefetchAdminChunks() {
  void importAdminDashboard();
  void importAdminAlbums();
  void importAdminUsers();
  void importAdminMessages();
  void importAdminErrors();
  void importAdminPremium();
  void importAdminSettings();
}

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
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
    mutations: { retry: 0 },
  },
});

function useAuthRedirect(target: string | null) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (target) setLocation(target);
  }, [target, setLocation]);
}

function ProtectedUserRoute({ component: Component }: { component: React.FC }) {
  const { isAuthenticated, currentUser } = useAuth();
  const redirect = !isAuthenticated
    ? "/login"
    : currentUser?.isAdmin
      ? "/admin"
      : null;
  useAuthRedirect(redirect);

  if (redirect) return null;

  // App 100% gratis e visibile: i match e tutte le sezioni sono sempre
  // accessibili. Il paywall vive SOLO sull'apertura della chat (lato server).
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

  return <Component />;
}

function ProtectedAdminRoute({ component: Component }: { component: React.FC }) {
  const { isAuthenticated, currentUser } = useAuth();
  // /admin è la porta d'ingresso admin: se non sei loggato (o sei un utente
  // normale) vai al login con next=/admin, così puoi entrare con le credenziali
  // admin invece di essere rimbalzato in Home.
  const redirect = !isAuthenticated
    ? "/login?next=/admin"
    : !currentUser?.isAdmin
      ? "/login?next=/admin"
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
        <Route path="/recover" component={Recover} />
        <Route path="/legal/:doc" component={LegalPage} />

        {/* User routes */}
        <Route path="/" component={() => <ProtectedUserRoute component={Home} />} />
        <Route path="/album" component={() => <ProtectedUserRoute component={AlbumList} />} />
        <Route path="/album/:id" component={() => <ProtectedUserRoute component={AlbumDetail} />} />
        <Route path="/match" component={() => <ProtectedUserRoute component={MatchList} />} />
        <Route path="/match/:userId" component={() => <ProtectedUserRoute component={MatchDetail} />} />
        <Route path="/messaggi" component={() => <ProtectedUserRoute component={Messages} />} />
        <Route path="/chat/:chatId" component={() => <ProtectedChatRoute component={ChatRoom} />} />
        <Route path="/profilo" component={() => <ProtectedUserRoute component={Profile} />} />

        {/* Admin routes */}
        <Route path="/admin" component={() => <ProtectedAdminRoute component={AdminDashboard} />} />
        <Route path="/admin/album" component={() => <ProtectedAdminRoute component={AdminAlbums} />} />
        <Route path="/admin/utenti" component={() => <ProtectedAdminRoute component={AdminUsers} />} />
        <Route path="/admin/messaggi" component={() => <ProtectedAdminRoute component={AdminMessages} />} />
        <Route path="/admin/segnalazioni" component={() => <ProtectedAdminRoute component={AdminErrors} />} />
        <Route path="/admin/premium" component={() => <ProtectedAdminRoute component={AdminPremium} />} />
        <Route path="/admin/impostazioni" component={() => <ProtectedAdminRoute component={AdminSettings} />} />

        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </>
  );
}

function BootEffects() {
  const { currentUser, isAuthenticated } = useAuth();
  useEffect(() => {
    dismissBootSplash();
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    const schedule = (cb: () => void) =>
      ric ? ric(cb, { timeout: 2000 }) : window.setTimeout(cb, 800);
    schedule(() => {
      if (isAuthenticated) {
        if (currentUser?.isAdmin) prefetchAdminChunks();
        else prefetchUserChunks();
      }
    });
  }, [isAuthenticated, currentUser?.isAdmin]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <ConfirmProvider>
              <BootEffects />
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
                <DevQuickSwitch />
                <CookieBanner />
              </WouterRouter>
              <Toaster />
            </ConfirmProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

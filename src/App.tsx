import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoadingState from './components/ui/LoadingState';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PwaUpdateProvider } from './contexts/PwaUpdateContext';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Legal from './pages/Legal';
import VerifyEmail from './pages/VerifyEmail';
import VerifyCallback from './pages/VerifyCallback';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import TournamentDetails from './pages/TournamentDetails';
import MatchDetails from './pages/MatchDetails';
import Matches from './pages/Matches';
import LiveStreams from './pages/LiveStreams';
import Chat from './pages/Chat';
import CommunityChat from './pages/CommunityChat';
import Notifications from './pages/Notifications';
import Wallet from './pages/Wallet';
import WalletHistory from './pages/WalletHistory';
import WinnerHistory from './pages/WinnerHistory';
import Profile from './pages/Profile';
import TournamentChampion from './pages/TournamentChampion';
import PaymentCallback from './pages/PaymentCallback';
import Landing from './pages/Landing';
import Rules from './pages/Rules';
import Help from './pages/Help';
import CompleteProfile from './pages/CompleteProfile';

import ChallengeLobby from './pages/ChallengeLobby';
import ChallengeDetails from './pages/ChallengeDetails';
import ChallengeChat from './pages/ChallengeChat';

// Lazy load admin pages only
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminPlatform = lazy(() => import('./pages/admin/AdminPlatform'));
const ManageTournaments = lazy(() => import('./pages/admin/ManageTournaments'));
const CreateTournament = lazy(() => import('./pages/admin/CreateTournament'));
const EditTournament = lazy(() => import('./pages/admin/EditTournament'));
const ManageTournamentDetails = lazy(() => import('./pages/admin/ManageTournamentDetails'));
const AdminFixtures = lazy(() => import('./pages/admin/AdminFixtures'));
const AdminPlayers = lazy(() => import('./pages/admin/AdminPlayers'));
const AdminWallet = lazy(() => import('./pages/admin/AdminWallet'));
const AdminStandings = lazy(() => import('./pages/admin/AdminStandings'));
const ScheduleTournament = lazy(() => import('./pages/admin/ScheduleTournament'));
const LiveTournament = lazy(() => import('./pages/admin/LiveTournament'));
const Moderation = lazy(() => import('./pages/admin/Moderation'));
const ModerationLogs = lazy(() => import('./pages/admin/ModerationLogs'));
const StaffManagement = lazy(() => import('./pages/admin/StaffManagement'));

function HomeRoute() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}

function LoginRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingState fullPage />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Login />;
}

function SignupRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingState fullPage />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Login />;
}

import { PlatformStatusProvider, usePlatformStatus } from './contexts/PlatformStatusContext';
import MaintenanceScreen from './components/layout/MaintenanceScreen';
import AdminBypassNotice from './components/layout/AdminBypassNotice';
import NetworkBanner from './components/ui/NetworkBanner';

function RootPlatformGate({ children }: { children: React.ReactNode }) {
  const { status, loading } = usePlatformStatus();
  const { isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState fullPage />;
  }

  const isPublicRoute = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/terms', '/privacy-policy', '/privacy', '/legal', '/rules', '/help', '/verify-email', '/verify-callback'].includes(location.pathname);

  if (status?.is_blocked && !isPublicRoute && !isAdmin) {
    return <MaintenanceScreen />;
  }

  return (
    <>
      {children}
      <AdminBypassNotice />
    </>
  );
}

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <AuthProvider onNavigate={navigate}>
      <NetworkBanner />
      <PlatformStatusProvider>
        <RootPlatformGate>
          <ThemeProvider>
            <Suspense fallback={<LoadingState fullPage />}>
              <Routes>
                <Route path="/login" element={<LoginRoute />} />
                <Route path="/signup" element={<SignupRoute />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/terms" element={<Legal />} />
                <Route path="/privacy-policy" element={<Legal />} />
                <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
                <Route path="/legal" element={<Navigate to="/privacy-policy" replace />} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/help" element={<Help />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/verify-callback" element={<VerifyCallback />} />
                
                <Route element={<ProtectedRoute />}>
                  <Route path="/complete-profile" element={<CompleteProfile />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/tournaments" element={<Tournaments />} />
                  <Route path="/tournaments/:id" element={<TournamentDetails />} />
                  <Route path="/tournaments/:id/champion" element={<TournamentChampion />} />
                  <Route path="/matches/:id" element={<MatchDetails />} />
                  <Route path="/matches" element={<Matches />} />
                  <Route path="/streams" element={<LiveStreams />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/community-chat" element={<CommunityChat />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/wallet/history" element={<WalletHistory />} />
                  <Route path="/payment/callback" element={<PaymentCallback />} />
                  <Route path="/profile/wins" element={<WinnerHistory />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/challenge-lobby" element={<ChallengeLobby />} />
                  <Route path="/challenges/:id" element={<ChallengeDetails />} />
                  <Route path="/challenges/:id/chat" element={<ChallengeChat />} />
                </Route>

                <Route element={<ProtectedRoute allowAdminOnly />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/platform" element={<AdminPlatform />} />
                  <Route path="/admin/tournaments" element={<ManageTournaments />} />
                  <Route path="/admin/tournaments/create" element={<CreateTournament />} />
                  <Route path="/admin/tournaments/:id" element={<EditTournament />} />
                  <Route path="/admin/tournaments/:id/manage" element={<ManageTournamentDetails />} />
                  <Route path="/admin/tournaments/:id/schedule" element={<ScheduleTournament />} />
                  <Route path="/admin/tournaments/:id/live" element={<LiveTournament />} />
                  <Route path="/admin/fixtures" element={<AdminFixtures />} />
                  <Route path="/admin/players" element={<AdminPlayers />} />
                  <Route path="/admin/wallet" element={<AdminWallet />} />
                  <Route path="/admin/standings" element={<AdminStandings />} />
                  <Route path="/admin/moderation" element={<Moderation />} />
                  <Route path="/admin/logs" element={<ModerationLogs />} />
                  <Route path="/admin/staff" element={<StaffManagement />} />
                </Route>

                <Route path="/" element={<HomeRoute />} />
              </Routes>
            </Suspense>
          </ThemeProvider>
        </RootPlatformGate>
      </PlatformStatusProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ErrorBoundary>
          <PwaUpdateProvider>
            <AppRoutes />
          </PwaUpdateProvider>
        </ErrorBoundary>
      </Router>
    </QueryClientProvider>
  );
}

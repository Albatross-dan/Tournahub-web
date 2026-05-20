import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoadingState from './components/ui/LoadingState';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import TournamentDetails from './pages/TournamentDetails';
import MatchDetails from './pages/MatchDetails';
import Matches from './pages/Matches';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import Wallet from './pages/Wallet';
import WalletHistory from './pages/WalletHistory';
import WinnerHistory from './pages/WinnerHistory';
import Profile from './pages/Profile';
import TournamentChampion from './pages/TournamentChampion';

// Lazy load admin pages only
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
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

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Suspense fallback={<LoadingState fullPage />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tournaments" element={<Tournaments />} />
                <Route path="/tournaments/:id" element={<TournamentDetails />} />
                <Route path="/tournaments/:id/champion" element={<TournamentChampion />} />
                <Route path="/matches/:id" element={<MatchDetails />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/wallet/history" element={<WalletHistory />} />
                <Route path="/profile/wins" element={<WinnerHistory />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              <Route element={<ProtectedRoute allowAdminOnly />}>
                <Route path="/admin" element={<AdminDashboard />} />
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
              </Route>

              <Route path="/" element={
                <Navigate to="/dashboard" replace />
              } />
            </Routes>
          </Suspense>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

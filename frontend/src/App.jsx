import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute, { RootRedirect } from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import { ROLES } from './utils/constants';

// Pages are code-split; AppLayout provides the Suspense fallback.
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const InternDashboard = lazy(() => import('./pages/intern/InternDashboard'));
const InternTasksPage = lazy(() => import('./pages/intern/InternTasksPage'));
const InternTaskDetailPage = lazy(() => import('./pages/intern/InternTaskDetailPage'));
const InternSubmissionsPage = lazy(() => import('./pages/intern/InternSubmissionsPage'));
const InternFeedbackPage = lazy(() => import('./pages/intern/InternFeedbackPage'));
const InternProgressPage = lazy(() => import('./pages/intern/InternProgressPage'));
const InternsPage = lazy(() => import('./pages/admin/InternsPage'));
const InternDetailPage = lazy(() => import('./pages/admin/InternDetailPage'));
const TasksPage = lazy(() => import('./pages/admin/TasksPage'));
const TaskDetailPage = lazy(() => import('./pages/admin/TaskDetailPage'));
const SubmissionsPage = lazy(() => import('./pages/admin/SubmissionsPage'));
const SubmissionDetailPage = lazy(() => import('./pages/admin/SubmissionDetailPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/shared/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/shared/NotFoundPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
          <Route path="/admin" element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="interns" element={<InternsPage />} />
            <Route path="interns/:id" element={<InternDetailPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="submissions/:id" element={<SubmissionDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={[ROLES.INTERN]} />}>
          <Route path="/intern" element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<InternDashboard />} />
            <Route path="tasks" element={<InternTasksPage />} />
            <Route path="tasks/:id" element={<InternTaskDetailPage />} />
            <Route path="submissions" element={<InternSubmissionsPage />} />
            <Route path="feedback" element={<InternFeedbackPage />} />
            <Route path="progress" element={<InternProgressPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

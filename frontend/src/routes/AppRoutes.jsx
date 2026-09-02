import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Eager load critical initial pages
import Home from '../pages/Home';
import Login from '../pages/Login';

// Lazy load secondary pages for 95+ PageSpeed & instant initial FCP/LCP
const Dashboard = lazy(() => import('../pages/Dashboard'));
const CourseCompletion = lazy(() => import('../pages/certificates/CourseCompletion'));
const Internship = lazy(() => import('../pages/certificates/Internship'));
const CampusAmbassador = lazy(() => import('../pages/certificates/CampusAmbassador'));
const OfferLetter = lazy(() => import('../pages/certificates/OfferLetter'));
const TechOfferLetter = lazy(() => import('../pages/certificates/TechOfferLetter'));
const Verify = lazy(() => import('../pages/Verify'));
const UserManagement = lazy(() => import('../pages/UserManagement'));
const Profile = lazy(() => import('../pages/Profile'));
const EmailTemplates = lazy(() => import('../pages/EmailTemplates'));

// Ultra-lightweight fallback spinner during lazy chunk load
const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Protected Route Guard: Checks if user is logged in
function ProtectedRoute({ children }) {
  const isAuthenticated = sessionStorage.getItem('admin_token') === 'authorized_root_admin';
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Root Admin Only Guard: Restricts User Management strictly to Root Admin email
function RootRoute({ children }) {
  const isAuthenticated = sessionStorage.getItem('admin_token') === 'authorized_root_admin';
  const currentEmail = (sessionStorage.getItem('admin_email') || '').toLowerCase();
  const isRoot = currentEmail === "info@apex.hadescoretech.com";

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isRoot) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify/:certId" element={<Verify />} />

        {/* Protected Admin Routes (Requires Login First) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates/course-completion"
          element={
            <ProtectedRoute>
              <CourseCompletion />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates/internship"
          element={
            <ProtectedRoute>
              <Internship />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates/campus-ambassador"
          element={
            <ProtectedRoute>
              <CampusAmbassador />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates/offer-letter"
          element={
            <ProtectedRoute>
              <OfferLetter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates/tech-offer-letter"
          element={
            <ProtectedRoute>
              <TechOfferLetter />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/email-templates"
          element={
            <ProtectedRoute>
              <EmailTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RootRoute>
              <UserManagement />
            </RootRoute>
          }
        />

        {/* Catch-all redirect to login for unauthenticated or unknown routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

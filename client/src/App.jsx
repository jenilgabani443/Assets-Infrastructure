import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import NotFoundPage from './components/layout/NotFoundPage';
import ForbiddenPage from './components/layout/ForbiddenPage';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AssetsListPage from './pages/assets/AssetsListPage';
import AssetFormPage from './pages/assets/AssetFormPage';
import AssetDetailPage from './pages/assets/AssetDetailPage';
import MaintenanceListPage from './pages/maintenance/MaintenanceListPage';
import AssetMapPage from './pages/map/AssetMapPage';
import ScanQRPage from './pages/scan/ScanQRPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import UsersPage from './pages/users/UsersPage';
import ProfilePage from './pages/profile/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Error Pages */}
            <Route path="/403" element={<ForbiddenPage />} />

            {/* Authenticated Application Routes wrapped in AppLayout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Dashboard (all authenticated users) */}
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Assets (all authenticated users can view; create/edit guarded in page / subroute) */}
                <Route path="/assets" element={<AssetsListPage />} />
                <Route
                  path="/assets/new"
                  element={
                    <ProtectedRoute roles={['admin', 'manager']}>
                      <AssetFormPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/assets/:id/edit"
                  element={
                    <ProtectedRoute roles={['admin', 'manager']}>
                      <AssetFormPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/assets/:id" element={<AssetDetailPage />} />

                {/* Maintenance (all authenticated users) */}
                <Route path="/maintenance" element={<MaintenanceListPage />} />

                {/* GIS Map & QR Scanner */}
                <Route path="/map" element={<AssetMapPage />} />
                <Route path="/scan" element={<ScanQRPage />} />

                {/* Categories (Admin & Manager only) */}
                <Route
                  path="/categories"
                  element={
                    <ProtectedRoute roles={['admin', 'manager']}>
                      <CategoriesPage />
                    </ProtectedRoute>
                  }
                />

                {/* User Management (Admin only) */}
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute roles={['admin']}>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                {/* Profile */}
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* 404 Catch All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Navigation from './components/Navigation'
import LocationRecording from './pages/LocationRecording'
import FindUnit from './pages/FindUnit'
import UnitManagement from './pages/UnitManagement'
import UserManagement from './pages/UserManagement'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import ResetPassword from './pages/ResetPassword'
import FindUnitDetails from './components/FindUnitDetails'
import BottomNav from './components/BottomNav'
import { useState, useEffect } from 'react'

function App() {
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Add/remove modal-open class to document body
  useEffect(() => {
    if (showLocationModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showLocationModal]);

  return (
    <AuthProvider>
      <style>
        {`
          body.modal-open .bottom-nav {
            display: none !important;
          }
          body.modal-open {
            overflow: hidden;
          }
        `}
      </style>
      <div className="min-h-screen bg-gray-50">
        {/* Desktop Navigation */}
        <div className="hidden md:block">
          <Navigation />
        </div>
        
        {/* Main Content */}
        <main className="pb-16 md:pb-0 md:ml-64">
          <Routes>
            <Route path="/" element={<Navigate to="/record-location" replace />} />
            <Route
              path="/record-location"
              element={
                <ProtectedRoute>
                  <LocationRecording setShowLocationModal={setShowLocationModal} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/find-unit"
              element={
                <ProtectedRoute>
                  <FindUnit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/unit/:id"
              element={
                <ProtectedRoute>
                  <FindUnitDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/units"
              element={
                <AdminRoute>
                  <UnitManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/users"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav className="bottom-nav" />
      </div>
    </AuthProvider>
  )
}

export default App

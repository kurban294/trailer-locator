import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Navigation from './components/Navigation'
import LocationRecording from './pages/LocationRecording'
import FindUnit from './pages/FindUnit'
import UnitManagement from './pages/UnitManagement'
import UserManagement from './pages/UserManagement'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

function App() {
  return (
    <AuthProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Navigation />
        <main className="flex-1 w-full lg:pl-64 relative overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/record-location" replace />} />
            <Route
              path="/record-location"
              element={
                <ProtectedRoute>
                  <LocationRecording />
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
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}

export default App

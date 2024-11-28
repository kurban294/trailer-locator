import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import {
  MapPinIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  UsersIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export default function Navigation() {
  const { user, profile, logout, isAdmin } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  if (!user) return null

  const navigation = [
    { 
      name: 'Record Location', 
      href: '/record-location',
      icon: MapPinIcon
    },
    { 
      name: 'Find Unit', 
      href: '/find-unit',
      icon: MagnifyingGlassIcon
    },
    { 
      name: 'Unit Management', 
      href: '/units', 
      adminOnly: true,
      icon: TruckIcon
    },
    { 
      name: 'User Management', 
      href: '/users', 
      adminOnly: true,
      icon: UsersIcon
    },
  ]

  const regularMenuItems = navigation.filter(item => !item.adminOnly)
  const adminMenuItems = navigation.filter(item => item.adminOnly)

  const linkClass = ({ isActive }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? 'bg-red-700 text-white'
        : 'text-gray-100 hover:bg-red-700/50 hover:text-white'
    }`

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg bg-red-600 text-white shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          {isSidebarOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Menu button */}
      <div className="absolute top-0 right-0 -mr-12 pt-2 hidden md:block">
        <button
          type="button"
          className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6 text-white" aria-hidden="true" />
        </button>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 w-64 h-full bg-red-600 transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 lg:z-30 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 bg-red-700">
            <h1 className="text-2xl font-bold text-white">Trailer Locator</h1>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {regularMenuItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={linkClass}
                onClick={() => setIsSidebarOpen(false)}
                end
              >
                <item.icon className="h-6 w-6 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            ))}

            {isAdmin() && adminMenuItems.length > 0 && (
              <>
                <div className="border-t border-red-500 my-4"></div>
                {adminMenuItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={linkClass}
                    onClick={() => setIsSidebarOpen(false)}
                    end
                  >
                    <item.icon className="h-6 w-6 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </>
            )}
          </div>

          {/* User Profile & Logout */}
          <div className="border-t border-red-500">
            <div className="p-4 bg-red-700">
              <div className="px-2">
                <div className="text-sm font-medium text-white">
                  {profile?.first_name} {profile?.last_name}
                </div>
                <div className="text-sm text-red-200">
                  {isAdmin() ? 'Administrator' : 'User'}
                </div>
              </div>
            </div>
            <div className="p-4">
              <button
                onClick={logout}
                className="flex items-center space-x-3 w-full px-4 py-3 text-gray-100 rounded-lg hover:bg-red-700/50 hover:text-white transition-colors"
              >
                <ArrowLeftOnRectangleIcon className="h-6 w-6 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  TruckIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isAdmin } = useAuth();

  // If user is not logged in, don't render the navigation
  if (!user) return null;

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const regularNavItems = [
    { path: '/record-location', icon: HomeIcon, label: 'Record' },
    { path: '/find-unit', icon: MagnifyingGlassIcon, label: 'Find' }
  ];

  const adminNavItems = [
    { path: '/units', icon: TruckIcon, label: 'Units' },
    { path: '/users', icon: UserGroupIcon, label: 'Users' }
  ];

  const navItems = isAdmin() ? [...regularNavItems, ...adminNavItems] : regularNavItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
      <div className={`grid grid-cols-${navItems.length + 1} gap-1`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-2 px-1 ${
                isActive(item.path)
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
        
        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center justify-center py-2 px-1 text-red-600 hover:text-red-800"
        >
          <ArrowRightOnRectangleIcon className="h-6 w-6" />
          <span className="text-xs mt-1">Sign Out</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;

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

  const isActive = (path) => location.pathname === path;

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
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }} className="md:hidden">
      <div style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '64px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: isActive(item.path) ? '#2563eb' : '#4b5563',
                textDecoration: 'none'
              }}
            >
              <Icon style={{ width: '24px', height: '24px' }} />
              <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{item.label}</span>
            </Link>
          );
        })}
        
        <button
          onClick={handleSignOut}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#dc2626',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0
          }}
        >
          <ArrowRightOnRectangleIcon style={{ width: '24px', height: '24px' }} />
          <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Sign Out</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  UserCheck, 
  Calendar, 
  FileText, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const { sidebarOpen, toggleSidebar } = useApp();
  const { user } = useAuth();
  const location = useLocation();
  
  const role = user?.role || 'receptionist';
  // Define base menu per role
  let navigation = [{ name: 'Dashboard', href: '/dashboard', icon: Home }];
  if (role === 'admin') {
    navigation = [
      ...navigation,
      { name: 'Patients', href: '/patients', icon: Users },
      { name: 'Doctors', href: '/doctors', icon: UserCheck },
      { name: 'Appointments', href: '/appointments', icon: Calendar },
      { name: 'Medical Records', href: '/medical-records', icon: FileText },
      { name: 'Medicines', href: '/medicines', icon: FileText },
      { name: 'Users', href: '/users/new', icon: Settings },
      { name: 'Dispensary', href: '/dispensary', icon: FileText },
      { name: 'Profile', href: '/profile', icon: Settings },
    ];
  } else if (role === 'receptionist') {
    navigation = [
      ...navigation,
      { name: 'Patients', href: '/patients', icon: Users },
      { name: 'Appointments', href: '/appointments', icon: Calendar },
      { name: 'Profile', href: '/profile', icon: Settings },
    ];
  } else if (role === 'doctor') {
    navigation = [
      ...navigation,
      { name: 'Appointments', href: '/appointments', icon: Calendar },
      { name: 'Medical Records', href: '/medical-records', icon: FileText },
      { name: 'Profile', href: '/profile', icon: Settings },
    ];
  } else if (role === 'chemist') {
    navigation = [
      ...navigation,
      { name: 'Medicines', href: '/medicines', icon: FileText },
      { name: 'Dispensary', href: '/dispensary', icon: FileText },
      { name: 'Profile', href: '/profile', icon: Settings },
    ];
  } else {
    navigation = [
      ...navigation,
      { name: 'Profile', href: '/profile', icon: Settings },
    ];
  }

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={toggleSidebar}></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Clinic Management</h1>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 ${
                        isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse button for desktop */}
        <div className="absolute bottom-4 left-4 right-4 hidden lg:block">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Collapse
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;


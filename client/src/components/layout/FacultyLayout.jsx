import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../common/Sidebar';
import Navbar from '../common/Navbar';
import { Loader2 } from 'lucide-react';

const FacultyLayout = () => {
  const { faculty, facultyToken, facultyLoading } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (facultyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading SmartLab portal...</p>
        </div>
      </div>
    );
  }

  if (!facultyToken) {
    return <Navigate to="/faculty/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        <Navbar onMobileToggle={() => setIsMobileOpen((prev) => !prev)} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default FacultyLayout;

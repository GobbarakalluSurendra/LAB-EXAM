import React from 'react';
import { Outlet } from 'react-router-dom';

const StudentLayout = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="no-print py-4 text-center text-xs text-slate-500 border-t border-slate-200/60 bg-white">
        SmartLab – Digital Lab Examination Management System &bull; Secure Station Mode
      </footer>
    </div>
  );
};

export default StudentLayout;

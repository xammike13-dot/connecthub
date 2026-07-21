import React from 'react';
import Button from '../components/ui/Button';

const AdminSettingsPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Admin Control Settings</h2>
        <p className="text-slate-400 text-sm">
          Platform-wide administrative controls, API throttle thresholds, and global commission rate settings.
        </p>
        <div className="bg-slate-950 p-4 rounded-lg text-left text-xs text-slate-500 font-mono space-y-1">
          <p>Commission Rate: 10%</p>
          <p>VAPID push configurations: Active</p>
          <p>Kenyan Timezone (EAT): Nairobi</p>
        </div>
        <Button variant="primary" className="w-full font-bold">
          Save Configuration
        </Button>
      </div>
    </div>
  );
};

export default AdminSettingsPage;

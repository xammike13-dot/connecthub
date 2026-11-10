import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BottomNav from '../components/BottomNav';

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Persistent Sticky Top Header */}
      <Navbar />

      {/* Main Content with top padding (header clearance) & bottom padding (mobile bottom nav clearance) */}
      <main className="flex-1 pt-[56px] sm:pt-[64px] md:pt-[68px] pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Full Trust-Building Footer: Desktop & Tablet Only (Hidden on Mobile) */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Native App-Style Mobile Bottom Navigation Bar (Mobile Only) */}
      <BottomNav />
    </div>
  );
};

export default MainLayout;

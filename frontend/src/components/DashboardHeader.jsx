import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { notificationAPI } from '../services/api';
import { Check, Trash2, CheckCheck, Menu, HelpCircle, Headphones, Bell, X, Phone, Mail, FileText, CheckCircle2, MessageCircle } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

const DashboardHeader = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { unreadCount } = useSocket();
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 px-4 md:px-6 py-3.5 shadow-sm">
        <div className="flex items-center justify-between">

          {/* Left: Hamburger & Logo */}
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile/Tablet */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Open sidebar"
            >
              <Menu size={22} className="stroke-[2.5]" />
            </button>

            {/* Logo - exact match to Sidebar logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8.5 h-8.5 bg-blue-600 rounded-lg flex items-center justify-center shadow-blue transition-transform group-hover:scale-105">
                <span className="text-white font-black text-lg">C</span>
              </div>
              <span className="text-xl font-extrabold text-neutral-900 tracking-tight group-hover:text-blue-600 transition-colors">
                ConnectHub
              </span>
            </Link>
          </div>

          {/* Right: Help, Support, Notifications, Avatar */}
          <div className="flex items-center gap-1.5 md:gap-3">

            {/* Help Center Icon with text tooltip/trigger */}
            <button
              onClick={() => {
                if (user?.role && ['customer', 'landlord', 'business', 'rider', 'caretaker'].includes(user.role)) {
                  navigate(`/${user.role}/help`);
                } else {
                  setHelpOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-semibold text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Help Center"
            >
              <HelpCircle size={18} className="text-neutral-500 hover:text-blue-600" />
              <span className="hidden sm:inline">Help Center</span>
            </button>

            {/* Support Center Icon with text tooltip/trigger */}
            <button
              onClick={() => setSupportOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-semibold text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Support Center"
            >
              <Headphones size={18} className="text-neutral-500 hover:text-blue-600" />
              <span className="hidden sm:inline">Support</span>
            </button>

            {/* Notifications Shortcut (Direct Navigation) */}
            <button
              onClick={() => navigate(`/${user?.role || 'customer'}/notifications`)}
              className="relative p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none"
              aria-label="Notifications"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Divider */}
            <span className="w-[1px] h-5 bg-neutral-200 mx-1"></span>

            {/* User Profile Avatar */}
            <div className="flex items-center gap-2.5 pl-1.5">
              <div className="text-right hidden lg:block">
                <p className="font-bold text-neutral-800 text-xs leading-none">{user?.name}</p>
                <p className="text-[10px] text-neutral-400 font-semibold capitalize mt-1 leading-none">{user?.role}</p>
              </div>
              <Link
                to={`/${user?.role}/settings`}
                className="w-9.5 h-9.5 bg-blue-100 hover:bg-blue-200 transition-colors rounded-full flex items-center justify-center border border-blue-200 cursor-pointer"
                title="Go to settings"
              >
                <span className="text-blue-700 font-extrabold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </Link>
            </div>

          </div>
        </div>
      </header>

      {/* Interactive Help Center Modal */}
      <Modal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="ConnectHub Help Center"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary-600">
            Welcome to the ConnectHub self-service Help Center. Select from the frequently asked questions or explore user manuals.
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 bg-secondary-50 hover:bg-secondary-100/70 border border-secondary-200/60 rounded-xl transition-all cursor-pointer">
              <h4 className="font-bold text-sm text-secondary-800 flex items-center gap-2">
                <FileText size={16} className="text-primary-600" />
                How do I publish new products?
              </h4>
              <p className="text-xs text-secondary-500 mt-1.5 leading-relaxed">
                Go to the Products tab, click "Add Product", fill out the forms with specifications, set stock level, upload photos, and hit save to go live immediately.
              </p>
            </div>

            <div className="p-3.5 bg-secondary-50 hover:bg-secondary-100/70 border border-secondary-200/60 rounded-xl transition-all cursor-pointer">
              <h4 className="font-bold text-sm text-secondary-800 flex items-center gap-2">
                <FileText size={16} className="text-primary-600" />
                When are payouts processed?
              </h4>
              <p className="text-xs text-secondary-500 mt-1.5 leading-relaxed">
                Once a customer confirms delivery of their order, funds are instantly transferred into your online Wallet and can be withdrawn directly via M-Pesa.
              </p>
            </div>

            <div className="p-3.5 bg-secondary-50 hover:bg-secondary-100/70 border border-secondary-200/60 rounded-xl transition-all cursor-pointer">
              <h4 className="font-bold text-sm text-secondary-800 flex items-center gap-2">
                <FileText size={16} className="text-primary-600" />
                How to manage order cancellations?
              </h4>
              <p className="text-xs text-secondary-500 mt-1.5 leading-relaxed">
                If an item is out of stock, you can cancel an order using the Cancel button. This automatically triggers a prompt notification to the client.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-secondary-100">
            <Button variant="primary" onClick={() => setHelpOpen(false)}>
              Got it, thanks!
            </Button>
          </div>
        </div>
      </Modal>

      {/* Interactive Support Center Modal */}
      <Modal
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        title="Customer Support Desk"
        size="sm"
      >
        <div className="space-y-4 text-center py-2">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 mb-2 border border-blue-200">
            <Headphones size={26} />
          </div>

          <div>
            <h3 className="font-extrabold text-secondary-800 text-lg">Need Immediate Assistance?</h3>
            <p className="text-sm text-secondary-500 mt-1">Our support agents are available 24/7 to help resolve any operational concerns.</p>
          </div>

          <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-200/60 space-y-3 text-left text-sm mt-3">
            <a href="tel:0748459757" className="flex items-center gap-3 hover:bg-neutral-100 p-1.5 rounded-lg transition-colors block">
              <Phone size={16} className="text-blue-600" />
              <div>
                <p className="font-semibold text-secondary-700 text-xs">Call Hotline</p>
                <p className="font-bold text-secondary-800 text-sm mt-0.5">0748459757</p>
              </div>
            </a>

            <a href="mailto:connecthub387@gmail.com" className="flex items-center gap-3 hover:bg-neutral-100 p-1.5 rounded-lg transition-colors block">
              <Mail size={16} className="text-blue-600" />
              <div>
                <p className="font-semibold text-secondary-700 text-xs">Email Desk</p>
                <p className="font-bold text-secondary-800 text-sm mt-0.5 break-all">connecthub387@gmail.com</p>
              </div>
            </a>

            <a href="https://wa.me/254748459757" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:bg-neutral-100 p-1.5 rounded-lg transition-colors block">
              <MessageCircle size={16} className="text-green-600" />
              <div>
                <p className="font-semibold text-secondary-700 text-xs">WhatsApp Chat</p>
                <p className="font-bold text-secondary-800 text-sm mt-0.5">0748459757</p>
              </div>
            </a>
          </div>

          <div className="pt-4 border-t border-secondary-100 flex justify-center gap-3">
            <Button variant="outline" onClick={() => setSupportOpen(false)}>
              Close Window
            </Button>
            <Button variant="primary" onClick={() => {
              setSupportOpen(false);
              navigate(`/${user?.role}/settings`);
            }}>
              Go to Profile Settings
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DashboardHeader;

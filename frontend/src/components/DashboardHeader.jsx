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
  const { notifications, unreadCount, markNotificationsRead } = useSocket();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const visibleNotifications = notifications?.slice(0, 4) || [];

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      markNotificationsRead([notificationId]);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationAPI.delete(notificationId);
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      const unreadIds = notifications.filter(n => !n.read).map(n => n._id || n.id);
      markNotificationsRead(unreadIds);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification._id || notification.id);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

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
                if (user?.role && ['customer', 'landlord', 'business', 'rider'].includes(user.role)) {
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

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none"
                aria-expanded={notificationsOpen}
                aria-haspopup="true"
                aria-label="Notifications"
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden z-[9999]">
                  <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
                    <h3 className="font-bold text-neutral-900 text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                      >
                        <CheckCheck size={14} />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {visibleNotifications.length === 0 ? (
                      <div className="p-6 text-center text-neutral-400 text-sm">
                        No notifications available.
                      </div>
                    ) : (
                      visibleNotifications.map((notification) => (
                        <div
                          key={notification._id || notification.id}
                          className={`p-4 border-b border-neutral-100 hover:bg-neutral-50/50 cursor-pointer transition-colors ${notification.read ? 'bg-white' : 'bg-blue-50/40 border-l-3 border-l-blue-500'
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0" onClick={() => handleNotificationClick(notification)}>
                              <p className={`text-xs ${notification.read ? 'text-neutral-600' : 'font-bold text-neutral-900'} truncate`}>
                                {notification.title || notification.message}
                              </p>
                              <p className="text-neutral-500 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">{notification.message}</p>
                              <p className="text-neutral-400 text-[10px] mt-1 font-semibold">{formatTime(notification.createdAt)}</p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {!notification.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification._id || notification.id);
                                  }}
                                  className="p-1 text-neutral-400 hover:text-blue-600 hover:bg-blue-100/50 rounded transition-colors"
                                  title="Mark as read"
                                >
                                  <Check size={13} />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification._id || notification.id);
                                }}
                                className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-100/50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-neutral-200 bg-neutral-50 text-center">
                    <Link
                      to={`/${user?.role}/notifications`}
                      className="text-blue-600 text-xs font-bold hover:text-blue-700 inline-block"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

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

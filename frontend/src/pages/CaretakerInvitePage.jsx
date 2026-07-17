import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/apiClient';
import { Loader2, CheckCircle, ShieldAlert, KeyRound, User, Mail, Phone, Lock } from 'lucide-react';
import Button from '../components/ui/Button';

const CaretakerInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, authenticateWithToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [activeTab, setActiveTab] = useState('register'); // 'register' or 'login'

  // Forms states
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchInviteDetails = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/caretakers/invite/${token}`);
        setInvitation(data.data);
        // Pre-populate caretaker name/phone if available
        setRegForm(prev => ({
          ...prev,
          name: data.data.caretakerName || '',
          phone: data.data.caretakerPhone || '',
        }));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to verify invitation link.');
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [token]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post(`/caretakers/invite/${token}/register`, regForm);
      authenticateWithToken(data.token, data.user);
      navigate('/caretaker/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register caretaker.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // 1. Log in existing user
      const loginRes = await api.post('/auth/login', loginForm);
      if (loginRes.data.success) {
        const tokenVal = loginRes.data.token;
        const userObj = loginRes.data.user;

        // Apply Auth header manually for the immediate subsequent call
        api.defaults.headers.common['Authorization'] = `Bearer ${tokenVal}`;

        // 2. Accept the invitation under this user
        const acceptRes = await api.post(`/caretakers/invite/${token}/accept`);
        authenticateWithToken(tokenVal, acceptRes.data.user);
        navigate('/caretaker/dashboard');
      } else {
        throw new Error(loginRes.data.message || 'Login failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to complete login & accept.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptLoggedIn = async () => {
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post(`/caretakers/invite/${token}/accept`);
      authenticateWithToken(localStorage.getItem('token'), data.user);
      navigate('/caretaker/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-neutral-600 font-semibold mt-4">Verifying invitation token...</p>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 text-center border border-red-100">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-black text-neutral-900 mt-4">Invalid Invitation</h2>
          <p className="text-neutral-500 mt-2">{error}</p>
          <div className="mt-6">
            <Button variant="primary" fullWidth onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white text-center">
          <CheckCircle className="w-16 h-16 text-white/90 mx-auto animate-bounce" />
          <h1 className="text-2xl font-extrabold tracking-tight mt-3">ConnectHub Caretaker Invite</h1>
          <p className="text-blue-100 text-sm mt-1">
            You have been invited by <span className="font-bold">{invitation?.landlord?.name}</span> to manage <span className="font-bold">{invitation?.landlord?.propertyName}</span>.
          </p>
        </div>

        <div className="p-6 md:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isAuthenticated ? (
            <div className="text-center space-y-4">
              <p className="text-neutral-600 text-sm">
                You are currently logged in as <span className="font-bold">{user?.name}</span> ({user?.email}).
              </p>
              <p className="text-neutral-500 text-xs">
                Accepting this invitation will switch your current role to <span className="font-semibold text-blue-600">Caretaker</span> and link your account to <span className="font-semibold">{invitation?.landlord?.name}</span>.
              </p>
              <div className="pt-4 flex flex-col gap-2">
                <Button variant="primary" fullWidth loading={submitting} onClick={handleAcceptLoggedIn}>
                  Accept Invitation
                </Button>
                <Button variant="outline" fullWidth onClick={() => {
                  localStorage.removeItem('token');
                  window.location.reload();
                }}>
                  Sign out & use another account
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {/* Tab Toggles */}
              <div className="flex border-b border-neutral-200 mb-6">
                <button
                  onClick={() => setActiveTab('register')}
                  className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'register' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  Create New Account
                </button>
                <button
                  onClick={() => setActiveTab('login')}
                  className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'login' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  Log In & Accept
                </button>
              </div>

              {/* REGISTER TAB */}
              {activeTab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                      <input
                        type="text"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="John Doe"
                        value={regForm.name}
                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                      <input
                        type="email"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="caretaker@gmail.com"
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                      <input
                        type="tel"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0794603837"
                        value={regForm.phone}
                        onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" variant="primary" fullWidth loading={submitting}>
                      Register & Accept Invitation
                    </Button>
                  </div>
                </form>
              )}

              {/* LOGIN TAB */}
              {activeTab === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 leading-relaxed">
                    Logging in with an existing account will switch your role to <span className="font-bold">Caretaker</span> and assign you to manage this landlord's properties.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                      <input
                        type="email"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="caretaker@gmail.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                      <input
                        type="password"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" variant="primary" fullWidth loading={submitting}>
                      Log In & Accept Invitation
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaretakerInvitePage;

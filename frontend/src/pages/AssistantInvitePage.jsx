import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assistantAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Loader2, ShieldCheck, Mail, Phone, Lock, User, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';

const AssistantInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, authenticateWithToken, logout } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Registration form state (for logged out users)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    const fetchInviteDetails = async () => {
      try {
        setLoading(true);
        const { data } = await assistantAPI.getInvitation(token);
        setInvite(data.data);
        if (data.data.assistantName) {
          setFormData(prev => ({ ...prev, name: data.data.assistantName }));
        }
        if (data.data.assistantPhone) {
          setFormData(prev => ({ ...prev, phone: data.data.assistantPhone }));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'This invitation has expired or is invalid.');
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [token]);

  const handleRegisterAndAccept = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      toastError('All registration fields are required.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await assistantAPI.registerAndAccept(token, formData);
      authenticateWithToken(data.token, data.user);
      toastSuccess('Account created and invitation accepted successfully!');
      navigate('/assistant/dashboard');
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptExisting = async () => {
    setSubmitting(true);
    try {
      const { data } = await assistantAPI.acceptExisting(token);
      authenticateWithToken(localStorage.getItem('token'), data.user);
      toastSuccess('Invitation accepted! You are now an Assistant.');
      navigate('/assistant/dashboard');
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoutAndSwitch = async () => {
    if (window.confirm('Logging out will clear your current session so you can register a new assistant account. Proceed?')) {
      await logout();
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-neutral-500 font-medium mt-3">Validating business invitation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-3xl shadow-md border border-neutral-200 max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-150 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 rotate-180" />
          </div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Invitation Error</h2>
          <p className="text-neutral-500 text-sm leading-relaxed">{error}</p>
          <Button variant="primary" onClick={() => navigate('/')} className="w-full">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-3xl shadow-md border border-neutral-200 max-w-md w-full overflow-hidden">
        {/* Banner */}
        <div className="bg-blue-600 p-8 text-center text-white space-y-2">
          <CheckCircle2 className="w-12 h-12 mx-auto" />
          <h2 className="text-2xl font-black tracking-tight">ConnectHub Invitation</h2>
          <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">
            Join as Business Assistant
          </p>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center space-y-1">
            <p className="text-neutral-500 text-sm font-medium">You have been invited to manage:</p>
            <h3 className="text-xl font-black text-neutral-900">{invite?.business?.businessName}</h3>
            <p className="text-neutral-400 text-xs font-medium">Owner: {invite?.business?.name}</p>
          </div>

          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center space-y-1">
                <p className="text-xs text-amber-700 font-bold">
                  Logged in as <span className="font-black text-amber-900">{user?.name}</span>
                </p>
                <p className="text-[11px] text-amber-600 leading-normal">
                  Accepting this invitation will associate your account and update your role to Assistant for this business.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={handleAcceptExisting}
                disabled={submitting}
                className="w-full py-3"
              >
                {submitting ? 'Accepting Invitation...' : 'Accept & Enter Dashboard'}
              </Button>

              <button
                onClick={handleLogoutAndSwitch}
                className="w-full text-center text-xs text-red-600 hover:underline font-bold"
              >
                Log Out to register a different account
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegisterAndAccept} className="space-y-4">
              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-neutral-400">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Jane Doe"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-neutral-400">
                      <Phone size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 07XXXXXXXX"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-neutral-400">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. Jane@gmail.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Create Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-neutral-400">
                      <Lock size={16} />
                    </span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                type="submit"
                disabled={submitting}
                className="w-full py-3 mt-2"
              >
                {submitting ? 'Creating Account & Accepting...' : 'Register & Join Business'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssistantInvitePage;

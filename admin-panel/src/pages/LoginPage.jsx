import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ShieldAlert, KeyRound, Mail } from 'lucide-react';

const LoginPage = () => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await login(email, password);

      if (res.success) {
        const user = res.user;
        if (user && user.role === 'admin') {
          toast.success('Successfully logged into Admin Panel!');
          navigate('/dashboard');
        } else {
          // Non-admin user logging in
          await logout();
          setErrorMsg('Access denied. Only platform administrators can log in here.');
          toast.error('Forbidden: Admin access required.');
        }
      } else {
        setErrorMsg(res.message || 'Invalid credentials or login failed.');
        toast.error(res.message || 'Login failed.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto shadow-blue">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white">Admin Control</h2>
          <p className="text-slate-400 text-sm">
            Sign in to access ConnectHub's admin panel
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm p-4 rounded-lg flex items-center gap-3">
            <ShieldAlert size={18} className="flex-shrink-0 text-red-500" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-slate-300 font-medium text-sm block">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail size={18} />
              </span>
              <Input
                type="email"
                placeholder="admin@connecthub.website"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 caret-white"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium text-sm block">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <KeyRound size={18} />
              </span>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 caret-white"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full bg-blue-600 hover:bg-blue-700 py-3 font-bold transition-all"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

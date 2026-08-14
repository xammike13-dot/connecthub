import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, ShieldAlert, CheckCircle, Trash2, Eye } from 'lucide-react';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [search, role]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsers({ search, role });
      setUsers(res.data.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateUser = async (user) => {
    try {
      await adminAPI.updateUserStatus(user._id, { isActive: true });
      alert('Account activated successfully.');
      setUsers(users.map(u => u._id === user._id ? { ...u, isActive: true } : u));
    } catch (err) {
      console.error('Failed to activate account:', err);
      alert('Failed to activate account. Please try again.');
    }
  };

  const handleSuspendUser = async (user) => {
    if (!window.confirm('Are you sure you want to suspend this account?')) return;
    try {
      await adminAPI.updateUserStatus(user._id, { isActive: false });
      alert('Account suspended successfully.');
      setUsers(users.map(u => u._id === user._id ? { ...u, isActive: false } : u));
    } catch (err) {
      console.error('Failed to suspend account:', err);
      alert('Failed to suspend account. Please try again.');
    }
  };

  const handleVerifyEmail = async (user) => {
    try {
      await adminAPI.verifyUserEmail(user._id);
      alert('Email verified successfully.');
      setUsers(users.map(u => u._id === user._id ? { ...u, emailVerified: true } : u));
    } catch (err) {
      console.error('Failed to verify email:', err);
      alert('Failed to verify email. Please try again.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this account? This action cannot be undone.')) return;
    try {
      await adminAPI.deleteUser(userId);
      alert('Account deleted successfully.');
      setUsers(users.filter(u => u._id !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">User Management</h1>
          <p className="text-slate-400 mt-1">Manage and audit registered ConnectHub user accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={18} className="text-slate-500" />}
          className="bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="business">Business Owner</option>
          <option value="landlord">Landlord</option>
          <option value="rider">Rider</option>
          <option value="caretaker">Caretaker</option>
          <option value="assistant">Assistant</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-medium text-white">{u.name}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">{u.phone || 'N/A'}</td>
                  <td className="p-4 capitalize">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                        u.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                        u.emailVerified ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {u.emailVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap justify-center gap-2">
                      {u.isActive ? (
                        <Button
                          variant="danger"
                          size="xs"
                          onClick={() => handleSuspendUser(u)}
                          title="Suspend Account"
                          className="flex items-center gap-1"
                        >
                          <ShieldAlert size={14} />
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          variant="success"
                          size="xs"
                          onClick={() => handleActivateUser(u)}
                          title="Activate Account"
                          className="flex items-center gap-1"
                        >
                          <CheckCircle size={14} />
                          Activate
                        </Button>
                      )}

                      {!u.emailVerified && (
                        <Button
                          variant="warning"
                          size="xs"
                          onClick={() => handleVerifyEmail(u)}
                          title="Verify Email"
                          className="flex items-center gap-1"
                        >
                          <CheckCircle size={14} />
                          Verify Email
                        </Button>
                      )}

                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => handleDeleteUser(u._id)}
                        title="Delete Account"
                        className="flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-semibold">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;

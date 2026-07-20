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

  const handleToggleStatus = async (user) => {
    try {
      const updatedStatus = !user.isActive;
      await adminAPI.updateUserStatus(user._id, { isActive: updatedStatus });
      setUsers(users.map(u => u._id === user._id ? { ...u, isActive: updatedStatus } : u));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you absolutely sure you want to delete this user? This action soft-deletes the user profile.')) return;
    try {
      await adminAPI.deleteUser(userId);
      setUsers(users.filter(u => u._id !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
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
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      u.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                      {u.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant={u.isActive ? 'danger' : 'success'}
                        size="xs"
                        onClick={() => handleToggleStatus(u)}
                        title={u.isActive ? 'Suspend User' : 'Reactivate User'}
                        className="flex items-center gap-1"
                      >
                        {u.isActive ? <ShieldAlert size={14} /> : <CheckCircle size={14} />}
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </Button>
                      <button
                        onClick={() => handleDeleteUser(u._id)}
                        className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </button>
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

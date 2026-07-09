import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, walletAPI } from '../services/api';
import Button from '../components/ui/Button';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/ui/Modal';
import PasswordInput from '../components/ui/PasswordInput';

const LandlordSettings = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Account Settings
  const [accountForm, setAccountForm] = useState({
    email: '',
    phone: '',
  });

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });


  // Payment Settings
  const [withdrawalNumber, setWithdrawalNumber] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Danger Zone Modals
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (user) {
      setAccountForm({
        email: user.email || '',
        phone: user.phone || '',
      });
      setWithdrawalNumber(user.withdrawalNumber || '');
      setLoading(false);
    }
  }, [user]);

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    setAccountForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  const handleSaveAccount = async () => {
    if (!accountForm.email.trim() || !accountForm.email.includes('@')) {
      addToast('Valid email is required', 'error');
      return;
    }

    setSaving(true);
    
    try {
      await authAPI.updateProfile({
        email: accountForm.email.trim(),
        phone: accountForm.phone.trim(),
      });
      
      addToast('Account information updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update account:', error);
      addToast(error.response?.data?.message || 'Failed to update account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword) {
      addToast('Current password is required', 'error');
      return;
    }
    
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      addToast('New password must be at least 6 characters', 'error');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    setSaving(true);
    
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      addToast('Password updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update password:', error);
      addToast(error.response?.data?.message || 'Failed to update password', 'error');
    } finally {
      setSaving(false);
    }
  };


  const handleSavePayment = async () => {
    setPaymentLoading(true);
    try {
      await authAPI.updateProfile({
        withdrawalNumber: withdrawalNumber.trim(),
      });
      addToast('Payment settings updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update payment settings:', error);
      addToast(error.response?.data?.message || 'Failed to update payment settings', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to logout from all devices?')) {
      return;
    }

    setSaving(true);
    try {
      await authAPI.logoutAllDevices();
      addToast('Logged out from all devices successfully', 'success');
      logout();
    } catch (error) {
      console.error('Failed to logout from all devices:', error);
      addToast(error.response?.data?.message || 'Failed to logout from all devices', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (confirmText !== 'DEACTIVATE') {
      addToast('Please type DEACTIVATE to confirm', 'error');
      return;
    }

    setSaving(true);
    try {
      await authAPI.deactivateAccount();
      addToast('Account deactivated successfully', 'success');
      logout();
    } catch (error) {
      console.error('Failed to deactivate account:', error);
      addToast(error.response?.data?.message || 'Failed to deactivate account', 'error');
    } finally {
      setSaving(false);
      setDeactivateModalOpen(false);
      setConfirmText('');
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      addToast('Please type DELETE to confirm', 'error');
      return;
    }

    const password = prompt('Please enter your password to confirm deletion:');
    if (!password) {
      addToast('Password is required', 'error');
      return;
    }

    setSaving(true);
    try {
      await authAPI.deleteAccount(password);
      addToast('Account deleted successfully', 'success');
      logout();
    } catch (error) {
      console.error('Failed to delete account:', error);
      addToast(error.response?.data?.message || 'Failed to delete account', 'error');
    } finally {
      setSaving(false);
      setDeleteModalOpen(false);
      setConfirmText('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-secondary-800">Account Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              value={accountForm.email}
              onChange={handleAccountChange}
              className="input-field"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={accountForm.phone}
              onChange={handleAccountChange}
              className="input-field"
              placeholder="+254..."
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveAccount}
              variant="primary"
              disabled={saving}
              isLoading={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-secondary-800">Change Password</h2>
        </div>
        
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Current Password</label>
            <PasswordInput
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">New Password</label>
            <PasswordInput
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              placeholder="Enter new password (min 6 characters)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Confirm New Password</label>
            <PasswordInput
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Confirm new password"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              isLoading={saving}
            >
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>

      {/* Security Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.58 9 12 5.176-1.42 9-6.409 9-12a12.02 12.02 0 00-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-secondary-800">Security Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-secondary-500">Last Login</p>
              <p className="font-medium text-secondary-800">
                {user?.lastLogin 
                  ? new Date(user.lastLogin).toLocaleString() 
                  : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-sm text-secondary-500">Active Sessions</p>
              <p className="font-medium text-secondary-800">
                {user?.sessions?.length || 1} {user?.sessions?.length === 1 ? '(Current)' : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-4 border-t border-secondary-200">
            <Button
              variant="outline"
              onClick={() => addToast('Two-factor authentication coming soon', 'info')}
            >
              Enable Two-Factor Authentication
            </Button>
            <Button
              variant="outline"
              onClick={handleLogoutAll}
            >
              Logout From All Devices
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-secondary-800">Payment Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">M-Pesa Withdrawal Number</label>
            <input
              type="tel"
              value={withdrawalNumber}
              onChange={(e) => setWithdrawalNumber(e.target.value)}
              className="input-field"
              placeholder="+2547..."
            />
            <p className="text-sm text-secondary-500 mt-1">
              This is the number where your withdrawals will be sent
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSavePayment}
              variant="primary"
              disabled={paymentLoading}
              isLoading={paymentLoading}
            >
              {paymentLoading ? 'Saving...' : 'Update Payment Details'}
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card p-6 border-2 border-red-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-800">Danger Zone</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-secondary-800">Deactivate Account</p>
              <p className="text-sm text-secondary-500">Your account will be temporarily disabled</p>
            </div>
            <Button
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50"
              onClick={() => setDeactivateModalOpen(true)}
            >
              Deactivate
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-secondary-800">Delete Account</p>
              <p className="text-sm text-secondary-500">Permanently delete your account and all data</p>
            </div>
            <Button
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50"
              onClick={() => setDeleteModalOpen(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Deactivate Account Modal */}
      <Modal
        isOpen={deactivateModalOpen}
        onClose={() => {
          setDeactivateModalOpen(false);
          setConfirmText('');
        }}
        title="Deactivate Account"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Are you sure you want to deactivate your account? This action can be reversed by contacting support.
          </p>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Type <span className="font-mono bg-secondary-100 px-2 py-1 rounded">DEACTIVATE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="input-field"
              placeholder="DEACTIVATE"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              onClick={() => {
                setDeactivateModalOpen(false);
                setConfirmText('');
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeactivateAccount}
              variant="primary"
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
              isLoading={saving}
            >
              {saving ? 'Deactivating...' : 'Deactivate Account'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setConfirmText('');
        }}
        title="Delete Account"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-red-600 font-medium">
            Warning: This action cannot be undone!
          </p>
          <p className="text-secondary-600">
            All your data including properties, bookings, and transaction history will be permanently deleted.
          </p>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Type <span className="font-mono bg-secondary-100 px-2 py-1 rounded">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="input-field"
              placeholder="DELETE"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              onClick={() => {
                setDeleteModalOpen(false);
                setConfirmText('');
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              variant="primary"
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
              isLoading={saving}
            >
              {saving ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LandlordSettings;

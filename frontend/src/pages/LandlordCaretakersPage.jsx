import { useEffect, useState } from 'react';
import api from '../services/apiClient';
import {
  Users, UserPlus, Trash2, ShieldAlert, CheckCircle, Clock,
  Copy, Share2, Mail, Phone, Loader2, Power, RefreshCw
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/Toast';

const LandlordCaretakersPage = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [caretakers, setCaretakers] = useState([]);
  const [invitations, setInvitations] = useState([]);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', phone: '' });
  const [generatedLink, setGeneratedLink] = useState('');
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchCaretakersData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/caretakers');
      setCaretakers(data.data.caretakers || []);
      setInvitations(data.data.invitations || []);
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to fetch caretakers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaretakersData();
  }, []);

  const handleGenerateInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      const { data } = await api.post('/caretakers/invite', {
        caretakerName: inviteForm.name,
        caretakerPhone: inviteForm.phone
      });
      setGeneratedLink(data.data.inviteLink);
      toastSuccess('Invitation link generated!');
      fetchCaretakersData();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to generate invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveCaretaker = async (id) => {
    if (!window.confirm('Are you sure you want to remove this caretaker? They will lose access to all your properties.')) {
      return;
    }
    try {
      await api.delete(`/caretakers/${id}`);
      toastSuccess('Caretaker removed successfully');
      fetchCaretakersData();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to remove caretaker.');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await api.patch(`/caretakers/${id}/status`, { status: nextStatus });
      toastSuccess(`Caretaker status updated to ${nextStatus}`);
      fetchCaretakersData();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update caretaker status.');
    }
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      const { data } = await api.post(`/caretakers/${invitationId}/resend`);
      setInviteForm({ name: data.data.caretakerName || '', phone: data.data.caretakerPhone || '' });
      setGeneratedLink(data.data.inviteLink);
      setShowInviteModal(true);
      toastSuccess('Invitation link regenerated successfully.');
      fetchCaretakersData();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to regenerate invitation link.');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toastSuccess('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-neutral-500 font-medium mt-3">Loading Caretaker settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600 w-7 h-7" />
            Caretakers & Staff
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Authorize operational personnel to publish and manage your rentals without accessing your wallet.
          </p>
        </div>
        <Button variant="primary" onClick={() => {
          setGeneratedLink('');
          setInviteForm({ name: '', phone: '' });
          setShowInviteModal(true);
        }}>
          <UserPlus className="w-4 h-4 mr-1.5" /> Add Caretaker
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Caretakers List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-neutral-200 bg-slate-50/50">
              <h2 className="font-bold text-neutral-900">Active Caretakers</h2>
            </div>

            <div className="p-5 divide-y divide-neutral-100">
              {caretakers.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-sm">
                  You don't have any active caretakers assigned yet.
                </div>
              ) : (
                caretakers.map((c) => (
                  <div key={c.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-neutral-900">{c.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {c.status === 'active' ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-neutral-500">
                        <p className="flex items-center gap-1.5"><Mail size={13} /> {c.email}</p>
                        <p className="flex items-center gap-1.5"><Phone size={13} /> {c.phone}</p>
                        <p className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                          Added on {new Date(c.addedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(c.id, c.status)}
                        className="flex items-center gap-1"
                      >
                        <Power size={13} /> {c.status === 'active' ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveCaretaker(c.id)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Caretaker Invitations */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-neutral-200 bg-slate-50/50">
            <h2 className="font-bold text-neutral-900">Pending Invitations</h2>
          </div>

          <div className="p-5 divide-y divide-neutral-100">
            {invitations.filter(i => i.status === 'pending' || i.status === 'expired').length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-sm">
                No pending or expired invitations.
              </div>
            ) : (
              invitations
                .filter(i => i.status === 'pending' || i.status === 'expired')
                .map((i) => (
                  <div key={i.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-neutral-900 text-sm">
                          {i.caretakerName || 'Unnamed Invite'}
                        </p>
                        {i.caretakerPhone && (
                          <p className="text-xs text-neutral-500 mt-0.5">{i.caretakerPhone}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        i.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {i.status === 'pending' ? 'Pending' : 'Expired'}
                      </span>
                    </div>

                    <p className="text-[10px] text-neutral-400">
                      Generated: {new Date(i.createdAt).toLocaleDateString()}
                    </p>

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setGeneratedLink(i.inviteLink);
                          setShowInviteModal(true);
                        }}
                        className="text-xs py-1"
                      >
                        View Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvitation(i.id)}
                        className="text-xs py-1 flex items-center gap-1"
                      >
                        <RefreshCw size={11} /> Regenerate
                      </Button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Caretaker"
        size="sm"
      >
        {!generatedLink ? (
          <form onSubmit={handleGenerateInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Caretaker Name (Optional)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="e.g. Kelvin Mwangi"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Caretaker Phone (Optional)</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="e.g. 0748459757"
                value={inviteForm.phone}
                onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
              />
            </div>

            <div className="pt-4 flex gap-3 border-t">
              <Button variant="outline" fullWidth onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth loading={inviting}>
                Generate Invitation
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200 shadow-sm">
              <CheckCircle size={24} />
            </div>

            <div>
              <h3 className="font-extrabold text-neutral-900 text-base">Secure Invitation Link Ready!</h3>
              <p className="text-xs text-neutral-500 mt-1">Copy and share this link with your caretaker. It will expire in 7 days.</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-neutral-200 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="w-full bg-transparent border-none text-xs text-neutral-700 focus:outline-none font-medium truncate select-all"
              />
              <button
                onClick={handleCopyLink}
                className="text-neutral-500 hover:text-blue-600 p-1.5 hover:bg-white rounded-lg transition-all"
                title="Copy Link"
              >
                <Copy size={15} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hi, I would like to invite you to join ConnectHub as a caretaker to manage my properties. Use this secure invitation link to register or sign in: ${generatedLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-all border border-green-100 group text-green-600"
              >
                <Share2 size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold mt-1.5">WhatsApp</span>
              </a>

              <a
                href={`mailto:?subject=${encodeURIComponent('ConnectHub Caretaker Invitation')}&body=${encodeURIComponent(`Hi,\n\nI would like to invite you to join ConnectHub as a caretaker to manage my properties. Use this secure invitation link to register or sign in:\n\n${generatedLink}\n\nThis link will expire in 7 days.`)}`}
                className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-100 group text-blue-600"
              >
                <Mail size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold mt-1.5">Email</span>
              </a>

              <a
                href={`sms:?body=${encodeURIComponent(`Register as caretaker on ConnectHub: ${generatedLink}`)}`}
                className="flex flex-col items-center justify-center p-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-all border border-neutral-200 group text-neutral-700"
              >
                <Phone size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold mt-1.5">SMS</span>
              </a>
            </div>

            <div className="pt-2">
              <Button variant="outline" fullWidth onClick={() => setShowInviteModal(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LandlordCaretakersPage;

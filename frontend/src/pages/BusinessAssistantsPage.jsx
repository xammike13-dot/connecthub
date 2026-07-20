import { useState, useEffect } from 'react';
import { assistantAPI } from '../services/api';
import { useToast } from '../components/Toast';
import {
  Users, UserX, UserCheck, ShieldAlert, Calendar, Mail, Phone, Clock,
  RefreshCw, Trash2, ToggleLeft, ToggleRight, Loader2, ArrowLeft, Copy, Share2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

const BusinessAssistantsPage = () => {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ assistants: [], invitations: [] });
  const [actionProcessing, setActionProcessing] = useState({});

  const fetchAssistants = async () => {
    try {
      setLoading(true);
      const res = await assistantAPI.getAssistants();
      setData(res.data.data);
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to load assistants list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssistants();
  }, []);

  const handleUpdateStatus = async (assistantId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    setActionProcessing(prev => ({ ...prev, [assistantId]: true }));
    try {
      await assistantAPI.updateStatus(assistantId, newStatus);
      toastSuccess(`Assistant status updated to ${newStatus} successfully.`);
      fetchAssistants();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update assistant status.');
    } finally {
      setActionProcessing(prev => ({ ...prev, [assistantId]: false }));
    }
  };

  const handleRemoveAssistant = async (assistantId) => {
    if (!window.confirm('Are you sure you want to remove this assistant? They will lose all access immediately.')) {
      return;
    }
    setActionProcessing(prev => ({ ...prev, [assistantId]: true }));
    try {
      await assistantAPI.remove(assistantId);
      toastSuccess('Assistant successfully removed.');
      fetchAssistants();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to remove assistant.');
    } finally {
      setActionProcessing(prev => ({ ...prev, [assistantId]: false }));
    }
  };

  const handleResendInvitation = async (invitationId) => {
    setActionProcessing(prev => ({ ...prev, [invitationId]: true }));
    try {
      const res = await assistantAPI.resendInvite(invitationId);
      toastSuccess('Invitation link extended and regenerated!');
      fetchAssistants();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to resend/extend invitation.');
    } finally {
      setActionProcessing(prev => ({ ...prev, [invitationId]: false }));
    }
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    toastSuccess('Invitation link copied!');
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-neutral-500 font-medium mt-3">Loading assistants directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/business/dashboard')}
            className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Business Assistants</h1>
            <p className="text-neutral-500 text-sm mt-1">
              Add and manage assistants to help process orders and stock without sharing financial info.
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={() => navigate('/business/dashboard')}>
          + Invite Assistant
        </Button>
      </div>

      {/* Main Assistants List */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-200 bg-neutral-50/50 flex justify-between items-center">
          <h2 className="font-extrabold text-neutral-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Active Assistants ({data.assistants?.length || 0})
          </h2>
          <button
            onClick={fetchAssistants}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-neutral-100">
          {data.assistants?.length === 0 ? (
            <div className="text-center py-10 text-neutral-400">
              <Users className="w-12 h-12 mx-auto mb-2 text-neutral-200" />
              <p className="text-sm font-medium">No assistants added yet.</p>
              <p className="text-xs text-neutral-400 mt-1">Use "Invite Assistant" on the dashboard to generate link.</p>
            </div>
          ) : (
            data.assistants.map((assistant) => {
              const isProcessing = actionProcessing[assistant.id];
              return (
                <div key={assistant.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-neutral-900">{assistant.name}</h4>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        assistant.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {assistant.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 font-medium">
                      <span className="flex items-center gap-1"><Mail size={13} /> {assistant.email}</span>
                      <span className="flex items-center gap-1"><Phone size={13} /> {assistant.phone}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> Added: {new Date(assistant.addedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 self-end md:self-center">
                    <button
                      disabled={isProcessing}
                      onClick={() => handleUpdateStatus(assistant.id, assistant.status)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 ${
                        assistant.status === 'active'
                          ? 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                          : 'border-green-200 hover:bg-green-50 text-green-600'
                      }`}
                    >
                      {assistant.status === 'active' ? (
                        <>
                          <ToggleRight size={14} className="text-green-600" />
                          Disable
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={14} className="text-neutral-400" />
                          Reactivate
                        </>
                      )}
                    </button>
                    <button
                      disabled={isProcessing}
                      onClick={() => handleRemoveAssistant(assistant.id)}
                      className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pending Invitations Section */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-200 bg-neutral-50/50">
          <h2 className="font-extrabold text-neutral-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Pending Invitations ({data.invitations?.length || 0})
          </h2>
        </div>

        <div className="divide-y divide-neutral-100">
          {data.invitations?.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-sm font-medium">
              No pending invitations.
            </div>
          ) : (
            data.invitations.map((invite) => {
              const isProcessing = actionProcessing[invite.id];
              return (
                <div key={invite.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-neutral-800">
                      {invite.assistantName || 'Unnamed Assistant'}
                    </h4>
                    {invite.assistantPhone && (
                      <p className="text-xs text-neutral-500 font-semibold">Phone: {invite.assistantPhone}</p>
                    )}
                    <p className="text-[11px] text-neutral-400 font-bold">
                      Expires: {new Date(invite.expiresAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleCopyLink(invite.inviteLink)}
                      className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <Copy size={13} /> Copy Link
                    </button>
                    <button
                      disabled={isProcessing}
                      onClick={() => handleResendInvitation(invite.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                    >
                      Resend / Extend
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessAssistantsPage;

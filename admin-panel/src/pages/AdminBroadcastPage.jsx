import { useState } from 'react';
import { adminAPI } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import { Megaphone, Send, Info } from 'lucide-react';

const AdminBroadcastPage = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [specificUserId, setSpecificUserId] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      alert('Title and Message are both strictly required fields.');
      return;
    }

    try {
      setLoading(true);
      const res = await adminAPI.broadcastNotification({
        title,
        message,
        targetAudience,
        specificUserId: targetAudience === 'specific' ? specificUserId : undefined,
        actionUrl,
      });
      alert(res.data?.message || 'Broadcast sent successfully!');
      setTitle('');
      setMessage('');
      setSpecificUserId('');
      setActionUrl('');
    } catch (err) {
      console.error('Failed to send broadcast:', err);
      alert('Broadcast delivery failed. Please check user IDs and target filters.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="max-w-xl w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Megaphone size={28} className="text-blue-500 animate-pulse" />
            Broadcast Center
          </h1>
          <p className="text-slate-400 mt-1">Send immediate in-app alerts and real-time device push notifications</p>
        </div>

        <form onSubmit={handleSendBroadcast} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Target Audience Group</label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Registered Users</option>
              <option value="customer">Customers Only</option>
              <option value="business">Marketplace Businesses Only</option>
              <option value="landlord">Property Landlords Only</option>
              <option value="rider">Boda Riders Only</option>
              <option value="caretaker">Caretakers Only</option>
              <option value="assistant">Business Assistants Only</option>
              <option value="specific">Specific Individual User</option>
            </select>
          </div>

          {targetAudience === 'specific' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Target User ID (MongoDB Object ID)</label>
              <Input
                placeholder="Enter exact 24-character user ID..."
                value={specificUserId}
                onChange={(e) => setSpecificUserId(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Notification Title</label>
            <Input
              placeholder="e.g. Platform System Maintenance Updates"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Notification Message / Body</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter comprehensive announcement or alert message details here..."
              className="w-full h-28 bg-slate-950 border border-slate-800 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 text-sm placeholder-slate-600 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Action / Deep Link URL (Optional)</label>
            <Input
              placeholder="e.g. /customer/orders or https://connecthub.app/news"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3 text-xs text-blue-400">
            <Info size={18} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Push Enabled Alert:</strong> This broadcast automatically integrates with standard browser Web Push notification tokens, delivering instant device notifications in the background to subscribed user groups.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full flex items-center justify-center gap-2 font-bold py-3"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : <Send size={18} />}
            {loading ? 'Sending Broadcast...' : 'Deliver Broadcast Now'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminBroadcastPage;

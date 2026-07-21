import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, MessageSquare, Plus, Check } from 'lucide-react';

const AdminReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [category, status]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getReports({ category, status });
      setReports(res.data.data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReport = async (reportId, newStatus) => {
    try {
      await adminAPI.updateReportStatus(reportId, { status: newStatus, adminNotes });
      alert(`Report status successfully set to ${newStatus}.`);
      setAdminNotes('');
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      console.error('Failed to update report status:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Reports & Support</h1>
        <p className="text-slate-400 mt-1">Review user reports, resolve platform complaints, and manage support tickets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2.5 outline-none"
        >
          <option value="">All Categories</option>
          <option value="order">Order Dispute</option>
          <option value="payment">Payment Issue</option>
          <option value="rental">Rental / Landlord Complaint</option>
          <option value="ride">Ride / Transit Issue</option>
          <option value="account">Account Issue</option>
          <option value="general">General Support</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2.5 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((r) => (
            <div key={r._id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="capitalize text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {r.category}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-2">{r.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">Reported by: {r.user?.name || 'Anonymous'} ({r.user?.email || 'N/A'})</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  r.status === 'Resolved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  r.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  r.status === 'Closed' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                  'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}>
                  {r.status}
                </span>
              </div>
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">{r.description}</p>

              {r.adminNotes && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 mb-4 text-xs">
                  <strong className="text-slate-400">Admin Notes:</strong> {r.adminNotes}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="xs" onClick={() => setSelectedReport(r)}>
                  Update Workflow
                </Button>
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="text-center py-12 text-slate-500 font-semibold bg-slate-900 border border-slate-800 rounded-xl">No support tickets found.</div>
          )}
        </div>
      )}

      {/* Update Workflow Status Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-bold text-white mb-4">Update Support Ticket</h3>
            <p className="text-xs text-slate-400 mb-4">Ticket: {selectedReport.title}</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-2">Resolution/Workflow notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter actions taken, resolution history or follow-up details..."
                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 text-sm placeholder-slate-600 resize-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400 mb-1">Set ticket status:</span>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleUpdateReport(selectedReport._id, 'In Progress')}>
                  In Progress
                </Button>
                <Button variant="success" size="sm" onClick={() => handleUpdateReport(selectedReport._id, 'Resolved')}>
                  Mark Resolved
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleUpdateReport(selectedReport._id, 'Closed')}>
                  Close Ticket
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;

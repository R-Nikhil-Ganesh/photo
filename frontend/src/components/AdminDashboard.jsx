import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Settings, UploadCloud, Check, X, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [requests, setRequests] = useState([]);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/admin');
      return;
    }
    fetchRequests();
  }, [token]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
         localStorage.removeItem('admin_token');
         navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingQr(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');

      const cResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const cData = await cResponse.json();
      if (!cResponse.ok) throw new Error("Cloudinary error");

      await axios.put(`${API_BASE_URL}/admin/qr`, { qr_url: cData.secure_url }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("QR code updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload QR.");
    } finally {
      setUploadingQr(false);
    }
  };

  const processRequest = async (id, action) => {
    try {
      await axios.post(`${API_BASE_URL}/admin/requests/${id}/${action}`, {}, {
         headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests(); // refresh list
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action} request`);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  };

  if (loading) return <div className="p-xl text-center"><Loader2 className="animate-spin inline" /></div>;

  return (
    <div className="container py-xl animate-fade-in">
       <div className="flex justify-between items-center mb-xl">
          <h1 className="text-xl flex items-center gap-xs"><Settings size={28} /> Admin Console</h1>
          <button onClick={logout} className="btn-secondary">Logout</button>
       </div>

       <div className="grid md:grid-cols-3 gap-lg">
          <div className="glass-panel text-center md:col-span-1 border-border">
             <h3 className="mb-md text-sm uppercase text-muted tracking-widest">Payment QR Code</h3>
             <input type="file" id="qr-upload" accept="image/*" onChange={handleQrUpload} style={{ display: 'none' }} />
             <label htmlFor="qr-upload" className="btn-primary flex items-center justify-center gap-sm cursor-pointer w-full">
                {uploadingQr ? <Loader2 className="animate-spin" /> : <UploadCloud size={18} />}
                Upload New QR
             </label>
             <p className="text-xs text-dim mt-sm">This is displayed to users trying to subscribe for more folders.</p>
          </div>

          <div className="glass-panel md:col-span-2">
             <h3 className="mb-md text-sm uppercase text-muted tracking-widest">Pending Subscriptions</h3>
             
             {requests.length === 0 ? (
                <div className="p-lg text-center text-muted bg-black rounded-lg">No pending requests.</div>
             ) : (
                <div className="flex flex-col gap-md">
                   {requests.map(req => (
                     <div key={req.id} className="flex flex-col sm:flex-row gap-md items-start sm:items-center justify-between p-md border border-border rounded-lg bg-black">
                        <div>
                           <p className="font-semibold">{req.user_email}</p>
                           <p className="text-xs text-muted">Requested Folders: {req.requested_folders}</p>
                           <a href={req.screenshot_url} target="_blank" rel="noreferrer" className="text-xs" style={{ color: 'var(--primary)' }}>View Screenshot ↗</a>
                        </div>
                        <div className="flex gap-sm">
                           <button onClick={() => processRequest(req.id, 'approve')} className="btn-icon" style={{ background: '#10b981', color: '#000' }}>
                              <Check size={16} /> Approve
                           </button>
                           <button onClick={() => processRequest(req.id, 'reject')} className="btn-icon" style={{ background: '#ef4444', color: '#fff' }}>
                              <X size={16} /> Reject
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
             )}
          </div>
       </div>
    </div>
  );
}

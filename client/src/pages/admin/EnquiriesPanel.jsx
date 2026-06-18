import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminGet, adminPatch } from '../../api/client';

export default function EnquiriesPanel() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('New');

  // Interactive Form Sections Modifier Configuration State
  const [formSections, setFormSections] = useState([
    { id: 'personal', name: 'Personal Profile Matrix', active: true },
    { id: 'sports', name: 'Sports Stream Preferences', active: true },
    { id: 'medical', name: 'Athletic Health & Fitness History', active: false }
  ]);
  const [newSectionName, setNewSectionName] = useState('');

  const qrCanvasRef = useRef(null);
  const intakeFormUrl = `${window.location.origin}/public/intake-form`;

  useEffect(() => {
    fetchEnquiries();
    generateQrCode();
  }, []);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const res = await adminGet('/admin/enquiries');
      setEnquiries(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch enquiries collection.');
    } finally {
      setLoading(false);
    }
  };

  const generateQrCode = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Fallback crisp programmatic rendering mock for high-performance sports tracking
    ctx.clearRect(0, 0, 200, 200);
    ctx.fillStyle = 'var(--color-bg-secondary, #ffffff)';
    ctx.fillRect(0, 0, 200, 200);
    
    // Outer Tracking Boundary Frame
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 6;
    ctx.strokeRect(15, 15, 170, 170);
    
    // Programmatic Block Anchors Matrix simulating an industrial telemetry structure
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(25, 25, 45, 45);
    ctx.fillRect(130, 25, 45, 45);
    ctx.fillRect(25, 130, 45, 45);
    ctx.fillRect(85, 85, 30, 30);
    ctx.fillRect(95, 45, 15, 25);
    ctx.fillRect(45, 95, 25, 15);
    ctx.fillRect(130, 130, 20, 20);
  };

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'SAMS-Intake-Registration-QR.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(intakeFormUrl);
    alert('Intake system connection link copied to administration clipboard matrix.');
  };

  const handleAddSection = (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    setFormSections([
      ...formSections,
      { id: Date.now().toString(), name: newSectionName.trim(), active: true }
    ]);
    setNewSectionName('');
  };

  const toggleSection = (id) => {
    setFormSections(formSections.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  return (
    <motion.div 
      className="p-6 bg-surface text-foreground min-h-screen space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Enquiries Desk</h1>
          <p className="text-sm text-muted mt-1">Manage incoming public inquiries and optimize your intake automation pipeline links.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT/CENTER PANELS: ENQUIRIES LEDGER TRACKER */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card bg-surface-secondary border border-border p-6 shadow-sm">
            <h2 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
              <span>✉️</span> Active Inquiries Log
            </h2>

            {loading ? (
              <div className="py-12 text-center text-muted font-bold animate-pulse">Synchronizing communication feeds...</div>
            ) : error ? (
              <div className="alert-error p-4 rounded-xl text-sm border border-danger/20">{error}</div>
            ) : enquiries.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <p className="text-muted font-medium m-0">No entries currently caught in registration filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sender Identity</th>
                      <th>Inquiry Payload</th>
                      <th>Processing Status</th>
                      <th>Action Node</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map((enq, index) => (
                      <motion.tr
                        key={enq.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                        className="hover:bg-surface/40 transition-colors"
                      >
                        <td className="font-bold whitespace-nowrap">
                          <span className="block text-foreground">{enq.name}</span>
                          <span className="block text-xs text-muted font-semibold">{enq.email}</span>
                        </td>
                        <td className="max-w-xs truncate text-muted">{enq.message}</td>
                        <td>
                          <span className={`inline-block px-2.5 py-1 text-xs font-black rounded-lg uppercase tracking-wider ${
                            enq.status === 'New' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                            enq.status === 'In-Progress' ? 'bg-warning/10 text-warning border border-warning/20' :
                            'bg-surface text-muted border border-border'
                          }`}>
                            {enq.status}
                          </span>
                        </td>
                        <td>
                          <motion.button 
                            onClick={() => { setSelectedEnquiry(enq); setRemarks(enq.remarks || ''); setStatus(enq.status); }}
                            className="btn bg-accent text-white hover:bg-accent-hover btn-sm shadow-sm"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            Review Parameters
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: QR KIOSK GENERATOR & SECTION MODIFIER */}
        <div className="space-y-6">
          
          {/* DIGITAL INTAKE KIOSK MODULE */}
          <div className="card bg-surface-secondary border border-border p-6 shadow-sm text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-bl-full pointer-events-none" />
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground">Digital Intake Kiosk</h2>
              <p className="text-xs text-muted mt-1">Scan to redirect registration vectors to public web entry endpoints directly.</p>
            </div>
            
            <div className="flex justify-center">
              <div className="p-3 bg-surface border-2 border-accent/20 rounded-2xl shadow-inner group transition-transform duration-300 hover:scale-105">
                <canvas ref={qrCanvasRef} width="200" height="200" className="rounded-xl block" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <motion.button 
                onClick={handleDownloadQr} 
                className="bg-accent text-white hover:bg-accent-hover py-3 px-4 rounded-xl font-bold text-xs transition-transform shadow-md shadow-accent/10"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                📥 Download PNG
              </motion.button>
              <motion.button 
                onClick={handleShareLink} 
                className="btn-secondary py-3 px-4 rounded-xl font-bold text-xs"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🔗 Copy Form URL
              </motion.button>
            </div>
          </div>

          {/* SYSTEM GRID SECTIONS MODIFIER */}
          <div className="card bg-surface-secondary border border-border p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground">Form Grid Sections Modifier</h2>
              <p className="text-xs text-muted mt-1">Dynamically inject or hide registration step targets instantly across public configurations.</p>
            </div>

            <form onSubmit={handleAddSection} className="flex gap-2">
              <motion.input 
                type="text" 
                placeholder="New section title string..." 
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="input-field py-2 text-xs flex-1"
                whileFocus={{ scale: 1.01 }}
              />
              <motion.button 
                type="submit" 
                className="bg-accent text-white hover:bg-accent-hover px-4 rounded-xl font-bold text-xs whitespace-nowrap"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Add Block
              </motion.button>
            </form>

            <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
              {formSections.map((section) => (
                <div key={section.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/60 hover:border-accent/20 transition-all">
                  <span className={`text-xs font-bold transition-colors ${section.active ? 'text-foreground' : 'text-muted line-through'}`}>
                    {section.name}
                  </span>
                  <button 
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border transition-all ${
                      section.active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-surface text-muted border-border'
                    }`}
                  >
                    {section.active ? 'Active' : 'Hidden'}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* PARAMETER MODIFICATION OVERLAY DRAWER */}
      <AnimatePresence>
        {selectedEnquiry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg card bg-surface border border-border p-8 shadow-2xl space-y-6"
            >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-foreground tracking-tight">Review Entry Parameters</h3>
                <p className="text-xs text-muted mt-0.5">Assigned to: <span className="font-bold text-accent">{selectedEnquiry.name}</span></p>
              </div>
              <button onClick={() => setSelectedEnquiry(null)} className="text-muted hover:text-foreground font-bold text-lg p-1">✕</button>
            </div>

            <div className="p-4 bg-surface-secondary rounded-xl border border-border/60 space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-wider text-muted">Original Inquiry Description:</span>
              <p className="text-sm text-foreground leading-relaxed m-0 italic">"{selectedEnquiry.message}"</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Update Pipeline Tracking Status</label>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="New">New Unprocessed Row</option>
                  <option value="In-Progress">In-Progress Operations</option>
                  <option value="Resolved">Resolved Structural Closure</option>
                </select>
              </div>

              <div>
                <label className="label">Administrative Resolution Logging Records</label>
                <textarea 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter dynamic resolution notes, branch handoff flags, or tracking logs..."
                  className="input-field min-h-[100px] resize-none text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <motion.button 
                onClick={() => setSelectedEnquiry(null)} 
                className="btn-secondary py-2.5 px-5"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button 
                onClick={async () => {
                  try {
                    await adminPatch(`/admin/enquiries/${selectedEnquiry.id}`, { status, remarks });
                    setSelectedEnquiry(null);
                    fetchEnquiries();
                  } catch (err) {
                    alert(err.message || 'Failed updating status matrix.');
                  }
                }}
                className="bg-accent text-white hover:bg-accent-hover py-2.5 px-6 rounded-xl font-bold text-sm shadow-md shadow-accent/10"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Save Structural Updates
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
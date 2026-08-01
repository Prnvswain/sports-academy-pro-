import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parentGet, parentPut } from '../../api/client';
import Loader from '../../components/Loader';
import {
  User, Mail, Phone, ShieldAlert, MapPin, Edit, CheckCircle,
  AlertCircle, Trophy, Users, Heart, Calendar, Clock, X
} from 'lucide-react';

export default function ParentProfile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await parentGet('/parent/profile');
      const data = response?.data || response;
      if (data) {
        setProfileData(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
        });
      }
    } catch (error) {
      console.error('Failed to load parent profile:', error);
      showToast('Failed to load profile details', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Keyboard accessibility listeners (ESC to close drawer)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowEditDrawer(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Name and Email are required', 'error');
      return;
    }

    try {
      setUpdating(true);
      const response = await parentPut('/parent/update-profile', formData);
      const result = response?.data || response;
      
      // Update local cache
      setProfileData(prev => ({
        ...prev,
        name: formData.name,
        email: formData.email,
      }));
      
      // Save updated parent user to localStorage
      const parentUser = localStorage.getItem('parent_user');
      if (parentUser) {
        const parsed = JSON.parse(parentUser);
        parsed.name = formData.name;
        parsed.email = formData.email;
        localStorage.setItem('parent_user', JSON.stringify(parsed));
      }

      showToast('Profile updated successfully');
      setShowEditDrawer(false);
      
      // Force page refresh
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const getInitials = (name) => {
    if (!name) return 'PR';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) return <Loader />;
  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
        <h3 className="text-lg font-bold">Profile Unavailable</h3>
        <p className="text-xs">We could not load your parent profile details at this moment.</p>
      </div>
    );
  }

  const enrolledStudents = profileData.students || [];

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans p-4 lg:p-8">
      {/* Header section */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Account Profile
          </h1>
          <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
            Manage your personal profile details and registered child details
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowEditDrawer(true)}
          className="btn btn-primary text-xs flex items-center gap-1.5 self-start sm:self-center"
        >
          <Edit className="w-3.5 h-3.5" />
          Edit Profile
        </motion.button>
      </motion.div>

      {/* Main Profile Info grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Parent Details Info */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary to-primary/60" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center text-2xl font-black shadow-md border-2 border-background mt-4 mb-4">
              {getInitials(profileData.name)}
            </div>
            
            <h2 className="text-lg font-black text-foreground">{profileData.name}</h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Parent Account</p>
            
            <div className="w-full border-t border-border/60 mt-6 pt-5 text-left text-xs font-semibold space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Email Address</p>
                  <p className="text-foreground truncate">{profileData.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Phone Number</p>
                  <p className="text-foreground">{profileData.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Emergency Contact</p>
                  <p className="text-foreground">
                    {profileData.emergency_contact_name || '—'} 
                    {profileData.emergency_contact_phone && ` (${profileData.emergency_contact_phone})`}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Academy details card */}
          {enrolledStudents.length > 0 && enrolledStudents[0].academy && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Academy Headquarters
              </h3>
              <div className="text-xs font-semibold space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Academy Name</p>
                  <p className="text-foreground text-sm font-bold mt-0.5">{enrolledStudents[0].academy.name}</p>
                </div>
                {enrolledStudents[0].academy.address && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Location Address</p>
                    <p className="text-foreground leading-relaxed mt-0.5">{enrolledStudents[0].academy.address}</p>
                  </div>
                )}
                {enrolledStudents[0].academy.city && (
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">City</p>
                      <p className="text-foreground mt-0.5">{enrolledStudents[0].academy.city}</p>
                    </div>
                    {enrolledStudents[0].academy.state && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">State</p>
                        <p className="text-foreground mt-0.5">{enrolledStudents[0].academy.state}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right column: Enrolled Students cards */}
        <div className="lg:col-span-2 space-y-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Registered Student Athletes ({enrolledStudents.length})
          </h3>

          {enrolledStudents.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground">
              <User className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2 animate-pulse" />
              <p className="text-sm font-bold">No enrolled children</p>
              <p className="text-xs mt-0.5">Please contact the academy office to register your children.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrolledStudents.map((student, idx) => (
                <motion.div
                  key={student.student_id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  <div className="flex items-center gap-4 border-b border-border/50 pb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                      {student.profile_photo ? (
                        <img src={student.profile_photo} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-foreground truncate">{student.name}</h4>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 uppercase tracking-wide">
                        ID: {student.student_id}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 text-[11px] font-semibold text-foreground">
                    <div className="flex gap-2 items-center">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] text-muted-foreground block uppercase">Date of Birth</span>
                        <span className="truncate block mt-0.5">{student.dob ? new Date(student.dob).toLocaleDateString() : '—'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <User className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] text-muted-foreground block uppercase">Gender / Blood</span>
                        <span className="truncate block mt-0.5 capitalize">{student.gender || '—'} {student.blood_group ? `• ${student.blood_group}` : ''}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] text-muted-foreground block uppercase">Sport Specialty</span>
                        <span className="truncate block mt-0.5">{student.sport?.name || 'General Sport'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] text-muted-foreground block uppercase">Batch / Timing</span>
                        <span className="truncate block mt-0.5">{student.batch?.name || '—'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Emergency contacts details */}
                  <div className="bg-muted/30 border border-border/40 p-2.5 rounded-xl text-[10px] font-semibold text-muted-foreground flex justify-between items-center">
                    <span>Emergency Contact:</span>
                    <span className="text-foreground font-bold">{student.emergency_contact_name || student.emergency_contact || 'Parent Phone'}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* EDIT DRAWER SLIDE-OVER */}
      <AnimatePresence>
        {showEditDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditDrawer(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Edit Profile Details</h2>
                </div>
                <button
                  onClick={() => setShowEditDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="flex-1 p-5 space-y-5 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="Enter your email address"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full btn btn-primary py-3 text-xs font-bold shadow-sm"
                >
                  {updating ? 'Saving changes...' : 'Save Profile Changes'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Message popup */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-xl shadow-lg z-50 text-xs font-bold flex items-center gap-2 ${
              message.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
            }`}
          >
            {message.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../components/Navbar';
import ThemeToggle from '../../components/ThemeToggle';
import { signup, googleSignup } from '../../api/client';
import {
  MapPin,
  AlertTriangle,
  Building2
} from 'lucide-react';

const GoogleLoginButton = ({ onSuccess, onError }) => {
  const [GoogleLogin, setGoogleLogin] = useState(null);
  const [GoogleOAuthProvider, setGoogleOAuthProvider] = useState(null);
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    // Check if Google Client ID is configured
    const id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (id) {
      setClientId(id);
      // Dynamic import to avoid blank screen
      import('@react-oauth/google').then(({ GoogleLogin: GL, GoogleOAuthProvider: GOP }) => {
        setGoogleLogin(() => GL);
        setGoogleOAuthProvider(() => GOP);
      }).catch(() => {
        console.log('Google Login component not available');
      });
    }
  }, []);

  if (!GoogleLogin || !GoogleOAuthProvider || !clientId) {
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        useOneTap
        theme="outline"
        size="large"
        text="signup_with"
        shape="rectangular"
        logo_alignment="left"
      />
    </GoogleOAuthProvider>
  );
};

const initialSignup = {
  name: '',
  email: '',
  password: '',
  academy_name: '',
  phone_number: '',
  city: '',
  state: '',
  address: '',
  attendance_radius_meters: 100,
  latitude: null,
  longitude: null,
  subscription_plan: 'free',
  logo: null,
};

export default function SignupPage() {
  const navigate = useNavigate();

  // FORM DATA PROTECTION STATE LAYER (AUTO-SAVE & RECOVERY)
  const [signupForm, setSignupForm] = useState(() => {
    const savedDraft = localStorage.getItem('sams_draft_public_signup');
    if (!savedDraft) return initialSignup;

    try {
      return {
        ...initialSignup,
        ...JSON.parse(savedDraft),
      };
    } catch {
      return initialSignup;
    }
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState({ text: '', type: '' });
  const [gpsError, setGpsError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Auto-Save Persistence Loops
  useEffect(() => {
    localStorage.setItem('sams_draft_public_signup', JSON.stringify(signupForm));
  }, [signupForm]);

  const handleSignupChange = (event) => {
    const { name, value, files } = event.target;
    if (name === 'logo' && files && files[0]) {
      const file = files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        setSignupMessage({ text: 'Logo must be JPG, JPEG, PNG, or WEBP', type: 'error' });
        return;
      }

      if (file.size > maxSize) {
        setSignupMessage({ text: 'Logo must be less than 5MB', type: 'error' });
        return;
      }

      setSignupForm((prev) => ({ ...prev, logo: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSignupForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSignupForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setGettingLocation(false);
        setSignupMessage({ text: 'Academy location captured successfully', type: 'success' });
        setTimeout(() => setSignupMessage({ text: '', type: '' }), 3000);
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = 'Unable to fetch current location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission is required for attendance tracking.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = 'An unknown error occurred getting location.';
        }
        setGpsError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const clearFormState = (formType) => {
    if (formType === 'signup') {
      setSignupForm(initialSignup);
      localStorage.removeItem('sams_draft_public_signup');
      setIsGoogleAuth(false);
      setGoogleUser(null);
    }
    setActiveModal(null);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setSignupLoading(true);
      setSignupMessage({ text: '', type: '' });

      // Decode the JWT token to get user info
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);

      setGoogleUser({ ...payload, credential: credentialResponse.credential });
      setIsGoogleAuth(true);

      // Auto-fill name and email
      setSignupForm((prev) => ({
        ...prev,
        name: payload.name || '',
        email: payload.email || '',
      }));

      setSignupMessage({ text: 'Google account connected. Please complete your academy details.', type: 'success' });
    } catch (error) {
      setSignupMessage({ text: 'Failed to connect Google account. Please try again.', type: 'error' });
    } finally {
      setSignupLoading(false);
    }
  };

  const handleGoogleError = () => {
    setSignupMessage({ text: 'Google authentication failed. Please try again.', type: 'error' });
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();

    // Validation
    if (!signupForm.city.trim()) {
      setSignupMessage({ text: 'City is required', type: 'error' });
      return;
    }
    if (!signupForm.state.trim()) {
      setSignupMessage({ text: 'State is required', type: 'error' });
      return;
    }
    if (!signupForm.latitude || !signupForm.longitude) {
      setSignupMessage({
        text: 'Please capture academy location using the Set Academy Location button',
        type: 'error',
      });
      return;
    }

    // Attendance radius validation
    if (!signupForm.attendance_radius_meters || signupForm.attendance_radius_meters === '') {
      setSignupMessage({ text: 'Attendance Radius is required', type: 'error' });
      return;
    }
    const radius = parseInt(signupForm.attendance_radius_meters, 10);
    if (isNaN(radius) || radius < 100) {
      setSignupMessage({ text: 'Attendance radius must be at least 100 meters.', type: 'error' });
      return;
    }
    if (radius > 5000) {
      setSignupMessage({ text: 'Maximum radius is 5000 meters', type: 'error' });
      return;
    }

    // For email signup, validate password
    if (!isGoogleAuth && !signupForm.password) {
      setSignupMessage({ text: 'Password is required', type: 'error' });
      return;
    }
    if (!isGoogleAuth && signupForm.password.length < 6) {
      setSignupMessage({ text: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setSignupLoading(true);
    setSignupMessage({ text: '', type: '' });

    try {
      if (isGoogleAuth && googleUser) {
        // Google signup
        const formData = new FormData();
        formData.append('google_id_token', googleUser.credential);
        formData.append('academy_name', signupForm.academy_name.trim());
        if (signupForm.phone_number) {
          formData.append('phone_number', signupForm.phone_number.trim());
        }
        formData.append('city', signupForm.city.trim());
        formData.append('state', signupForm.state.trim());
        if (signupForm.address) {
          formData.append('address', signupForm.address.trim());
        }
        formData.append('latitude', signupForm.latitude);
        formData.append('longitude', signupForm.longitude);
        formData.append('attendance_radius_meters', parseInt(signupForm.attendance_radius_meters) || 100);
        formData.append('subscription_plan', signupForm.subscription_plan);
        if (signupForm.logo) {
          formData.append('logo', signupForm.logo);
        }

        const result = await googleSignup(formData);
        setSignupMessage({ text: `${result.message} Redirecting…`, type: 'success' });
        localStorage.removeItem('sams_draft_public_signup');
        setTimeout(() => navigate('/admin/dashboard'), 1000);
      } else {
        // Email signup
        const formData = new FormData();
        formData.append('name', signupForm.name.trim());
        formData.append('email', signupForm.email.trim());
        formData.append('password', signupForm.password);
        formData.append('academy_name', signupForm.academy_name.trim());
        if (signupForm.phone_number) {
          formData.append('phone_number', signupForm.phone_number.trim());
        }
        formData.append('city', signupForm.city.trim());
        formData.append('state', signupForm.state.trim());
        if (signupForm.address) {
          formData.append('address', signupForm.address.trim());
        }
        formData.append('latitude', signupForm.latitude);
        formData.append('longitude', signupForm.longitude);
        formData.append('attendance_radius_meters', parseInt(signupForm.attendance_radius_meters) || 100);
        formData.append('subscription_plan', signupForm.subscription_plan);
        if (signupForm.logo) {
          formData.append('logo', signupForm.logo);
        }

        const result = await signup(formData);
        setSignupMessage({ text: `${result.message} Redirecting…`, type: 'success' });
        localStorage.removeItem('sams_draft_public_signup');
        setTimeout(() => navigate('/admin/dashboard'), 1000);
      }
    } catch (error) {
      setSignupMessage({ text: error.message, type: 'error' });
    } finally {
      setSignupLoading(false);
    }
  };

  // Uniform theme string matching the landing page inputs
  const inputThemeStyles =
    'w-full rounded-none bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 p-3 focus:border-lime-500 focus:ring-0 focus:outline-none transition-all duration-300 text-sm font-medium shadow-sm';

  const labelStyles = 'text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block dark:text-slate-400';

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen text-slate-900 dark:text-white font-sans selection:bg-lime-400 selection:text-slate-900 flex flex-col relative">
      
      {/* FULL PAGE DYNAMIC BACKGROUND */}
      <div className="fixed inset-0 w-full h-full bg-slate-900 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#a3e635 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        {/* Diagonal Lime Slice Covering Right Side */}
        <div className="absolute top-0 right-0 h-full w-full bg-lime-500 origin-top-right transition-transform" style={{ clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 15% 100%)' }}></div>
      </div>

      {/* NAVBAR (Set to z-20 so it sits above the fixed background) */}
      <div className="relative z-20">
        <Navbar>
          <Link to="/" className="text-slate-700 hover:text-lime-600 dark:text-slate-200 relative text-xs font-black uppercase tracking-wider transition-colors group">
            Home
            <span className="absolute -bottom-1.5 left-0 h-0.5 w-0 bg-lime-500 transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link to="/login" className="text-slate-700 hover:text-lime-600 dark:text-slate-200 relative text-xs font-black uppercase tracking-wider transition-colors group">
            Login
            <span className="absolute -bottom-1.5 left-0 h-0.5 w-0 bg-lime-500 transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <ThemeToggle />
        </Navbar>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-3xl space-y-6 mt-6 sm:mt-10"
        >
          {/* Header Text - Fixed text color to explicit white */}
          <div className="text-center">
            <h1 className="text-white text-3xl font-black tracking-tight sm:text-4xl uppercase drop-shadow-md">
              Create Your <span className="bg-slate-900 text-lime-500 px-2 ml-2">WORKSPACE</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-xs sm:text-sm font-medium text-slate-200 drop-shadow-sm leading-relaxed">
              Provision isolated multi-tenant records nodes and structural administrator properties concurrently.
            </p>
          </div>

          {/* Form Card Setup */}
          <div className="bg-white border-2 border-slate-100 p-6 sm:p-8 shadow-2xl dark:bg-slate-800 dark:border-slate-700 relative">
            {/* Design Accent */}
            <div className="absolute top-0 right-0 w-12 h-12 bg-lime-500" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
               <div>
                  <h3 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-lime-500" />
                    Setup Setup
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                    Already have a domain?{' '}
                    <Link to="/login/admin" className="text-lime-600 dark:text-lime-400 hover:underline">Admin Login</Link>
                  </p>
               </div>
               
               {/* Google Sign In Area */}
               {!isGoogleAuth ? (
                  <div className="flex-shrink-0 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-4 sm:pt-0 sm:pl-4">
                     <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
                  </div>
               ) : (
                 <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-xs">
                    {googleUser?.picture && (
                      <img src={googleUser.picture} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
                    )}
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">{googleUser?.name}</p>
                      <p className="text-slate-500">{googleUser?.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsGoogleAuth(false);
                        setGoogleUser(null);
                        setSignupForm((prev) => ({ ...prev, name: '', email: '' }));
                      }}
                      className="ml-2 text-[10px] font-black uppercase text-red-500 hover:text-red-700 underline"
                    >
                      Disconnect
                    </button>
                 </div>
               )}
            </div>

            {/* FORM */}
            <form onSubmit={handleSignupSubmit} noValidate className="space-y-5">
              
              {/* Personal Details Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyles} htmlFor="signupName">Full Legal Name</label>
                  <input
                    className={`${inputThemeStyles} ${isGoogleAuth ? 'opacity-70 bg-slate-100 dark:bg-slate-900 cursor-not-allowed' : ''}`}
                    id="signupName"
                    name="name"
                    value={signupForm.name || ''}
                    onChange={handleSignupChange}
                    required
                    readOnly={isGoogleAuth}
                    disabled={isGoogleAuth}
                  />
                </div>
                <div>
                  <label className={labelStyles} htmlFor="signupEmail">Identity Email</label>
                  <input
                    className={`${inputThemeStyles} ${isGoogleAuth ? 'opacity-70 bg-slate-100 dark:bg-slate-900 cursor-not-allowed' : ''}`}
                    type="email"
                    id="signupEmail"
                    name="email"
                    value={signupForm.email || ''}
                    onChange={handleSignupChange}
                    required
                    readOnly={isGoogleAuth}
                    disabled={isGoogleAuth}
                  />
                </div>
              </div>

              {/* Password & Phone Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!isGoogleAuth ? (
                  <div>
                    <label className={labelStyles} htmlFor="signupPassword">Security Password (Min 6 Chars)</label>
                    <input
                      className={inputThemeStyles}
                      type="password"
                      id="signupPassword"
                      name="password"
                      value={signupForm.password || ''}
                      onChange={handleSignupChange}
                      minLength={6}
                      required
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Password managed via Google Auth
                    </p>
                  </div>
                )}
                <div>
                  <label className={labelStyles} htmlFor="signupPhone">Contact Number (Optional)</label>
                  <input
                    className={inputThemeStyles}
                    type="tel"
                    id="signupPhone"
                    name="phone_number"
                    value={signupForm.phone_number || ''}
                    onChange={handleSignupChange}
                  />
                </div>
              </div>

              {/* Academy Details Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyles} htmlFor="signupAcademy">Academy Corporate Name</label>
                  <input
                    className={inputThemeStyles}
                    id="signupAcademy"
                    name="academy_name"
                    value={signupForm.academy_name || ''}
                    onChange={handleSignupChange}
                    required
                  />
                </div>
                <div>
                  <label className={labelStyles} htmlFor="signupLogo">Academy Logo (Optional)</label>
                  <input
                    className={`${inputThemeStyles} py-2 file:mr-3 file:py-1 file:px-3 file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-900 file:text-lime-400 hover:file:bg-slate-800 cursor-pointer`}
                    type="file"
                    id="signupLogo"
                    name="logo"
                    onChange={handleSignupChange}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                  />
                  {logoPreview && (
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-16 w-16 rounded-full object-cover border-2 border-slate-300 dark:border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview(null);
                          setSignupForm(prev => ({ ...prev, logo: null }));
                        }}
                        className="text-xs font-bold text-red-600 hover:text-red-700 uppercase tracking-wide"
                      >
                        Remove Logo
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Text Details Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyles} htmlFor="signupCity">City <span className="text-lime-600">*</span></label>
                  <input
                    className={inputThemeStyles}
                    id="signupCity"
                    name="city"
                    value={signupForm.city || ''}
                    onChange={handleSignupChange}
                    required
                  />
                </div>
                <div>
                  <label className={labelStyles} htmlFor="signupState">State <span className="text-lime-600">*</span></label>
                  <input
                    className={inputThemeStyles}
                    id="signupState"
                    name="state"
                    value={signupForm.state || ''}
                    onChange={handleSignupChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className={labelStyles} htmlFor="signupAddress">Full Address (Optional)</label>
                    <input
                      className={inputThemeStyles}
                      id="signupAddress"
                      name="address"
                      value={signupForm.address || ''}
                      onChange={handleSignupChange}
                      placeholder="Street address, landmark, etc."
                    />
                 </div>
                 <div>
                    <label className={labelStyles} htmlFor="signupRadius">Attendance Radius (meters)</label>
                    <input
                      className={inputThemeStyles}
                      type="number"
                      id="signupRadius"
                      name="attendance_radius_meters"
                      value={signupForm.attendance_radius_meters}
                      onChange={handleSignupChange}
                    />
                    <p className="text-xs text-muted mt-1">Minimum allowed attendance radius is 100 meters.</p>
                 </div>
              </div>

              {/* Advanced GPS Location Capture Box */}
              <div className="p-5 bg-slate-50 border-2 border-slate-200 dark:bg-slate-900 dark:border-slate-700 relative mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-5 h-5 text-lime-600" />
                      <label className="text-sm font-black uppercase tracking-wide">GPS Coordinate Lock</label>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Required for geofenced attendance tracking</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="px-5 py-2.5 bg-slate-900 text-lime-400 uppercase tracking-wider text-[10px] font-black hover:bg-slate-800 transition-colors disabled:bg-slate-300 disabled:text-slate-500 flex items-center justify-center shadow-md whitespace-nowrap"
                  >
                    {gettingLocation ? 'Fetching...' : 'Lock Location'}
                  </motion.button>
                </div>

                {gpsError && (
                  <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold uppercase tracking-wider">{gpsError}</p>
                  </div>
                )}

                {signupForm.latitude && signupForm.longitude && (
                  <div className="mt-3 p-3 bg-lime-50 border-l-4 border-lime-500 dark:bg-lime-900/20 dark:border-lime-400">
                    <p className="text-[10px] font-black uppercase tracking-widest text-lime-800 dark:text-lime-300">
                      Coordinates Locked Successfully
                    </p>
                    <p className="text-[10px] font-bold tracking-widest text-slate-600 dark:text-slate-300 mt-1">
                      Lat: {signupForm.latitude.toFixed(6)} | Lng: {signupForm.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              {/* Subscription Plan */}
              <div>
                <label className={labelStyles} htmlFor="signupPlan">
                  Core Subscribed Workspace Tier
                </label>
                <select
                  className={`${inputThemeStyles} cursor-pointer py-3.5 bg-white dark:bg-slate-800 font-bold tracking-wide`}
                  id="signupPlan"
                  name="subscription_plan"
                  value={signupForm.subscription_plan || 'free'}
                  onChange={handleSignupChange}
                  required
                >
                  <option value="free" className="font-medium text-slate-900">
                    Free Starter Tier — Max 3 Coaches / 30 Student Matrix
                  </option>
                  <option value="pro" className="font-medium text-slate-900">
                    Pro Academy Tier — Max 6 Coaches / 80 Student Matrix
                  </option>
                  <option value="plus" className="font-medium text-slate-900">
                    Plus Enterprise Tier — Complete Unrestricted Pipelines
                  </option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-lime-500 py-3.5 text-xs font-black uppercase tracking-wider text-slate-900 transition-all hover:bg-lime-400 shadow-xl shadow-lime-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={signupLoading}
                >
                  {signupLoading ? 'Configuring instances...' : 'Deploy Academy Account'}
                </button>
                <button
                  type="button"
                  className="border-2 border-slate-200 bg-transparent px-8 py-3.5 text-xs font-black uppercase tracking-wider text-slate-600 transition-all hover:border-slate-900 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:border-white dark:hover:text-white"
                  onClick={() => setActiveModal('signup')}
                >
                  Clear Draft
                </button>
              </div>

              {/* System Messages */}
              {signupMessage.text && (
                <div className={`mt-4 p-4 text-[10px] font-bold uppercase tracking-wider text-center border-l-4 ${signupMessage.type === 'success' ? 'bg-lime-50 text-lime-800 border-lime-500 dark:bg-lime-900/30' : 'bg-red-50 text-red-800 border-red-500 dark:bg-red-900/30'}`}>
                  {signupMessage.text}
                </div>
              )}
            </form>
          </div>
        </motion.div>
      </main>

      {/* FORM RESET MODAL DIALOG */}
      <AnimatePresence>
        {activeModal !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-sm rounded bg-white p-6 shadow-2xl dark:bg-slate-900 border-t-4 border-red-500"
            >
              <h4 className="mb-2 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Clear Active Input Fields?</h4>
              <p className="mb-6 text-xs font-medium text-slate-500 leading-relaxed">
                This choice resets your continuous auto-save database cache slice for this template view and drops tracked changes entirely.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 bg-slate-100 py-3 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => clearFormState(activeModal)}
                  className="flex-1 bg-red-500 py-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-red-600 shadow-md shadow-red-500/30 transition-all"
                >
                  Reset System Draft
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
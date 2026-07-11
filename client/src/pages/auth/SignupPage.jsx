import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../components/Navbar';
import ThemeToggle from '../../components/ThemeToggle';
import { signup, googleSignup } from '../../api/client';
import {
  MapPin,
  AlertTriangle,
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

      setGoogleUser(payload);
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
        setTimeout(() => navigate('/admin/coaches'), 1000);
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
        setTimeout(() => navigate('/admin/coaches'), 1000);
      }
    } catch (error) {
      setSignupMessage({ text: error.message, type: 'error' });
    } finally {
      setSignupLoading(false);
    }
  };

  // Shared utility string to suppress white background states on inputs across all viewports
  const inputThemeStyles =
    'input-field bg-[var(--color-input)] dark:bg-[#09090b] text-foreground border-border focus:border-accent focus:ring-accent/20 autofill:shadow-[0_0_0_30px_var(--color-input)_inset] autofill:text-foreground';

  return (
    <div className="bg-surface text-foreground min-h-screen">
      <Navbar>
        <Link to="/" className="text-sm font-medium text-muted hover:text-foreground">
          Home
        </Link>
        <Link to="/login" className="text-sm font-medium text-muted hover:text-foreground">
          Login
        </Link>
        <ThemeToggle />
      </Navbar>

      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Create Your Academy Workspace</h1>
            <p className="text-muted mx-auto mt-4 max-w-md text-sm sm:text-base">
              Provision isolated multi-tenant records nodes and structural administrator
              properties concurrently.
            </p>
          </div>

          <div className="card bg-surface-secondary border-border border p-8 shadow-lg">
            <h3 className="mb-1 text-xl font-black tracking-tight">Academy Workspace Setup</h3>
            <p className="text-muted mb-6 text-xs">
              Already have an active system domain configured?{' '}
              <Link to="/login/admin" className="text-accent font-bold hover:underline">
                Admin Entrance Port
              </Link>
            </p>

            {/* Google Sign In Button */}
            {!isGoogleAuth && (
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-surface-secondary px-2 text-muted">Or continue with</span>
                  </div>
                </div>
                <div className="mt-4 flex justify-center">
                  <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
                </div>
              </div>
            )}

            {isGoogleAuth && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center gap-3">
                  {googleUser?.picture && (
                    <img
                      src={googleUser.picture}
                      alt="Google Profile"
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                      Connected as {googleUser?.name}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      {googleUser?.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGoogleAuth(false);
                      setGoogleUser(null);
                      setSignupForm((prev) => ({ ...prev, name: '', email: '' }));
                    }}
                    className="ml-auto text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 underline"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSignupSubmit} noValidate className="space-y-5">
              <div>
                <label className="label" htmlFor="signupName">
                  Full Legal Name
                </label>
                <input
                  className={inputThemeStyles}
                  id="signupName"
                  name="name"
                  value={signupForm.name || ''}
                  onChange={handleSignupChange}
                  required
                  readOnly={isGoogleAuth}
                  disabled={isGoogleAuth}
                />
                {isGoogleAuth && (
                  <p className="text-xs text-muted mt-1">Auto-filled from Google account</p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="signupEmail">
                  Identity Email
                </label>
                <input
                  className={inputThemeStyles}
                  type="email"
                  id="signupEmail"
                  name="email"
                  value={signupForm.email || ''}
                  onChange={handleSignupChange}
                  required
                  readOnly={isGoogleAuth}
                  disabled={isGoogleAuth}
                />
                {isGoogleAuth && (
                  <p className="text-xs text-muted mt-1">Auto-filled from Google account</p>
                )}
              </div>
              {!isGoogleAuth && (
                <div>
                  <label className="label" htmlFor="signupPassword">
                    Security Password (Min 6 Characters)
                  </label>
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
              )}
              {isGoogleAuth && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    Password is not required for Google Sign In.
                  </p>
                </div>
              )}
              <div>
                <label className="label" htmlFor="signupAcademy">
                  Academy Corporate Name
                </label>
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
                <label className="label" htmlFor="signupLogo">
                  Academy Logo (Optional)
                </label>
                <input
                  className={inputThemeStyles}
                  type="file"
                  id="signupLogo"
                  name="logo"
                  onChange={handleSignupChange}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                />
                <p className="text-muted-foreground text-xs mt-1">
                  JPG, JPEG, PNG, or WEBP (Max 5MB)
                </p>
              </div>
              <div>
                <label className="label" htmlFor="signupPhone">
                  Contact Number
                </label>
                <input
                  className={inputThemeStyles}
                  type="tel"
                  id="signupPhone"
                  name="phone_number"
                  value={signupForm.phone_number || ''}
                  onChange={handleSignupChange}
                />
              </div>

              {/* GPS Location Setup */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="signupCity">
                    City <span className="text-red-500">*</span>
                  </label>
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
                  <label className="label" htmlFor="signupState">
                    State <span className="text-red-500">*</span>
                  </label>
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

              <div>
                <label className="label" htmlFor="signupAddress">
                  Full Address (Optional)
                </label>
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
                <label className="label" htmlFor="signupRadius">
                  Attendance Radius (meters)
                </label>
                <input
                  className={inputThemeStyles}
                  type="number"
                  id="signupRadius"
                  name="attendance_radius_meters"
                  value={signupForm.attendance_radius_meters || 100}
                  onChange={handleSignupChange}
                  min="50"
                  max="5000"
                />
                <p className="text-xs text-muted mt-1">
                  Maximum distance from academy location for attendance verification (50-5000m)
                </p>
              </div>

              <div className="p-4 bg-surface-secondary border border-border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    <label className="font-semibold text-sm">Academy Location</label>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400 text-sm font-medium flex items-center gap-2"
                  >
                    {gettingLocation ? 'Getting Location...' : 'Set Academy Location'}
                  </motion.button>
                </div>

                {gpsError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-3">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs">{gpsError}</p>
                  </div>
                )}

                {signupForm.latitude && signupForm.longitude && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700">
                      <span className="font-medium">Location captured:</span>
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Lat: {signupForm.latitude.toFixed(7)}
                      <br />
                      Lon: {signupForm.longitude.toFixed(7)}
                    </p>
                  </div>
                )}

                {!signupForm.latitude && !signupForm.longitude && !gpsError && (
                  <p className="text-xs text-muted mt-2">
                    Click "Set Academy Location" to capture GPS coordinates for attendance verification
                  </p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="signupPlan">
                  Core Subscribed Workspace Tier
                </label>
                <select
                  className={`${inputThemeStyles} cursor-pointer py-3`}
                  id="signupPlan"
                  name="subscription_plan"
                  value={signupForm.subscription_plan || 'free'}
                  onChange={handleSignupChange}
                  required
                >
                  <option value="free" className="bg-surface text-foreground">
                    Free Starter Tier — Max 3 Coaches / 30 Student Matrix
                  </option>
                  <option value="pro" className="bg-surface text-foreground">
                    Pro Academy Tier — Max 6 Coaches / 80 Student Matrix
                  </option>
                  <option value="plus" className="bg-surface text-foreground">
                    Plus Enterprise Tier — Complete Unrestricted Operational Pipelines
                  </option>
                </select>
              </div>
              <div className="flex gap-4 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="btn-gradient-primary shadow-accent/10 flex-1 rounded-xl py-3.5 text-sm font-bold tracking-wide shadow-md"
                  disabled={signupLoading}
                >
                  {signupLoading ? 'Configuring instances...' : 'Create Academy Account'}
                </motion.button>
                <button
                  type="button"
                  className="btn-secondary text-muted px-5 transition-transform active:scale-95"
                  onClick={() => setActiveModal('signup')}
                >
                  Clear Form
                </button>
              </div>
              {signupMessage.text && (
                <p
                  className={
                    signupMessage.type === 'success' ? 'alert-success m-0 mt-4' : 'alert-error m-0 mt-4'
                  }
                  role="alert"
                >
                  {signupMessage.text}
                </p>
              )}
            </form>
          </div>
        </motion.div>
      </main>

      {/* FORM RESET DRAFT PROTECTION MODAL DIALOG */}
      <AnimatePresence>
        {activeModal !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="card bg-surface border-border w-full max-w-md border p-8 shadow-2xl"
            >
              <h4 className="text-foreground mb-2 text-xl font-black tracking-tight">
                Clear Active Input Fields?
              </h4>
              <p className="text-muted mb-6 text-sm leading-relaxed">
                This choice resets your continuous auto-save database cache slice for this
                template view and drops tracked changes entirely.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setActiveModal(null)}
                  className="btn-secondary px-4 py-2.5 text-sm font-bold transition-transform active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => clearFormState(activeModal)}
                  className="btn-gradient-orange rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all active:scale-95"
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

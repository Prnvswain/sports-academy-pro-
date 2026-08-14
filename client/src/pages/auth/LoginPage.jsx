import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import ThemeToggle from '../../components/ThemeToggle';
import { googleLogin } from '../../api/client';
import {
  Building2,
  User,
  Users,
  ArrowRight,
} from 'lucide-react';

const GoogleLoginButton = ({ onSuccess, onError }) => {
  const [GoogleLogin, setGoogleLogin] = useState(null);
  const [GoogleOAuthProvider, setGoogleOAuthProvider] = useState(null);
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (id) {
      setClientId(id);
      import('@react-oauth/google').then(({ GoogleLogin: GL, GoogleOAuthProvider: GOP }) => {
        setGoogleLogin(() => GL);
        setGoogleOAuthProvider(() => GOP);
      }).catch((err) => {
        console.error('Failed to load Google Login component:', err);
        setError('Google Login component failed to load');
      });
    }
  }, []);

  if (error || !GoogleLogin || !GoogleOAuthProvider || !clientId) return null;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        useOneTap={false}
        theme="outline"
        size="large"
        text="signin_with"
        shape="rectangular"
        logo_alignment="left"
      />
    </GoogleOAuthProvider>
  );
};

const loginOptions = [
  {
    title: 'Admin',
    description: 'Academy administrators and staff',
    icon: Building2,
    path: '/login/admin',
    cardBg: 'bg-amber-400 border-amber-400 dark:border-amber-400',
    iconBg: 'bg-slate-950/10 text-slate-950',
    titleColor: 'text-slate-950',
    descColor: 'text-slate-800',
    linkColor: 'text-slate-950 hover:text-slate-900',
    arrowColor: 'text-slate-950',
  },
  {
    title: 'Coach',
    description: 'Coaches and trainers',
    icon: User,
    path: '/coach/login',
    cardBg: 'bg-red-500 border-red-500 dark:border-red-500',
    iconBg: 'bg-white/20 text-white',
    titleColor: 'text-white',
    descColor: 'text-red-100',
    linkColor: 'text-white hover:text-red-100',
    arrowColor: 'text-white',
  },
  {
    title: 'Parent',
    description: 'Parents and guardians',
    icon: Users,
    path: '/parent/login',
    cardBg: 'bg-blue-600 border-blue-600 dark:border-blue-600',
    iconBg: 'bg-white/20 text-white',
    titleColor: 'text-white',
    descColor: 'text-blue-100',
    linkColor: 'text-white hover:text-blue-100',
    arrowColor: 'text-white',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleMessage, setGoogleMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    document.body.classList.add('login-portal-root');
    return () => {
      document.body.classList.remove('login-portal-root');
    };
  }, []);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setGoogleLoading(true);
      setGoogleMessage({ text: 'Logging in with Google...', type: 'success' });
      const result = await googleLogin({ google_id_token: credentialResponse.credential });
      setGoogleMessage({ text: 'Login successful! Redirecting...', type: 'success' });
      setTimeout(() => navigate('/admin/dashboard'), 500);
    } catch (error) {
      setGoogleMessage({ text: error.message || 'Google login failed', type: 'error' });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = (error) => {
    setGoogleMessage({ text: 'Google authentication failed. Please try again.', type: 'error' });
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen text-slate-900 dark:text-white font-sans selection:bg-lime-400 selection:text-slate-900 flex flex-col relative">
      
      {/* FULL PAGE DYNAMIC BACKGROUND */}
      <div className="fixed inset-0 w-full h-full bg-slate-900 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#a3e635 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="absolute top-0 right-0 h-full w-full bg-lime-500 origin-top-right transition-transform" style={{ clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 15% 100%)' }}></div>
      </div>

      <div className="relative z-20">
        <Navbar>
          <Link to="/" className="text-xs font-black uppercase tracking-wider text-slate-700 hover:text-lime-600 dark:text-slate-200">Home</Link>
          <Link to="/signup" className="text-xs font-black uppercase tracking-wider text-slate-700 hover:text-lime-600 dark:text-slate-200">Sign Up</Link>
          <ThemeToggle />
        </Navbar>
      </div>

      {/* Reduced py-12 to py-6 */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-3xl space-y-6" /* Reduced space-y-10 to space-y-6 */
        >
          {/* Header Text */}
          <div className="text-center">
            {/* Added text-white explicitly to the h1 */}
            <h1 className="text-white text-3xl font-black tracking-tight sm:text-5xl uppercase drop-shadow-md">
              WELCOME <span className="bg-slate-900 text-lime-400 px-3 ml-2">BACK</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[10px] font-black uppercase tracking-widest text-slate-200 drop-shadow-sm">
              Select your role to continue
            </p>
          </div>

          {/* Login Card */}
          {/* Reduced padding from p-8 sm:p-10 to p-6 sm:p-8 */}
          <div className="bg-white border-2 border-slate-100 p-6 sm:p-8 shadow-2xl dark:bg-slate-800 dark:border-slate-700 relative">
             <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-lime-500" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>

             {/* Reduced mb-10 to mb-6 */}
             <div className="flex justify-center mb-6 relative z-10">
                <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
             </div>

             {googleMessage.text && (
                /* Reduced mb-8 to mb-4 and p-4 to p-3 */
                <p className={`p-3 text-center text-[10px] font-bold uppercase tracking-widest border-l-4 mb-4 ${googleMessage.type === 'success' ? 'bg-lime-50 text-lime-800 border-lime-500' : 'bg-red-50 text-red-700 border-red-500'}`}>
                  {googleMessage.text}
                </p>
             )}

             {/* Reduced mb-10 to mb-6 */}
             <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white dark:bg-slate-800 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Or login with role</span>
                </div>
             </div>

             {/* Reduced gap-6 to gap-4 */}
             <div className="grid gap-4 sm:grid-cols-3 relative z-10">
                {loginOptions.map((option) => (
                  <Link key={option.path} to={option.path} className="group">
                    <motion.div
                      whileHover={{ y: -6, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`border-2 h-full p-5 rounded-2xl transition-all shadow-lg hover:shadow-2xl flex flex-col justify-between ${option.cardBg}`}
                    >
                      <div>
                        {/* Icon Wrapper */}
                        <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl shadow-inner ${option.iconBg}`}>
                          <option.icon className="h-6 w-6" />
                        </div>
                        {/* Title */}
                        <h3 className={`mb-2 text-sm font-black uppercase tracking-tight ${option.titleColor}`}>
                          {option.title}
                        </h3>
                        {/* Description */}
                        <p className={`text-[10px] font-medium mb-4 leading-relaxed ${option.descColor}`}>
                          {option.description}
                        </p>
                      </div>
                      <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${option.linkColor}`}>
                        Login <ArrowRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${option.arrowColor}`} />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-200 drop-shadow-md">
              New academy?{' '}
              <Link to="/signup" className="text-lime-400 hover:underline font-black">
                Create your account
              </Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
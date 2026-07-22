import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function BrandingLogo({ 
  to = '/', 
  collapsed = false,
  onLogoClick = null,
  className = ''
}) {
  return (
    <Link
      to={to}
      className={`group flex select-none items-center gap-3 outline-none ${className}`}
      onClick={onLogoClick}
    >
      {/* Logo Image - Static from public folder */}
      <img
        src="/logo.png"
        alt="Academy Logo"
        className="h-10 w-10 object-contain transition-all duration-300 group-hover:scale-105"
      />
      
      {/* Sports Academy Pro Text Layout - Sidebar-optimized for dark backgrounds */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: collapsed ? 0 : 1, display: collapsed ? 'none' : 'block' }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center -space-y-1 pt-1"
      >
        <span className="text-[13px] sm:text-base font-black italic uppercase tracking-wide text-white transition-colors duration-300 group-hover:text-slate-200 leading-none drop-shadow-md">
          SPORTS ACADEMY
        </span>
        <span className="text-[11px] sm:text-[13px] font-black italic uppercase tracking-widest text-lime-400 leading-none drop-shadow-sm">
          PRO
        </span>
      </motion.div>
    </Link>
  );
}

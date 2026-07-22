import { motion } from 'framer-motion';

// ====================================================
// 1. PAGE CONTAINERS (Compact Spacing)
// ====================================================
export const PageContainer = ({ children }) => (
  <div className="flex flex-col gap-4 w-full">
    {children}
  </div>
);

export const SectionHeader = ({ title }) => (
  <div className="mb-1">
    <h2 className="text-[20px] font-bold text-[#0F172A] dark:text-white tracking-tight leading-none">{title}</h2>
  </div>
);

// ====================================================
// 2. PREMIUM COMPACT CARDS (18px Radius, Hover Lift)
// ====================================================
export const PremiumCard = ({ children, className = '', noPadding = false }) => (
  <motion.div 
    whileHover={{ y: -2 }}
    transition={{ duration: 0.15 }}
    className={`bg-white dark:bg-[#1E293B] rounded-[18px] shadow-[0_10px_25px_rgba(34,197,94,0.08)] border border-[#E2E8F0] dark:border-slate-800 transition-all duration-150 ${noPadding ? '' : 'p-4'} ${className}`}
  >
    {children}
  </motion.div>
);

// ====================================================
// 3. STAT CARDS (Reduced Padding & Height)
// ====================================================
export const StatCard = ({ title, value, subtitle, icon, colorHex = "#16A34A" }) => {
  return (
    <div 
      className="bg-white dark:bg-[#1E293B] rounded-[18px] p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-[0_10px_25px_rgba(34,197,94,0.08)] relative overflow-hidden flex flex-col gap-2 transition-all duration-150 hover:-translate-y-[2px]"
      style={{ borderTop: `3px solid ${colorHex}` }}
    >
      <div className="flex justify-between items-start">
        <div className="p-2 rounded-[10px] shadow-sm" style={{ backgroundImage: `linear-gradient(135deg, ${colorHex}15, ${colorHex}30)`, color: colorHex }}>
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-[24px] font-bold text-[#0F172A] dark:text-white tracking-tight leading-none mb-1">{value}</h3>
        <p className="text-[13px] font-medium text-[#64748B] dark:text-slate-400">{title}</p>
        {subtitle && <p className="text-[12px] text-[#94A3B8] mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

// ====================================================
// 4. COMPACT FORMS & BUTTONS
// ====================================================
export const FormInput = ({ label, ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-[13px] font-medium text-[#0F172A] dark:text-slate-300">{label}</label>}
    <input 
      className="h-10 w-full rounded-[10px] border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 text-[14px] text-[#0F172A] dark:text-white focus:bg-white focus:border-[#27C34A] focus:ring-1 focus:ring-[#27C34A] transition-all duration-150 outline-none placeholder:text-[#94A3B8] shadow-sm"
      {...props} 
    />
  </div>
);

export const PrimaryButton = ({ children, onClick, type = "button", className = "" }) => (
  <motion.button 
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.15 }}
    type={type}
    onClick={onClick}
    className={`h-10 px-5 rounded-[10px] bg-gradient-to-r from-[#27C34A] to-[#84D400] text-white text-[14px] font-bold shadow-[0_4px_10px_rgba(34,197,94,0.25)] flex flex-row items-center justify-center gap-2 leading-none ${className}`}
  >
    {children}
  </motion.button>
);

// ====================================================
// 5. COMPACT TABLES (Light Green Header)
// ====================================================
export const TableContainer = ({ children }) => (
  <div className="w-full bg-white dark:bg-[#1E293B] rounded-[18px] shadow-[0_10px_25px_rgba(34,197,94,0.08)] border border-[#E2E8F0] dark:border-slate-800 overflow-hidden transition-all duration-150 hover:-translate-y-[2px]">
    <div className="overflow-x-auto custom-scrollbar">
      {/* Target the header and hover rows from your parent component directly or structure it inside here */}
      <table className="w-full text-[13px] text-left">
        {/* Child Table content. In your actual table components, use <thead className="bg-[#F4FFE9]"> and <tr className="hover:bg-[#F7FFF1]"> */}
        {children}
      </table>
    </div>
  </div>
);
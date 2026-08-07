import { useTheme } from '../context/ThemeContext';

export default function GlobalBackground({ overrideColor }) {
  const { isDark } = useTheme();

  const bg = overrideColor || (isDark
    ? 'linear-gradient(135deg, #0f172a 0%, #090d16 50%, #020617 100%)'
    : 'linear-gradient(135deg, #F97316 0%, #FACC15 50%, #FFFFFF 100%)');

  return (
    <div className="absolute inset-0 -z-10 bg-slate-50 dark:bg-slate-950 select-none pointer-events-none overflow-visible">
      {/* Gradient top covering the hero + curve area */}
      <div className="w-full h-[calc(40dvh+12rem)] relative overflow-hidden" style={{ background: bg }}>
        {/* Curve cutout at the bottom filled with body background color */}
        <div className="absolute bottom-0 left-0 right-0 overflow-visible" style={{ color: isDark ? '#020617' : '#f8fafc' }}>
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-48 fill-current overflow-visible">
            <path d="M0,90 C0,90 180,180 360,180 C720,180 1080,0 1440,0 L1440,320 L0,320 Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

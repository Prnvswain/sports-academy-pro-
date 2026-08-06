import { useTheme } from '../context/ThemeContext';

export default function GlobalBackground({ overrideColor }) {
  const { isDark } = useTheme();

  const bg = overrideColor || (isDark
    ? 'linear-gradient(135deg, #0f172a 0%, #090d16 50%, #020617 100%)'
    : 'linear-gradient(135deg, #F97316 0%, #FACC15 50%, #FFFFFF 100%)');

  return (
    <div className="absolute inset-0 -z-10 bg-slate-50 dark:bg-slate-950 select-none pointer-events-none overflow-visible">
      {/* Gradient top 30% (30vh height) - using theme background gradient or override */}
      <div className="w-full h-[30dvh] relative overflow-visible" style={{ background: bg }}>
        {/* Curve transition to the background color */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-[99%] overflow-visible" style={{ color: isDark ? '#020617' : '#FACC15' }}>
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-48 fill-current overflow-visible">
            <path d="M0,0 L1440,0 L1440,0 C1080,0 720,180 360,180 C180,180 0,90 0,90 Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

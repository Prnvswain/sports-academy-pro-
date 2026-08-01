export default function GlobalBackground({ overrideColor }) {
  const bg = overrideColor || 'var(--theme-background-gradient, #FFC400)';
  return (
    <div className="absolute inset-0 -z-10 bg-slate-50 dark:bg-slate-950 select-none pointer-events-none overflow-visible">
      {/* Yellow top 30% (30vh height) - using theme background gradient or override */}
      <div className="w-full h-[30dvh] relative overflow-visible" style={{ backgroundColor: bg }}>
        {/* Curve transition to the background color */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-[99%] overflow-visible" style={{ color: bg }}>
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-48 fill-current overflow-visible">
            <path d="M0,0 L1440,0 L1440,10 C960,320 480,320 0,10 Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

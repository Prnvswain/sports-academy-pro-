import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Lock, MapPin, ClipboardCheck, Play, Square, Loader2 } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   StickyWorkflowBar
   4-step compact interactive progress strip fixed at the bottom.
   All state is passed in as props — zero new APIs or logic.
   ───────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    id: 1,
    label: 'GPS Verify',
    sectionId: 'section-gps-verify',
    icon: MapPin,
    doneKey: 'step1Done',
    activeKey: 'step1Active',
    loadingKey: 'step1Loading',
    onKey: 'onStep1',
    disabledKey: 'step1Disabled',
    btnLabel: 'Capture',
    loadingLabel: 'Capturing…',
  },
  {
    id: 2,
    label: 'Attendance',
    sectionId: 'section-mark-attendance',
    icon: ClipboardCheck,
    doneKey: 'step2Done',
    activeKey: 'step2Active',
    loadingKey: 'step2Loading',
    onKey: 'onStep2',
    disabledKey: 'step2Disabled',
    btnLabel: 'Mark Attendance',
    loadingLabel: 'Marking…',
  },
  {
    id: 3,
    label: 'Start Batch',
    sectionId: 'section-batch-checkin',
    icon: Play,
    doneKey: 'step3Done',
    activeKey: 'step3Active',
    loadingKey: 'step3Loading',
    onKey: 'onStep3',
    disabledKey: 'step3Disabled',
    btnLabel: 'Start Batch',
    loadingLabel: 'Starting…',
  },
  {
    id: 4,
    label: 'End Batch',
    sectionId: 'section-batch-checkout',
    icon: Square,
    doneKey: 'step4Done',
    activeKey: 'step4Active',
    loadingKey: 'step4Loading',
    onKey: 'onStep4',
    disabledKey: 'step4Disabled',
    btnLabel: 'End Batch',
    loadingLabel: 'Ending…',
  },
];

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export default function StickyWorkflowBar({ batchName, allDone, ...props }) {
  const [leftOffset, setLeftOffset] = useState(0);
  const [barWidth, setBarWidth] = useState('100%');

  useEffect(() => {
    const updateDimensions = () => {
      const asideElement = document.querySelector('aside');
      if (asideElement && window.innerWidth >= 1024) {
        const rect = asideElement.getBoundingClientRect();
        setLeftOffset(rect.width);
        setBarWidth(`calc(100% - ${rect.width}px)`);
      } else {
        setLeftOffset(0);
        setBarWidth('100%');
      }
    };

    updateDimensions();
    const interval = setInterval(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return createPortal(
    <motion.div
      key="sticky-workflow"
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="fixed bottom-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_32px_rgba(0,0,0,0.15)]"
      style={{ 
        left: `${leftOffset}px`,
        width: barWidth,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Batch label strip */}
      <div className="max-w-5xl mx-auto px-3 pt-2 pb-0 flex items-center gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate">
          {batchName}
        </span>
        <AnimatePresence>
          {allDone && (
            <motion.span
              key="all-done"
              initial={{ opacity: 0, scale: 0.8, x: 8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="ml-auto flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800"
            >
              <CheckCircle2 className="w-3 h-3" />
              Today's workflow completed
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Step cards row */}
      <div className="max-w-5xl mx-auto px-3 py-2 flex items-stretch gap-0">
        {STEPS.map((step, idx) => {
          const isDone = !!props[step.doneKey];
          const isActive = !isDone && !!props[step.activeKey];
          const isLoading = !!props[step.loadingKey];
          const isDisabled = !!props[step.disabledKey];
          const isLocked = !isDone && !isActive;
          const onAction = props[step.onKey];
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              {/* ── Step card ── */}
              <motion.div
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: isLocked ? 0.5 : 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.3 }}
                onClick={() => !isLocked && scrollToSection(step.sectionId)}
                className={[
                  'flex-1 min-w-0 flex flex-col gap-1 px-2.5 py-2 rounded-xl border transition-all duration-200',
                  isDone
                    ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/50 cursor-pointer'
                    : isActive
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 shadow-md ring-1 ring-amber-300/40 dark:ring-amber-700/40 cursor-pointer'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 cursor-default',
                ].join(' ')}
              >
                {/* Top row: badge + label */}
                <div className="flex items-center gap-1.5">
                  <span className={[
                    'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold',
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isActive
                        ? 'bg-amber-400 dark:bg-amber-500 text-white'
                        : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400',
                  ].join(' ')}>
                    {isDone
                      ? <CheckCircle2 className="w-3 h-3" />
                      : isLocked
                        ? <Lock className="w-2.5 h-2.5" />
                        : step.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={[
                      'text-[9px] font-extrabold uppercase tracking-widest leading-none',
                      isDone ? 'text-emerald-500 dark:text-emerald-400'
                        : isActive ? 'text-amber-500 dark:text-amber-400'
                          : 'text-slate-400 dark:text-slate-500',
                    ].join(' ')}>
                      Step {step.id}
                    </p>
                    <p className={[
                      'text-[10px] sm:text-xs font-bold truncate leading-snug',
                      isDone ? 'text-emerald-700 dark:text-emerald-300'
                        : isActive ? 'text-amber-800 dark:text-amber-200'
                          : 'text-slate-400 dark:text-slate-500',
                    ].join(' ')}>
                      {step.label}
                    </p>
                  </div>
                </div>

                {/* Action row */}
                <AnimatePresence mode="wait">
                  {isDone ? (
                    <motion.span
                      key="done-badge"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="self-start flex items-center gap-1 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Completed
                    </motion.span>
                  ) : isActive ? (
                    <motion.button
                      key="action-btn"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      whileHover={!isDisabled && !isLoading ? { scale: 1.03 } : {}}
                      whileTap={!isDisabled && !isLoading ? { scale: 0.95 } : {}}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDisabled && !isLoading) onAction?.();
                      }}
                      disabled={isDisabled || isLoading}
                      className={[
                        'self-start flex items-center gap-1 text-[10px] font-extrabold text-white px-2.5 py-1 rounded-lg transition-all',
                        isDisabled || isLoading
                          ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed opacity-70'
                          : 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 shadow-sm',
                      ].join(' ')}
                    >
                      {isLoading
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Icon className="w-3 h-3" />}
                      <span className="hidden sm:inline whitespace-nowrap">
                        {isLoading ? step.loadingLabel : step.btnLabel}
                      </span>
                    </motion.button>
                  ) : (
                    <motion.span
                      key="locked-badge"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="self-start flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span className="hidden sm:inline">Locked</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div className="flex-shrink-0 w-3 sm:w-4 flex items-center justify-center self-center mt-1">
                  <motion.div
                    animate={{
                      backgroundColor:
                        !!props[STEPS[idx + 1].doneKey]
                          ? '#10b981'
                          : !!props[STEPS[idx + 1].activeKey]
                            ? '#f59e0b'
                            : '#e2e8f0',
                    }}
                    transition={{ duration: 0.4 }}
                    className="h-0.5 w-full rounded-full dark:opacity-80"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>,
    document.body
  );
}
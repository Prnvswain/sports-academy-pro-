import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function StandardModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'lg', // sm, md, lg, xl, 2xl
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`w-full ${sizeClasses[size]} max-h-[90vh] bg-white overflow-hidden rounded-[2rem] shadow-[0_10px_25px_rgba(0,0,0,0.12)] border border-[#EAEBF0] flex flex-col transition-colors duration-200 z-[1000]`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-8 py-6 border-b border-[#EAEBF0] bg-[#FFFDF3] shrink-0">
                <div>
                  {title && <h3 className="text-lg font-bold text-[#101625]">{title}</h3>}
                  {subtitle && <p className="text-[10px] text-[#A4ABAF] font-bold mt-1 tracking-wide uppercase">{subtitle}</p>}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white shadow-sm border border-[#EAEBF0] text-[#A4ABAF] hover:bg-[#fcc93d] hover:text-[#101625] hover:border-transparent transition-all"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8">
              {children}
            </div>

            {/* Fixed Footer */}
            {footer && (
              <div className="px-8 py-6 border-t border-[#EAEBF0] bg-white shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return isOpen ? createPortal(modalContent, document.body) : null;
}

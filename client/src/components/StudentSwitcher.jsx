import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveStudent } from '../context/ActiveStudentContext';
import { Users, ChevronDown, Check, User, Calendar, Trophy } from 'lucide-react';

export default function StudentSwitcher() {
  const { students, activeStudent, switchStudent, switchMessage } = useActiveStudent();
  const [isOpen, setIsOpen] = useState(false);

  if (students.length <= 1) return null;

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {switchMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2"
          >
            <Check size={16} />
            {switchMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Switcher Button */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 bg-black/10 hover:bg-black/20 rounded-full px-4 py-2 transition-all duration-250 shadow-lg shadow-black/20"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-black">
            {activeStudent?.photo ? (
              <img 
                src={activeStudent.photo} 
                alt={activeStudent.name} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(activeStudent?.name)
            )}
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-slate-900 leading-tight">{activeStudent?.name || 'Loading...'}</p>
            <p className="text-[10px] font-bold text-slate-600">{activeStudent?.batch?.name || 'No Batch'}</p>
          </div>
          <ChevronDown size={16} className="text-slate-700" />
        </motion.button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-3 border-b border-border">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">Select Child</p>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {students.map((student) => (
                    <button
                      key={student.student_id}
                      onClick={() => {
                        switchStudent(student);
                        setIsOpen(false);
                      }}
                      className="w-full p-3 hover:bg-muted/50 transition-colors text-left flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                        {student.photo ? (
                          <img 
                            src={student.photo} 
                            alt={student.name} 
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          getInitials(student.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-foreground truncate">{student.name}</p>
                          {activeStudent?.student_id === student.student_id && (
                            <Check size={14} className="text-primary flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                            <Trophy size={10} />
                            {student.sport?.name || 'No Sport'}
                          </span>
                          {student.batch?.name && (
                            <>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                <Calendar size={10} />
                                {student.batch.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { parentGet } from '../api/client';

const ACTIVE_STUDENT_KEY = 'parent_active_student_id';

const ActiveStudentContext = createContext(null);

export function ActiveStudentProvider({ children }) {
  const [students, setStudents] = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [switchMessage, setSwitchMessage] = useState(null);

  // Load students and restore active student from localStorage
  const loadStudents = useCallback(async () => {
    console.log('[ActiveStudentContext] Starting loadStudents...');
    setLoading(true);
    setError('');
    try {
      console.log('[ActiveStudentContext] Fetching /parent/children...');
      const response = await parentGet('/parent/children');
      const studentsData = response?.data || [];
      console.log('[ActiveStudentContext] Students fetched:', studentsData);
      setStudents(studentsData);

      // Restore active student from localStorage
      const savedStudentId = localStorage.getItem(ACTIVE_STUDENT_KEY);
      console.log('[ActiveStudentContext] Saved student ID from localStorage:', savedStudentId);
      
      if (studentsData.length > 0) {
        let selectedStudent;
        
        // If there's a saved student ID and it's still in the list, use it
        if (savedStudentId) {
          selectedStudent = studentsData.find(s => s.student_id === parseInt(savedStudentId, 10));
          console.log('[ActiveStudentContext] Found saved student:', selectedStudent);
        }
        
        // If no saved student or saved student not found, select the first one
        if (!selectedStudent) {
          selectedStudent = studentsData[0];
          localStorage.setItem(ACTIVE_STUDENT_KEY, String(selectedStudent.student_id));
          console.log('[ActiveStudentContext] Auto-selected first student:', selectedStudent);
        }
        
        setActiveStudent(selectedStudent);
        console.log('[ActiveStudentContext] Active student set:', selectedStudent);
      } else {
        console.log('[ActiveStudentContext] No students found, setting activeStudent to null');
        setActiveStudent(null);
      }
    } catch (err) {
      console.error('[ActiveStudentContext] Error loading students:', err);
      setError(err.message);
      setStudents([]);
      setActiveStudent(null);
    } finally {
      console.log('[ActiveStudentContext] Setting loading to false');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Switch active student
  const switchStudent = useCallback((student) => {
    if (!student || student.student_id === activeStudent?.student_id) return;
    
    setActiveStudent(student);
    localStorage.setItem(ACTIVE_STUDENT_KEY, String(student.student_id));
    
    // Show toast message
    setSwitchMessage(`Switched to: ${student.name}`);
    setTimeout(() => setSwitchMessage(null), 3000);
  }, [activeStudent]);

  // Clear active student (for logout)
  const clearActiveStudent = useCallback(() => {
    localStorage.removeItem(ACTIVE_STUDENT_KEY);
    setActiveStudent(null);
    setStudents([]);
  }, []);

  const value = useMemo(
    () => ({
      students,
      activeStudent,
      loading,
      error,
      switchStudent,
      clearActiveStudent,
      switchMessage,
      reloadStudents: loadStudents
    }),
    [students, activeStudent, loading, error, switchStudent, clearActiveStudent, switchMessage, loadStudents]
  );

  return (
    <ActiveStudentContext.Provider value={value}>{children}</ActiveStudentContext.Provider>
  );
}

export function useActiveStudent() {
  const ctx = useContext(ActiveStudentContext);
  if (!ctx) {
    throw new Error('useActiveStudent must be used within ActiveStudentProvider');
  }
  return ctx;
}

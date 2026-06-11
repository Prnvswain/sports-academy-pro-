import { useCallback, useEffect, useState } from 'react';

export function useFormDraft(storageKey, initialState) {
  const readDraft = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return initialState;
      return { ...initialState, ...JSON.parse(raw) };
    } catch {
      return initialState;
    }
  };

  const [form, setForm] = useState(readDraft);
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(form));
      setDraftSavedAt(new Date().toISOString());
    }, 400);
    return () => clearTimeout(timer);
  }, [form, storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setForm(initialState);
    setDraftSavedAt(null);
  }, [initialState, storageKey]);

  const updateField = useCallback((event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  return { form, setForm, updateField, clearDraft, draftSavedAt };
}

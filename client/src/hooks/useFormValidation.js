import { useState, useCallback } from 'react';

export const useFormValidation = (initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setValue = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const setTouchedField = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const setError = useCallback((field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearError = useCallback((field) => {
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setBackendErrors = useCallback((backendErrors) => {
    setErrors(backendErrors);
  }, []);

  const validateField = useCallback((field, validationRules, value) => {
    const fieldValue = value !== undefined ? value : values[field];
    const fieldErrors = [];

    if (validationRules.required && (!fieldValue || fieldValue === '')) {
      fieldErrors.push(validationRules.requiredMessage || `${field} is required`);
    }

    if (validationRules.minLength && fieldValue && fieldValue.length < validationRules.minLength) {
      fieldErrors.push(`${field} must be at least ${validationRules.minLength} characters`);
    }

    if (validationRules.maxLength && fieldValue && fieldValue.length > validationRules.maxLength) {
      fieldErrors.push(`${field} must not exceed ${validationRules.maxLength} characters`);
    }

    if (validationRules.pattern && fieldValue && !validationRules.pattern.test(fieldValue)) {
      fieldErrors.push(validationRules.patternMessage || `Invalid ${field} format`);
    }

    if (validationRules.custom && fieldValue) {
      const customError = validationRules.custom(fieldValue);
      if (customError) {
        fieldErrors.push(customError);
      }
    }

    if (fieldErrors.length > 0) {
      setError(field, fieldErrors[0]);
      return false;
    }

    clearError(field);
    return true;
  }, [values, setError, clearError]);

  const validateAll = useCallback((validationRules) => {
    let isValid = true;
    const newErrors = {};

    Object.keys(validationRules).forEach((field) => {
      const isFieldValid = validateField(field, validationRules[field]);
      if (!isFieldValid) {
        isValid = false;
        newErrors[field] = errors[field];
      }
    });

    if (!isValid) {
      setErrors(newErrors);
    }

    return isValid;
  }, [validateField, errors]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValue,
    setTouchedField,
    setError,
    clearError,
    clearAllErrors,
    setBackendErrors,
    validateField,
    validateAll,
    resetForm,
  };
};

export const validationRules = {
  required: (message) => ({ required: true, requiredMessage: message }),
  minLength: (length, message) => ({ minLength: length, minLengthMessage: message }),
  maxLength: (length, message) => ({ maxLength: length, maxLengthMessage: message }),
  pattern: (regex, message) => ({ pattern: regex, patternMessage: message }),
  custom: (fn) => ({ custom: fn }),
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: 'Enter a valid email address',
  },
  phone: {
    pattern: /^[0-9]{10}$/,
    patternMessage: 'Phone number must be 10 digits',
  },
  name: {
    pattern: /^[a-zA-Z\s]+$/,
    patternMessage: 'Name must contain only letters and spaces',
  },
};

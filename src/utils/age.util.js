/**
 * Age and Category Utility Functions
 * Handles automatic age calculation and player category determination
 */

/**
 * Calculate age from date of birth
 * @param {Date|string} dob - Date of birth
 * @returns {number|null} Age in years, or null if dob is invalid
 */
export const calculateAge = (dob) => {
  if (!dob) return null;

  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

/**
 * Determine player category based on age
 * @param {number} age - Age in years
 * @returns {string|null} Category (U8, U10, U12, U14, U16, U18, Senior), or null if age is invalid
 */
export const determineCategory = (age) => {
  if (age === null || age === undefined || isNaN(age)) return null;

  if (age >= 5 && age <= 8) return 'U8';
  if (age >= 9 && age <= 10) return 'U10';
  if (age >= 11 && age <= 12) return 'U12';
  if (age >= 13 && age <= 14) return 'U14';
  if (age >= 15 && age <= 16) return 'U16';
  if (age >= 17 && age <= 18) return 'U18';
  if (age > 18) return 'Senior';

  return null; // Under 5 years old
};

/**
 * Calculate both age and category from date of birth
 * @param {Date|string} dob - Date of birth
 * @returns {object} Object with age and category properties
 */
export const calculateAgeAndCategory = (dob) => {
  const age = calculateAge(dob);
  const category = determineCategory(age);

  return { age, category };
};

/**
 * Get category display name with styling info
 * @param {string} category - Category code
 * @returns {object} Object with display name and color class
 */
export const getCategoryDisplay = (category) => {
  const categoryStyles = {
    U8: { name: 'U8', color: 'bg-blue-100 text-blue-800' },
    U10: { name: 'U10', color: 'bg-green-100 text-green-800' },
    U12: { name: 'U12', color: 'bg-yellow-100 text-yellow-800' },
    U14: { name: 'U14', color: 'bg-orange-100 text-orange-800' },
    U16: { name: 'U16', color: 'bg-red-100 text-red-800' },
    U18: { name: 'U18', color: 'bg-purple-100 text-purple-800' },
    Senior: { name: 'Senior', color: 'bg-gray-100 text-gray-800' },
  };

  return categoryStyles[category] || { name: category || 'N/A', color: 'bg-gray-50 text-gray-600' };
};

/**
 * Get all available categories for filtering
 * @returns {Array} Array of category objects
 */
export const getAllCategories = () => {
  return [
    { value: 'U8', label: 'U8 (5-8 years)' },
    { value: 'U10', label: 'U10 (9-10 years)' },
    { value: 'U12', label: 'U12 (11-12 years)' },
    { value: 'U14', label: 'U14 (13-14 years)' },
    { value: 'U16', label: 'U16 (15-16 years)' },
    { value: 'U18', label: 'U18 (17-18 years)' },
    { value: 'Senior', label: 'Senior (18+ years)' },
  ];
};

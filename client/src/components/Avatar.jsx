/**
 * Avatar Component
 * Displays a circular avatar with either a profile photo or initials as fallback
 */

import React from 'react';

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials (up to 2 characters)
 */
const getInitials = (name) => {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  // Get first and last name initials
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return firstInitial + lastInitial;
};

/**
 * Get background color based on initials (for consistent colors)
 * @param {string} initials - Initials string
 * @returns {string} Tailwind color class
 */
const getAvatarColor = (initials) => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-cyan-500',
    'bg-emerald-500',
  ];
  
  // Simple hash function to get consistent color for same initials
  const hash = initials.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

/**
 * Avatar Component
 * @param {object} props - Component props
 * @param {string} props.src - Profile photo URL
 * @param {string} props.name - Full name for initials fallback
 * @param {string} props.alt - Alt text for image
 * @param {string} props.size - Size variant (sm, md, lg, xl)
 * @param {string} props.className - Additional CSS classes
 */
export default function Avatar({ src, name, alt = 'Avatar', size = 'md', className = '' }) {
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(initials);
  
  // Size classes
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };
  
  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  
  // If image source is provided and valid
  if (src) {
    return (
      <div className={`relative inline-flex items-center justify-center rounded-full overflow-hidden ${currentSizeClass} ${className}`}>
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials on image error
            e.target.style.display = 'none';
            e.target.parentElement.classList.add(avatarColor, 'text-white', 'flex', 'items-center', 'justify-center');
            e.target.parentElement.textContent = initials;
          }}
        />
      </div>
    );
  }
  
  // Fallback to initials
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full ${avatarColor} text-white font-semibold ${currentSizeClass} ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
}

/**
 * Fee Calculation Utility
 * Single source of truth for all student fee calculations across the client application
 */

/**
 * Calculate student fee components from enrollment data
 * @param {Object} enrollment - Student enrollment object with sport and duration_plan relations
 * @returns {Object} - Fee breakdown object
 */
export const calculateStudentFee = (enrollment) => {
  if (!enrollment) {
    return {
      sportsBaseFee: 0,
      planMultiplier: 1,
      sportsFee: 0,
      registrationFee: 0,
      additionalCharges: 0,
      discount: 0,
      totalComputedFee: 0,
    };
  }

  // Get the actual sport base fee from the sport relation (not the already-multiplied sports_fee)
  const sportsBaseFee = parseFloat(
    enrollment?.sport?.base_fee ||
    enrollment?.sports_base_fee ||
    enrollment?.sportsBaseFee ||
    0
  );

  // Get plan multiplier from duration plan
  const planMultiplier = parseFloat(
    enrollment?.duration_plan?.multiplier ||
    enrollment?.plan_multiplier ||
    enrollment?.planMultiplier ||
    1
  );

  // Calculate sports fee (base fee × multiplier, applied only once)
  const sportsFee = sportsBaseFee * planMultiplier;

  // Get other fee components
  const registrationFee = parseFloat(enrollment?.registration_fee || 0);
  const additionalCharges = parseFloat(enrollment?.additional_charges || 0);
  const discount = parseFloat(enrollment?.discount || 0);

  // Prefer stored final_fee if available, otherwise calculate
  const totalComputedFee = parseFloat(
    enrollment?.final_fee ||
    (sportsFee + registrationFee + additionalCharges - discount)
  );

  return {
    sportsBaseFee,
    planMultiplier,
    sportsFee,
    registrationFee,
    additionalCharges,
    discount,
    totalComputedFee,
  };
};

/**
 * Calculate balance due from enrollment and payment data
 * @param {Object} enrollment - Student enrollment object
 * @param {Number} amountPaid - Total amount paid from approved payments
 * @returns {Object} - Balance information
 */
export const calculateBalance = (enrollment, amountPaid = 0) => {
  const feeBreakdown = calculateStudentFee(enrollment);
  const paidAmount = parseFloat(amountPaid || 0);
  const balanceDue = Math.max(0, feeBreakdown.totalComputedFee - paidAmount);

  return {
    ...feeBreakdown,
    amountPaid: paidAmount,
    balanceDue,
  };
};

/**
 * Get plan name from enrollment
 * @param {Object} enrollment - Student enrollment object
 * @returns {String} - Plan name
 */
export const getPlanName = (enrollment) => {
  return (
    enrollment?.duration_plan?.name ||
    enrollment?.duration_plan ||
    'Standard'
  );
};

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
      assignedSportsFee: 0,
      sportsFee: 0,
      registrationFee: 0,
      additionalCharges: 0,
      discount: 0,
      trainingFee: 0,
      totalComputedFee: 0,
    };
  }

  // Get the actual sport base fee from the sport relation
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

  // Get other fee components
  const registrationFee = parseFloat(enrollment?.registration_fee || 0);
  const additionalCharges = parseFloat(enrollment?.additional_charges || 0);
  const discount = parseFloat(enrollment?.discount || 0);

  // Calculate Assigned Sports Fee and Training Fee dynamically
  const assignedSportsFee = sportsBaseFee * planMultiplier;
  const trainingFee = assignedSportsFee + registrationFee + additionalCharges - discount;

  return {
    sportsBaseFee,
    planMultiplier,
    assignedSportsFee,
    sportsFee: assignedSportsFee, // alias for backwards compatibility
    registrationFee,
    additionalCharges,
    discount,
    trainingFee,
    totalComputedFee: trainingFee, // alias for backwards compatibility
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
  const balanceDue = Math.max(0, feeBreakdown.trainingFee - paidAmount);

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

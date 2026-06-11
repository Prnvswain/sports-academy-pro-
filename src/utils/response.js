export const successResponse = (message, data = {}) => {
  return {
    success: true,
    message,
    data
  };
};

export const errorResponse = (message, data = {}) => {
  return {
    success: false,
    message,
    data
  };
};
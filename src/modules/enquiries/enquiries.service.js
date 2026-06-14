import prisma from '../../config/prisma.js';
import logger from '../../utils/logger.js';

export const getEnquiries = async (academyId) => {
  const enquiries = await prisma.enquiry.findMany({
    where: {
      academy_id: academyId
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // Map enquiry_id to id for frontend compatibility
  return enquiries.map(enq => ({
    ...enq,
    id: enq.enquiry_id
  }));
};

export const updateEnquiry = async (academyId, enquiryId, data) => {
  const { status, remarks } = data;

  const enquiry = await prisma.enquiry.findFirst({
    where: {
      enquiry_id: parseInt(enquiryId),
      academy_id: academyId
    }
  });

  if (!enquiry) {
    const error = new Error('Enquiry not found');
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};
  if (status) {
    updateData.status = status;
  }
  if (remarks !== undefined) {
    updateData.remarks = remarks;
  }

  const updated = await prisma.enquiry.update({
    where: { enquiry_id: parseInt(enquiryId) },
    data: updateData
  });

  logger.info('Enquiry updated', {
    enquiry_id: enquiryId,
    academy_id: academyId,
    status: updated.status
  });

  // Return with id field for frontend compatibility
  return {
    ...updated,
    id: updated.enquiry_id
  };
};

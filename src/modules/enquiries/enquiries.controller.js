import * as enquiriesService from './enquiries.service.js';
import { successResponse } from '../../utils/response.js';

export const getEnquiries = async (req, res, next) => {
  try {
    const data = await enquiriesService.getEnquiries(req.user.academy_id);
    res.json(successResponse('Enquiries retrieved successfully', data));
  } catch (err) {
    next(err);
  }
};

export const updateEnquiry = async (req, res, next) => {
  try {
    const enquiry = await enquiriesService.updateEnquiry(
      req.user.academy_id,
      req.params.id,
      req.body
    );
    res.json(successResponse('Enquiry updated successfully', enquiry));
  } catch (err) {
    next(err);
  }
};

import * as reportsService from './reports.service.js';
import { successResponse } from '../../utils/response.js';

export const exportReport = (type) => async (req, res, next) => {
  try {
    let csv;

    switch (type) {
      case 'monthly-collection':
        csv = await reportsService.exportMonthlyCollectionReport(req.user.academy_id);
        break;
      case 'pending-fees':
        csv = await reportsService.exportPendingFeesReport(req.user.academy_id);
        break;
      case 'student-fee':
        csv = await reportsService.exportStudentFeeReport(req.user.academy_id);
        break;
      case 'batch-collection':
        csv = await reportsService.exportBatchCollectionReport(req.user.academy_id);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unknown report type' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const exportReportPdf = (type) => async (req, res, next) => {
  try {
    let html;

    switch (type) {
      case 'monthly-collection':
        html = await reportsService.exportMonthlyCollectionReportPdf(req.user.academy_id);
        break;
      case 'pending-fees':
        html = await reportsService.exportPendingFeesReportPdf(req.user.academy_id);
        break;
      case 'student-fee':
        html = await reportsService.exportStudentFeeReportPdf(req.user.academy_id);
        break;
      case 'batch-collection':
        html = await reportsService.exportBatchCollectionReportPdf(req.user.academy_id);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unknown report type' });
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.html"`);
    res.send(html);
  } catch (err) {
    next(err);
  }
};

// JSON Report Data Endpoints
export const getReportData = async (req, res, next) => {
  try {
    const { type } = req.params;
    const filters = req.query;
    
    let data;
    
    switch (type) {
      case 'attendance':
        data = await reportsService.getAttendanceReportData(req.user.academy_id, filters);
        break;
      case 'revenue':
        data = await reportsService.getRevenueReportData(req.user.academy_id, filters);
        break;
      case 'fees':
        data = await reportsService.getFeesReportData(req.user.academy_id, filters);
        break;
      case 'performance':
        data = await reportsService.getPerformanceReportData(req.user.academy_id, filters);
        break;
      case 'coach':
        data = await reportsService.getCoachReportData(req.user.academy_id, filters);
        break;
      case 'batch':
        data = await reportsService.getBatchReportData(req.user.academy_id, filters);
        break;
      case 'sports':
        data = await reportsService.getSportsReportData(req.user.academy_id, filters);
        break;
      case 'inventory':
        data = await reportsService.getInventoryReportData(req.user.academy_id, filters);
        break;
      case 'enquiry':
        data = await reportsService.getEnquiryReportData(req.user.academy_id, filters);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unknown report type' });
    }
    
    res.json(successResponse('Report data retrieved successfully', data));
  } catch (err) {
    next(err);
  }
};

// Filter Options Endpoint
export const getFilterOptions = async (req, res, next) => {
  try {
    const options = await reportsService.getFilterOptions(req.user.academy_id);
    res.json(successResponse('Filter options retrieved successfully', options));
  } catch (err) {
    next(err);
  }
};

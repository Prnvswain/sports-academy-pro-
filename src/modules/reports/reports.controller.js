import * as reportsService from './reports.service.js';

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

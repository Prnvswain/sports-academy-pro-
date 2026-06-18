import * as reportsService from './reports.service.js';

export const exportReport = (type) => async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let csv;

    switch (type) {
      case 'attendance':
        csv = await reportsService.exportAttendanceReport(req.user.academy_id, { from, to });
        break;
      case 'students':
        csv = await reportsService.exportStudentsReport(req.user.academy_id);
        break;
      case 'fees':
        csv = await reportsService.exportFeesReport(req.user.academy_id);
        break;
      case 'coaches':
        csv = await reportsService.exportCoachesReport(req.user.academy_id);
        break;
      case 'batches':
        csv = await reportsService.exportBatchesReport(req.user.academy_id);
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
    const { from, to } = req.query;
    let html;

    switch (type) {
      case 'attendance':
        html = await reportsService.exportAttendanceReportPdf(req.user.academy_id, { from, to });
        break;
      case 'students':
        html = await reportsService.exportStudentsReportPdf(req.user.academy_id);
        break;
      case 'fees':
        html = await reportsService.exportFeesReportPdf(req.user.academy_id);
        break;
      case 'coaches':
        html = await reportsService.exportCoachesReportPdf(req.user.academy_id);
        break;
      case 'batches':
        html = await reportsService.exportBatchesReportPdf(req.user.academy_id);
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

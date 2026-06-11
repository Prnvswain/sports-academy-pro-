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

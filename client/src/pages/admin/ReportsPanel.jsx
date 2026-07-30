import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet, Download, Printer, RefreshCw, Filter, X,
  Calendar, TrendingUp, Users, DollarSign, Activity, Package,
  AlertCircle, CheckCircle, Clock, ChevronDown, Search, Save,
  BarChart3, PieChart, LineChart, ArrowUpRight, ArrowDownRight,
  Eye, EyeOff, Copy, MoreHorizontal, Settings, FileText, ChevronLeft
} from 'lucide-react';
import { getAdminToken } from '../../api/client';
import Loader from '../../components/Loader';

// Report Types Configuration
const REPORT_TYPES = [
  { id: 'attendance', label: 'Attendance Report', icon: Activity, color: 'emerald' },
  { id: 'revenue', label: 'Revenue Report', icon: DollarSign, color: 'blue' },
  { id: 'fees', label: 'Fees Report', icon: TrendingUp, color: 'purple' },
  { id: 'performance', label: 'Performance Report', icon: BarChart3, color: 'amber' },
  { id: 'coach', label: 'Coach Report', icon: Users, color: 'rose' },
  { id: 'batch', label: 'Batch Report', icon: Package, color: 'cyan' },
  { id: 'sports', label: 'Sports Report', icon: Activity, color: 'indigo' },
  { id: 'inventory', label: 'Inventory Report', icon: Package, color: 'orange' },
  { id: 'enquiry', label: 'Enquiry Report', icon: Users, color: 'teal' },
];

// Quick Reports Configuration
const QUICK_REPORTS = [
  { id: 'today-attendance', label: 'Today\'s Attendance', icon: Activity, summary: 'Daily attendance overview', color: 'emerald' },
  { id: 'today-revenue', label: 'Today\'s Revenue', icon: DollarSign, summary: 'Today\'s collections', color: 'blue' },
  { id: 'pending-fees', label: 'Pending Fees', icon: AlertCircle, summary: 'Outstanding dues', color: 'rose' },
  { id: 'monthly-collection', label: 'Monthly Collection', icon: TrendingUp, summary: 'This month\'s revenue', color: 'purple' },
  { id: 'coach-attendance', label: 'Coach Attendance', icon: Users, summary: 'Coach presence today', color: 'cyan' },
  { id: 'student-performance', label: 'Student Performance', icon: BarChart3, summary: 'Average performance scores', color: 'amber' },
  { id: 'inventory-status', label: 'Inventory Status', icon: Package, summary: 'Stock overview', color: 'orange' },
  { id: 'low-stock', label: 'Low Stock Items', icon: AlertCircle, summary: 'Items below threshold', color: 'red' },
  { id: 'new-admissions', label: 'New Admissions', icon: Users, summary: 'Recent enrollments', color: 'teal' },
  { id: 'expiring-plans', label: 'Expiring Plans', icon: Clock, summary: 'Plans ending soon', color: 'indigo' },
];

// Filter Configuration per Report Type
const FILTER_CONFIG = {
  attendance: ['dateRange', 'sport', 'batch', 'coach', 'ageCategory'],
  revenue: ['dateRange', 'sport', 'batch', 'paymentMethod'],
  fees: ['dateRange', 'status', 'plan', 'sport'],
  performance: ['dateRange', 'sport', 'batch', 'coach', 'assessment', 'ageCategory'],
  coach: ['dateRange', 'coach', 'sport'],
  batch: ['batch', 'sport', 'status'],
  sports: ['sport', 'dateRange'],
  inventory: ['category', 'stockStatus'],
  enquiry: ['dateRange', 'status', 'source'],
};

// Filter Options (fetched from API)
const FILTER_OPTIONS = {
  sport: [],
  batch: [],
  coach: [],
  ageCategory: ['U-12', 'U-14', 'U-16', 'U-18', 'Senior'],
  status: ['Active', 'Inactive', 'Pending', 'Completed'],
  plan: ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'],
  paymentMethod: ['Cash', 'Card', 'UPI', 'Bank Transfer'],
  assessment: [],
  category: ['Equipment', 'Uniforms', 'Accessories', 'Nutrition'],
  stockStatus: ['In Stock', 'Low Stock', 'Out of Stock'],
  source: ['Website', 'Walk-in', 'Referral', 'Social Media'],
};

export default function ReportsPanel() {
  // State
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({});
  const [savedFilters, setSavedFilters] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [filterPresetName, setFilterPresetName] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [filterOptions, setFilterOptions] = useState(FILTER_OPTIONS);
  const [allFilterOptions, setAllFilterOptions] = useState(FILTER_OPTIONS); // Store full unfiltered data
  const [filterRelations, setFilterRelations] = useState(null); // Store relationship data for cascading
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({});
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [generatedTime, setGeneratedTime] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filteredRecords, setFilteredRecords] = useState(0);
  const [error, setError] = useState(null);
  
  // UI Redesign States
  const [showQuickReportsDrawer, setShowQuickReportsDrawer] = useState(false);
  const [showRecentReportsDrawer, setShowRecentReportsDrawer] = useState(false);
  const [isBuilderCollapsed, setIsBuilderCollapsed] = useState(false);

  const filterOptionsCache = useRef({});
  const debounceTimer = useRef(null);

  // Load saved data from localStorage and fetch filter options
  useEffect(() => {
    const saved = localStorage.getItem('reportSavedFilters');
    if (saved) setSavedFilters(JSON.parse(saved));
    
    const recent = localStorage.getItem('recentReports');
    if (recent) setRecentReports(JSON.parse(recent));
    
    // Fetch filter options from API (force refresh to get relations data)
    fetchFilterOptions(true);
  }, []);

  // Keyboard accessibility listeners (ESC to close drawers)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowQuickReportsDrawer(false);
        setShowRecentReportsDrawer(false);
        setShowSaveFilterModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize visible columns when report data changes
  useEffect(() => {
    if (reportData && reportData.table.headers) {
      const initialColumns = {};
      reportData.table.headers.forEach((header, index) => {
        initialColumns[index] = true;
      });
      setVisibleColumns(initialColumns);
    }
  }, [reportData]);

  // Smart cascading filters - update dependent filters
  useEffect(() => {
    if (selectedReportType && filterRelations) {
      // Only run cascading filters if at least one filter is selected
      const hasSelection = filters.sport || filters.batch || filters.coach;
      if (hasSelection) {
        updateCascadingFilters();
      } else {
        // Reset to all options when no filters are selected
        setFilterOptions(prev => ({
          ...prev,
          sport: allFilterOptions.sport || [],
          batch: allFilterOptions.batch || [],
          coach: allFilterOptions.coach || []
        }));
      }
    }
  }, [filters.sport, filters.batch, filters.coach, selectedReportType]);

  // Fetch filter options from backend with caching
  const fetchFilterOptions = async (forceRefresh = false) => {
    const cacheKey = 'filterOptions';
    
    // Return cached data if available and not forcing refresh
    if (!forceRefresh && filterOptionsCache.current[cacheKey]) {
      const cachedData = filterOptionsCache.current[cacheKey];
      console.log('Using cached filter options:', cachedData);
      
      // Extract only the array data, not relations
      const { relations, ...arrayData } = cachedData;
      setAllFilterOptions(prev => ({ ...prev, ...arrayData }));
      setFilterOptions(prev => ({ ...prev, ...arrayData }));
      
      if (relations) {
        setFilterRelations(relations);
        console.log('Set filter relations from cache:', relations);
      }
      return;
    }
    
    try {
      const response = await fetch('/api/v1/admin/reports/filter-options', {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Fetched filter options from API:', result.data);
        
        // Store full data in cache
        filterOptionsCache.current[cacheKey] = result.data;
        
        // Extract only the array data, not relations
        const { relations, ...arrayData } = result.data;
        setAllFilterOptions(prev => ({ ...prev, ...arrayData }));
        setFilterOptions(prev => ({
          ...prev,
          ...arrayData
        }));
        
        if (relations) {
          setFilterRelations(relations);
          console.log('Set filter relations:', relations);
        } else {
          console.log('No relations data in API response');
        }
      } else {
        console.error('Failed to fetch filter options:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
      // Continue with default options if fetch fails
    }
  };

  // Update cascading filters based on selections
  const updateCascadingFilters = () => {
    const { sport, batch, coach } = filters;
    const allSports = allFilterOptions.sport || [];
    const allBatches = allFilterOptions.batch || [];
    const allCoaches = allFilterOptions.coach || [];
    const relations = filterRelations;
    
    // If no relations data available, don't filter
    if (!relations) {
      return;
    }
    
    // Filter options based on current selections
    let filteredSports = [...allSports];
    let filteredBatches = [...allBatches];
    let filteredCoaches = [...allCoaches];
    
    // If Sport is selected, filter Batches by that sport
    if (sport && relations.sportToBatches) {
      filteredBatches = relations.sportToBatches[sport] || [];
    }
    
    // If Batch is selected, filter Sport by that batch's sport
    if (batch && relations.batchToSport && relations.sportIdToName) {
      const sportId = relations.batchToSport[batch];
      if (sportId) {
        const sportName = relations.sportIdToName[sportId];
        if (sportName) {
          filteredSports = [sportName];
        }
      }
    }
    
    // If Batch is selected, filter Coaches by that batch
    if (batch && relations.batchToCoaches) {
      filteredCoaches = relations.batchToCoaches[batch] || allCoaches;
    }
    
    // If Coach is selected, filter Batches by that coach
    if (coach && relations.coachToBatches) {
      filteredBatches = relations.coachToBatches[coach] || allBatches;
    }
    
    // If Coach is selected, filter Sport by the coach's batches' sports
    if (coach && relations.coachToBatches && relations.batchToSport && relations.sportIdToName) {
      const coachBatches = relations.coachToBatches[coach] || [];
      if (coachBatches.length > 0) {
        // Get unique sports from coach's batches
        const coachSports = new Set();
        coachBatches.forEach(batchName => {
          const sportId = relations.batchToSport[batchName];
          if (sportId && relations.sportIdToName[sportId]) {
            coachSports.add(relations.sportIdToName[sportId]);
          }
        });
        if (coachSports.size > 0) {
          filteredSports = Array.from(coachSports);
        }
      }
    }
    
    // Clear invalid selections
    if (sport && !filteredSports.includes(sport)) {
      setFilters(prev => ({ ...prev, sport: '' }));
    }
    if (batch && !filteredBatches.includes(batch)) {
      setFilters(prev => ({ ...prev, batch: '' }));
    }
    if (coach && !filteredCoaches.includes(coach)) {
      setFilters(prev => ({ ...prev, coach: '' }));
    }
    
    // Update filter options with filtered lists
    setFilterOptions(prev => ({
      ...prev,
      sport: filteredSports,
      batch: filteredBatches,
      coach: filteredCoaches
    }));
  };

  // Debounced search handler
  const handleSearch = useCallback((query) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      setSearchQuery(query);
    }, 300);
  }, []);

  // Generate auto filename for exports
  const generateExportFilename = (format) => {
    const reportType = REPORT_TYPES.find(t => t.id === selectedReportType)?.label || 'Report';
    const parts = [reportType.replace(/\s+/g, '_')];
    
    if (filters.sport) parts.push(filters.sport);
    if (filters.batch) parts.push(filters.batch);
    if (filters.coach) parts.push(filters.coach);
    if (filters.startDate) {
      const date = new Date(filters.startDate);
      parts.push(date.toLocaleString('default', { month: 'long', year: 'numeric' }));
    }
    
    return `${parts.join('_')}.${format}`;
  };

  // Generate auto report title
  const generateReportTitle = () => {
    const reportType = REPORT_TYPES.find(t => t.id === selectedReportType)?.label || 'Report';
    const subtitleParts = [];
    
    if (filters.sport) subtitleParts.push(filters.sport);
    if (filters.batch) subtitleParts.push(`${filters.batch} Batch`);
    if (filters.coach) subtitleParts.push(filters.coach);
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      subtitleParts.push(`${start.toLocaleString('default', { month: 'short' })} - ${end.toLocaleString('default', { month: 'short', year: 'numeric' })}`);
    } else if (filters.startDate) {
      const date = new Date(filters.startDate);
      subtitleParts.push(date.toLocaleString('default', { month: 'long', year: 'numeric' }));
    }
    
    return {
      title: reportType,
      subtitle: subtitleParts.length > 0 ? subtitleParts.join(' • ') : 'All Records'
    };
  };

  // Remove active filter
  const removeActiveFilter = (key) => {
    setFilters(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  // Clear all active filters
  const clearAllFilters = () => {
    setFilters({});
    showToast('All filters cleared');
  };

  // Get active filters count
  const getActiveFiltersCount = () => {
    return Object.keys(filters).filter(key => filters[key]).length;
  };

  // Handle column visibility toggle
  const toggleColumn = (index) => {
    setVisibleColumns(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Duplicate report with current filters
  const duplicateReport = () => {
    setShowReportPreview(false);
    setIsBuilderCollapsed(false);
    showToast('Filters preserved. Click Generate to create a new report.', 'info');
  };

  // Retry report generation on error
  const retryReport = () => {
    setError(null);
    generateReport();
  };

  // Show toast message
  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Download existing reports (preserving backend compatibility)
  const downloadReport = async (file, format = 'csv') => {
    try {
      const response = await fetch(`/api/v1/admin/reports/${file}`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`${format.toUpperCase()} report downloaded successfully.`);
      
      // Add to recent reports
      addToRecentReports(file, format);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Add to recent reports
  const addToRecentReports = (reportName, format) => {
    const newRecent = {
      id: Date.now(),
      name: reportName,
      format,
      generatedAt: new Date().toISOString(),
    };
    const updated = [newRecent, ...recentReports].slice(0, 10);
    setRecentReports(updated);
    localStorage.setItem('recentReports', JSON.stringify(updated));
  };

  // Handle quick report generation
  const handleQuickReport = async (quickReport) => {
    const reportMap = {
      'monthly-collection': 'monthly-collection.csv',
      'pending-fees': 'pending-fees.csv',
    };
    
    // For existing CSV reports, use direct download
    if (reportMap[quickReport.id]) {
      downloadReport(reportMap[quickReport.id], 'csv');
      return;
    }
    
    // For new reports, use the JSON data endpoint with today's date
    const reportTypeMap = {
      'today-attendance': 'attendance',
      'today-revenue': 'revenue',
      'coach-attendance': 'coach',
      'student-performance': 'performance',
      'inventory-status': 'inventory',
      'low-stock': 'inventory',
      'new-admissions': 'enquiry',
      'expiring-plans': 'fees',
    };
    
    const reportType = reportTypeMap[quickReport.id];
    if (!reportType) {
      showToast(`${quickReport.label} - Feature coming soon`, 'info');
      return;
    }
    
    // Set today's date as filter
    const today = new Date().toISOString().split('T')[0];
    const filters = { startDate: today, endDate: today };
    
    // For inventory low stock, set stock status filter
    if (quickReport.id === 'low-stock') {
      filters.stockStatus = 'Low Stock';
    }
    
    // For expiring plans, we need a different approach
    if (quickReport.id === 'expiring-plans') {
      filters.status = 'Active';
    }
    
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await fetch(
        `/api/v1/admin/reports/data/${reportType}?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const result = await response.json();
      const data = result.data;
      
      // Generate CSV from the data
      const csvContent = [
        data.table.headers.join(','),
        ...data.table.rows.map(row => row.join(','))
      ].join('\n');
      
      // Download the CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quickReport.id}-${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      showToast(`${quickReport.label} downloaded successfully`);
      addToRecentReports(`${quickReport.id}-report`, 'csv');
    } catch (error) {
      showToast(`Failed to generate ${quickReport.label}`, 'error');
      console.error('Quick report error:', error);
    }
  };

  // Handle filter change with cascading support
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Clear dependent filters when parent changes
    if (key === 'sport') {
      setFilters(prev => ({ ...prev, [key]: value, batch: '', coach: '' }));
    } else if (key === 'batch') {
      setFilters(prev => ({ ...prev, [key]: value, coach: '' }));
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({});
    showToast('Filters reset');
  };

  // Save filter preset
  const saveFilterPreset = () => {
    if (!filterPresetName.trim()) {
      showToast('Please enter a preset name', 'error');
      return;
    }
    
    const newPreset = {
      id: Date.now(),
      name: filterPresetName,
      reportType: selectedReportType,
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };
    
    const updated = [...savedFilters, newPreset];
    setSavedFilters(updated);
    localStorage.setItem('reportSavedFilters', JSON.stringify(updated));
    setShowSaveFilterModal(false);
    setFilterPresetName('');
    showToast('Filter preset saved');
  };

  // Load filter preset
  const loadFilterPreset = (preset) => {
    setSelectedReportType(preset.reportType);
    setFilters(preset.filters);
    showToast(`Loaded preset: ${preset.name}`);
  };

  // Delete filter preset
  const deleteFilterPreset = (id) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('reportSavedFilters', JSON.stringify(updated));
    showToast('Filter preset deleted');
  };

  // Generate custom report
  const generateReport = async () => {
    if (!selectedReportType) {
      showToast('Please select a report type', 'error');
      return;
    }
    
    setGenerating(true);
    setError(null);
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await fetch(
        `/api/v1/admin/reports/data/${selectedReportType}?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report');
      }
      
      const result = await response.json();
      const reportData = result.data;
      
      // Check if data is empty
      const hasData = reportData.table.rows.length > 0;
      
      // Set metadata
      setGeneratedTime(new Date());
      setTotalRecords(reportData.table.rows.length);
      setFilteredRecords(reportData.table.rows.length);
      
      setReportData(reportData);
      setShowReportPreview(true);
      setIsBuilderCollapsed(true); // Auto collapse builder on generation success

      if (!hasData) {
        showToast('No records found matching the selected filters', 'info');
      } else {
        showToast('Report generated successfully');
      }
      
      // Add to recent reports
      addToRecentReports(`${selectedReportType}-report`, 'preview');
    } catch (error) {
      setError(error.message || 'Failed to generate report');
      showToast(error.message || 'Failed to generate report', 'error');
      console.error('Report generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  // Export report with column visibility and auto filename
  const exportReport = (format) => {
    if (!reportData) return;
    
    // Filter columns based on visibility
    const visibleHeaders = reportData.table.headers.filter((_, index) => visibleColumns[index]);
    const visibleRows = reportData.table.rows.map(row => 
      row.filter((_, index) => visibleColumns[index])
    );
    
    const filename = generateExportFilename(format);
    
    if (format === 'print') {
      window.print();
    } else if (format === 'csv') {
      // Generate CSV from visible columns
      const csv = [
        visibleHeaders.join(','),
        ...visibleRows.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSV exported successfully');
    } else if (format === 'pdf') {
      showToast('PDF export - Feature coming soon', 'info');
    }
  };

  // Refresh report
  const refreshReport = () => {
    generateReport();
  };

  // Change filters
  const changeFilters = () => {
    setShowReportPreview(false);
    setIsBuilderCollapsed(false);
  };

  if (loading) return <Loader />;

  return (
    <motion.div
      className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-2 font-sans"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Page Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
            <FileSpreadsheet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Reports
            </h1>
            <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
              Generate, Preview & Export Academy Data sheets
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 self-start sm:self-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowQuickReportsDrawer(true)}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="Generate predefined quick reports"
          >
            <Activity className="w-3.5 h-3.5 text-primary" />
            Quick Reports
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowRecentReportsDrawer(true)}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="View recently generated report history"
          >
            <Clock className="w-3.5 h-3.5 text-primary" />
            Recent Reports
          </motion.button>
        </div>
      </motion.div>

      {/* Custom Report Builder Collapsible Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
      >
        <div 
          onClick={() => setIsBuilderCollapsed(!isBuilderCollapsed)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <Filter className="w-4 h-4 text-primary" />
            <h2 className="text-md font-black text-foreground">Custom Report Builder</h2>
            {selectedReportType && (
              <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">
                {selectedReportType}
              </span>
            )}
            {getActiveFiltersCount() > 0 && (
              <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-500 text-[10px] font-bold rounded-full">
                {getActiveFiltersCount()} Filters Selected
              </span>
            )}
          </div>
          <motion.div
            animate={{ rotate: isBuilderCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>

        <AnimatePresence initial={false}>
          {!isBuilderCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-4 space-y-6 pt-3 border-t border-border/40"
            >
              {/* Step 1: Select Report Type */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">1. Select Report Type</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {REPORT_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedReportType === type.id;
                    
                    return (
                      <motion.button
                        key={type.id}
                        onClick={() => setSelectedReportType(type.id)}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary shadow-inner shadow-primary/5'
                            : 'border-border hover:border-primary/50 bg-muted/20 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-[11px] font-bold tracking-tight">{type.label}</p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Dynamic Filters & Sticky Action footer */}
              {selectedReportType && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5 pt-4 border-t border-border/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">2. Apply Dynamic Filters</h3>
                      {getActiveFiltersCount() > 0 && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-extrabold rounded-full">
                          {getActiveFiltersCount()} active
                        </span>
                      )}
                    </div>
                    <button
                      onClick={resetFilters}
                      className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {FILTER_CONFIG[selectedReportType]?.map((filterKey) => (
                      <div key={filterKey} className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block capitalize">
                          {filterKey.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        {filterKey === 'dateRange' ? (
                          <div className="flex gap-2">
                            <input
                              type="date"
                              className="flex-1 input-field py-2 px-3 text-xs"
                              value={filters.startDate || ''}
                              onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            />
                            <input
                              type="date"
                              className="flex-1 input-field py-2 px-3 text-xs"
                              value={filters.endDate || ''}
                              onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            />
                          </div>
                        ) : (
                          <select
                            className="w-full input-field py-2 px-3 text-xs"
                            value={filters[filterKey] || ''}
                            onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                          >
                            <option value="">All options</option>
                            {filterOptions[filterKey]?.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Actions inside builder */}
                  <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-border/40">
                    <motion.button
                      onClick={generateReport}
                      disabled={generating}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn btn-primary flex items-center gap-2 text-xs py-2.5 px-4 shadow-sm"
                      title="Run database search and load preview below"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4" />
                          Generate Report
                        </>
                      )}
                    </motion.button>
                    
                    <motion.button
                      onClick={() => setShowSaveFilterModal(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn btn-secondary flex items-center gap-2 text-xs py-2.5 px-4"
                      title="Save configured filters for later reuse"
                    >
                      <Save className="w-4 h-4 text-primary" />
                      Save Preset
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Saved Presets (Only shown in report building view) */}
      {savedFilters.length > 0 && !showReportPreview && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 pt-4 border-t border-border/40"
        >
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Save className="w-4 h-4 text-primary" />
            Saved Filter Presets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedFilters.map((preset) => (
              <div key={preset.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                <button
                  onClick={() => deleteFilterPreset(preset.id)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Delete Preset"
                >
                  <X className="w-4 h-4" />
                </button>
                <h4 className="text-sm font-bold text-foreground pr-6 truncate">{preset.name}</h4>
                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">
                  {REPORT_TYPES.find(t => t.id === preset.reportType)?.label || 'General Report'}
                </p>
                <div className="flex gap-2 mt-3">
                  <motion.button
                    onClick={() => loadFilterPreset(preset)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-secondary text-xs w-full py-2"
                  >
                    Load Preset
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Report Preview Canvas */}
      <AnimatePresence>
        {showReportPreview && reportData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Error Message */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 text-sm">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="font-bold text-rose-600">Report Generation Failed</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                    </div>
                    <motion.button
                      onClick={retryReport}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn btn-primary bg-rose-500 hover:bg-rose-600 text-white text-xs py-2 px-4 shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Retry Generation
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Unified Preview Header Card */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
              
              {/* Header Titles */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-foreground mb-0.5 tracking-tight">
                    {generateReportTitle().title}
                  </h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{generateReportTitle().subtitle}</p>
                </div>
                {generatedTime && (
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Last Generated</p>
                    <p className="text-xs font-bold text-foreground">
                      {generatedTime.toLocaleDateString()} {generatedTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                    </p>
                  </div>
                )}
              </div>

              {/* Active Filters list inline */}
              {getActiveFiltersCount() > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/40">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Active Filters:</span>
                  {Object.entries(filters).filter(([key, value]) => value).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20"
                    >
                      <span className="capitalize text-primary/70">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span>{value}</span>
                      <button
                        onClick={() => removeActiveFilter(key)}
                        className="hover:text-primary-foreground hover:bg-primary rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={clearAllFilters}
                    className="text-[10px] text-rose-500 hover:text-rose-600 font-black uppercase tracking-wider ml-1"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* Summary Stats Row Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 border border-border/50 rounded-2xl text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] font-black uppercase tracking-wider">Total Records</span>
                  <span className="font-extrabold text-foreground mt-0.5 block">{totalRecords}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] font-black uppercase tracking-wider">Applied Filters</span>
                  <span className="font-extrabold text-foreground mt-0.5 block">{getActiveFiltersCount()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] font-black uppercase tracking-wider">Date Range</span>
                  <span className="font-extrabold text-foreground mt-0.5 block">
                    {filters.startDate && filters.endDate 
                      ? `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`
                      : filters.startDate 
                      ? new Date(filters.startDate).toLocaleDateString()
                      : 'All Records'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] font-black uppercase tracking-wider">Generated By</span>
                  <span className="font-extrabold text-foreground mt-0.5 block">Academy Administrator</span>
                </div>
              </div>

              {/* Action Toolbar buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-3 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshReport}
                    className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-foreground transition-all"
                    title="Refresh Data"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={duplicateReport}
                    className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-foreground transition-all"
                    title="Duplicate Settings / Edit Filters"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={changeFilters}
                    className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-foreground transition-all"
                    title="Change Active Filters"
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowColumnMenu(!showColumnMenu)}
                      className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-foreground transition-all"
                      title="Toggle Column Visibility"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {showColumnMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute left-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg p-2 z-30"
                        >
                          <p className="text-[9px] font-black uppercase text-muted-foreground px-2.5 py-1 border-b border-border/50 mb-1">Show/Hide Columns</p>
                          <div className="max-h-60 overflow-y-auto space-y-0.5">
                            {reportData.table.headers.map((header, index) => (
                              <button
                                key={index}
                                onClick={() => toggleColumn(index)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted text-left text-xs transition-colors"
                              >
                                {visibleColumns[index] ? (
                                  <Eye className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                                <span className={visibleColumns[index] ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                                  {header}
                                </span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Outline Export actions */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mr-1">Export As:</span>
                  <button
                    onClick={() => exportReport('csv')}
                    className="btn btn-secondary text-xs px-3.5 py-2 inline-flex items-center gap-1.5 border border-border bg-transparent hover:bg-muted/40 text-foreground font-bold rounded-xl transition-all"
                    title="Export CSV spreadsheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Spreadsheet (CSV)
                  </button>
                  <button
                    onClick={() => exportReport('pdf')}
                    className="btn btn-secondary text-xs px-3.5 py-2 inline-flex items-center gap-1.5 border border-border bg-transparent hover:bg-muted/40 text-foreground font-bold rounded-xl transition-all"
                    title="Export PDF file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                  <button
                    onClick={() => exportReport('print')}
                    className="btn btn-secondary text-xs px-3.5 py-2 inline-flex items-center gap-1.5 border border-border bg-transparent hover:bg-muted/40 text-foreground font-bold rounded-xl transition-all"
                    title="Print report layout"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Cards Row */}
            {generating ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                    <div className="h-3 w-16 bg-muted rounded mb-2" />
                    <div className="h-6 w-24 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Object.entries(reportData.summary).map(([key, value]) => (
                  <div key={key} className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-2xl font-black text-foreground mt-1 tracking-tight">
                      {typeof value === 'number' && key.includes('Percentage')
                        ? `${value}%`
                        : typeof value === 'number' && (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('amount'))
                        ? `₹${value.toLocaleString('en-IN')}`
                        : value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Charts Grid Layout */}
            {generating ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm animate-pulse h-64 animate-pulse" />
                ))}
              </div>
            ) : reportData.charts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportData.charts.map((chart, index) => (
                  <div key={index} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">
                      {chart.type === 'pie' ? 'Distribution Analysis' : 'Trend Analysis'}
                    </h4>
                    <div className="h-48 flex items-center justify-center bg-muted/20 border border-border/30 rounded-xl">
                      <div className="text-center text-muted-foreground space-y-1.5">
                        {chart.type === 'pie' ? (
                          <PieChart className="w-10 h-10 mx-auto text-primary/50" />
                        ) : (
                          <LineChart className="w-10 h-10 mx-auto text-primary/50" />
                        )}
                        <p className="text-xs font-bold text-foreground">Chart Visualization</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">Predefined Graphic dataset representation</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Detailed Table Grid card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-bold text-foreground">Detailed Data</h4>
                  {reportData.table.rows.length > 0 && (
                    <span className="px-2.5 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded-full">
                      Showing {filteredRecords} records
                      {totalRecords > filteredRecords && ` (filtered from ${totalRecords})`}
                    </span>
                  )}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    className="pl-9 pr-4 py-2 w-full rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
              </div>
              
              {generating ? (
                <div className="space-y-3 py-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="h-6 bg-muted/40 rounded animate-pulse flex-1" />
                      <div className="h-6 bg-muted/40 rounded animate-pulse flex-2" />
                      <div className="h-6 bg-muted/40 rounded animate-pulse flex-1" />
                    </div>
                  ))}
                </div>
              ) : reportData.table.rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h5 className="text-sm font-bold text-foreground mb-1">No Records Found</h5>
                  <p className="text-xs text-muted-foreground max-w-sm mb-4">
                    No {selectedReportType} records match the selected filters.
                  </p>
                  <button
                    onClick={changeFilters}
                    className="btn btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Change Filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {reportData.table.headers.map((header, index) => (
                          visibleColumns[index] && (
                            <th key={header} className="text-left py-3 px-4 font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                              {header}
                            </th>
                          )
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {reportData.table.rows
                        .filter(row => {
                          if (!searchQuery) return true;
                          const searchLower = searchQuery.toLowerCase();
                          return row.some(cell => 
                            String(cell).toLowerCase().includes(searchLower)
                          );
                        })
                        .map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-muted/10 transition-colors">
                            {row.map((cell, cellIndex) => (
                              visibleColumns[cellIndex] && (
                                <td key={cellIndex} className="py-2.5 px-4 text-foreground font-semibold whitespace-nowrap">
                                  {cell}
                                </td>
                              )
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK REPORTS SLIDE OVER DRAWER */}
      <AnimatePresence>
        {showQuickReportsDrawer && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQuickReportsDrawer(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            {/* Slide-over Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Quick Reports</h2>
                </div>
                <button
                  onClick={() => setShowQuickReportsDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Select a report sheet to download</p>
                <div className="grid grid-cols-1 gap-2.5">
                  {QUICK_REPORTS.map((report) => {
                    const Icon = report.icon;
                    const colorClasses = {
                      emerald: 'from-emerald-500 to-emerald-600',
                      blue: 'from-blue-500 to-blue-600',
                      purple: 'from-purple-500 to-purple-600',
                      amber: 'from-amber-500 to-amber-600',
                      rose: 'from-rose-500 to-rose-600',
                      cyan: 'from-cyan-500 to-cyan-600',
                      indigo: 'from-indigo-500 to-indigo-600',
                      orange: 'from-orange-500 to-orange-600',
                      red: 'from-red-500 to-red-600',
                      teal: 'from-teal-500 to-teal-600',
                    };
                    
                    return (
                      <motion.button
                        key={report.id}
                        onClick={() => {
                          handleQuickReport(report);
                          setShowQuickReportsDrawer(false);
                        }}
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-4 p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/30 text-left transition-all group"
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[report.color] || 'from-primary to-primary-foreground'} flex items-center justify-center shadow-sm shrink-0`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{report.label}</h3>
                          <p className="text-xs text-muted-foreground truncate">{report.summary}</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* RECENT REPORTS SLIDE OVER DRAWER */}
      <AnimatePresence>
        {showRecentReportsDrawer && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRecentReportsDrawer(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            {/* Slide-over Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Recent Reports</h2>
                </div>
                <button
                  onClick={() => setShowRecentReportsDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {recentReports.length > 0 ? (
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Latest file sheets generated</p>
                    {recentReports.map((report) => (
                      <div key={report.id} className="p-3 bg-muted/20 border border-border rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{report.name}</p>
                          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
                            {new Date(report.generatedAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider shrink-0">
                          {report.format}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground space-y-2">
                    <Clock className="w-8 h-8 text-muted-foreground/50 animate-pulse" />
                    <p className="text-xs font-bold">No generated reports history cached</p>
                    <p className="text-[10px]">Recent files will show up here after export.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Save Filter Modal */}
      <AnimatePresence>
        {showSaveFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSaveFilterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-black text-foreground">Save Filter Preset</h3>
                <button 
                  onClick={() => setShowSaveFilterModal(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Preset name (e.g., Monthly Attendance)"
                value={filterPresetName}
                onChange={(e) => setFilterPresetName(e.target.value)}
                className="w-full input-field py-2.5 px-3 text-xs focus:ring-2 focus:ring-primary/20 mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <motion.button
                  onClick={saveFilterPreset}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-primary flex-1 text-xs"
                >
                  Save Preset
                </motion.button>
                <motion.button
                  onClick={() => setShowSaveFilterModal(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-secondary flex-1 text-xs"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Message popup */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-xl shadow-lg z-50 text-xs font-bold flex items-center gap-2 ${
              message.type === 'error' ? 'bg-red-500 text-white' : 
              message.type === 'info' ? 'bg-blue-500 text-white' :
              'bg-emerald-500 text-white'
            }`}
          >
            {message.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Styles overrides */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .card, .card * {
            visibility: visible;
          }
          .card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button, input, select {
            display: none !important;
          }
        }
      `}</style>
    </motion.div>
  );
}
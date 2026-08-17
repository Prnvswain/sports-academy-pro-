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
import { 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  LineChart as RechartsLineChart, 
  Line 
} from 'recharts';

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

const CHART_COLORS = ['#84cc16', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e'];

const getChartData = (chart, reportType, reportData) => {
  if (!chart || !chart.data) return [];
  
  if (Array.isArray(chart.data) && chart.data.length > 0 && typeof chart.data[0] === 'object' && 'name' in chart.data[0]) {
    return chart.data;
  }
  
  if (Array.isArray(chart.data)) {
    if (reportType === 'revenue' && chart.type === 'bar') {
      const dateColIndex = reportData.table.headers.indexOf('Date');
      const months = [];
      if (dateColIndex !== -1) {
        reportData.table.rows.forEach(row => {
          const dateStr = row[dateColIndex];
          if (dateStr) {
            const parts = dateStr.split('/');
            const dateStrFormatted = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;
            const d = new Date(dateStrFormatted);
            if (!isNaN(d.getTime())) {
              const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
              if (!months.includes(key)) months.push(key);
            }
          }
        });
      }
      return chart.data.map((val, idx) => ({
        name: months[idx] || `Period ${idx + 1}`,
        value: val
      }));
    }
    
    if (reportType === 'performance' && chart.type === 'bar') {
      const attrColIndex = reportData.table.headers.indexOf('Attribute');
      const attributes = [];
      if (attrColIndex !== -1) {
        reportData.table.rows.forEach(row => {
          const attr = row[attrColIndex];
          if (attr && !attributes.includes(attr)) attributes.push(attr);
        });
      }
      return chart.data.map((val, idx) => ({
        name: attributes[idx] || `Attribute ${idx + 1}`,
        value: parseFloat(val.toFixed(2))
      }));
    }
    
    if (reportType === 'sports' && chart.type === 'bar') {
      const sportColIndex = reportData.table.headers.indexOf('Sport Name') !== -1 
        ? reportData.table.headers.indexOf('Sport Name') 
        : 0;
      const sportsList = [];
      reportData.table.rows.forEach(row => {
        const sport = row[sportColIndex];
        if (sport && !sportsList.includes(sport)) sportsList.push(sport);
      });
      return chart.data.map((val, idx) => ({
        name: sportsList[idx] || `Sport ${idx + 1}`,
        value: val
      }));
    }
    
    return chart.data.map((val, idx) => ({
      name: `Item ${idx + 1}`,
      value: typeof val === 'number' ? parseFloat(val.toFixed(2)) : val
    }));
  }
  
  return [];
};

const RenderRechartsChart = ({ chart, reportType, reportData, isPrint = false }) => {
  const data = getChartData(chart, reportType, reportData);
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-xs font-semibold">
        No chart data available
      </div>
    );
  }

  const chartContent = (width, height) => {
    if (chart.type === 'pie') {
      return (
        <RechartsPieChart width={width} height={height}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={width ? width * 0.25 : 45}
            outerRadius={width ? width * 0.35 : 65}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip 
            contentStyle={{ 
              background: 'rgba(15, 23, 42, 0.95)', 
              backdropFilter: 'blur(4px)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: '12px', 
              color: '#fff', 
              fontSize: '11px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
            }}
          />
          <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
        </RechartsPieChart>
      );
    }

    if (chart.type === 'bar') {
      return (
        <RechartsBarChart data={data} width={width} height={height} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.6)" className="dark:stroke-slate-800/60" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600 }} stroke="#64748b" tickLine={false} />
          <YAxis tick={{ fontSize: 9, fontWeight: 600 }} stroke="#64748b" tickLine={false} />
          <RechartsTooltip 
            contentStyle={{ 
              background: 'rgba(15, 23, 42, 0.95)', 
              backdropFilter: 'blur(4px)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: '12px', 
              color: '#fff', 
              fontSize: '11px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
            }}
          />
          <Bar dataKey="value" fill="#84cc16" radius={[6, 6, 0, 0]} maxBarSize={32}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </RechartsBarChart>
      );
    }

    return (
      <RechartsLineChart data={data} width={width} height={height} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.6)" className="dark:stroke-slate-800/60" />
        <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600 }} stroke="#64748b" tickLine={false} />
        <YAxis tick={{ fontSize: 9, fontWeight: 600 }} stroke="#64748b" tickLine={false} />
        <RechartsTooltip 
          contentStyle={{ 
            background: 'rgba(15, 23, 42, 0.95)', 
            backdropFilter: 'blur(4px)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '12px', 
            color: '#fff', 
            fontSize: '11px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
          }}
        />
        <Line type="monotone" dataKey="value" stroke="var(--theme-primary, #3b82f6)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
      </RechartsLineChart>
    );
  };

  if (isPrint) {
    return (
      <div className="h-48 w-full flex justify-center items-center bg-white">
        {chartContent(350, 180)}
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {chartContent()}
      </ResponsiveContainer>
    </div>
  );
};

const SearchableSelect = ({ label, value, onChange, options, placeholder = "Select option" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options || [];
    return (options || []).filter(opt => 
      String(opt).toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5 z-30">
      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block capitalize">
        {label}
      </label>
      <div 
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="w-full input-field py-2 px-3 text-xs bg-card border border-border rounded-xl cursor-pointer flex items-center justify-between hover:border-primary/50 transition-all select-none h-[38px] leading-[22px]"
      >
        <span className={value ? "text-foreground font-semibold" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-250 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-45 mt-1 max-h-60 overflow-hidden rounded-xl border border-border bg-card shadow-xl flex flex-col"
          >
            <div className="p-2 border-b border-border/50 bg-muted/10 flex items-center gap-2 shrink-0">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-foreground focus:outline-none placeholder-muted-foreground"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              {search && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch('');
                  }} 
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-1 max-h-40 space-y-0.5 scrollbar-thin">
              <button
                type="button"
                className="w-full text-left text-xs px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors font-semibold"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
              >
                All options
              </button>
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">No options found</div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors font-semibold flex items-center justify-between ${
                      value === opt 
                        ? 'bg-primary/10 text-primary font-bold' 
                        : 'text-foreground hover:bg-muted'
                    }`}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                  >
                    <span>{opt}</span>
                    {value === opt && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
  const [academyDetails, setAcademyDetails] = useState(null);
  
  // UI Redesign States
  const [showQuickReportsDrawer, setShowQuickReportsDrawer] = useState(false);
  const [showRecentReportsDrawer, setShowRecentReportsDrawer] = useState(false);
  const [isBuilderCollapsed, setIsBuilderCollapsed] = useState(false);

  const filterOptionsCache = useRef({});
  const debounceTimer = useRef(null);

  // Filter table rows based on search query
  const filteredRows = useMemo(() => {
    if (!reportData || !reportData.table || !reportData.table.rows) return [];
    if (!searchQuery) return reportData.table.rows;
    
    const searchLower = searchQuery.toLowerCase();
    return reportData.table.rows.filter(row => 
      row.some(cell => String(cell).toLowerCase().includes(searchLower))
    );
  }, [reportData, searchQuery]);

  // Client-side Sorting and Pagination States
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState(null); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset pagination when data or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [reportData, searchQuery]);

  // Client-side Sorting Logic
  const sortedRows = useMemo(() => {
    if (sortColumn === null || !sortDirection) return filteredRows;
    
    return [...filteredRows].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      
      const numA = parseFloat(String(valA).replace(/[^0-9.-]/g, ''));
      const numB = parseFloat(String(valB).replace(/[^0-9.-]/g, ''));
      
      let comparison = 0;
      if (!isNaN(numA) && !isNaN(numB)) {
        comparison = numA - numB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortColumn, sortDirection]);

  // Client-side Pagination Logic
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRows, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedRows.length / rowsPerPage);

  const handleSort = (index) => {
    if (sortColumn === index) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(index);
      setSortDirection('asc');
    }
  };

  // Avatar and Formatting Helpers
  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
      'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
      'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
      'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400'
    ];
    if (!name) return colors[0];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatTableCell = (header, value) => {
    if (value === null || value === undefined) return '-';
    
    const normalizedHeader = header.toLowerCase();
    const strVal = String(value);
    
    // Status badges
    if (normalizedHeader.includes('status') || normalizedHeader.includes('attendance') || strVal === 'Present' || strVal === 'Absent' || strVal === 'Paid' || strVal === 'Pending' || strVal === 'Active' || strVal === 'Inactive') {
      let badgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      
      if (['present', 'paid', 'active', 'in stock'].includes(strVal.toLowerCase())) {
        badgeClass = 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400';
      } else if (['absent', 'unpaid', 'inactive', 'out of stock'].includes(strVal.toLowerCase())) {
        badgeClass = 'bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400';
      } else if (['late', 'pending', 'low stock'].includes(strVal.toLowerCase())) {
        badgeClass = 'bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400';
      }
      
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
          {strVal}
        </span>
      );
    }
    
    // Avatar for names
    if (normalizedHeader === 'student name' || normalizedHeader === 'coach name' || normalizedHeader === 'name') {
      return (
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${getAvatarColor(strVal)}`}>
            {getInitials(strVal)}
          </div>
          <span className="font-semibold text-foreground text-xs">{strVal}</span>
        </div>
      );
    }
    
    // Currency
    if ((normalizedHeader.includes('revenue') || normalizedHeader.includes('amount') || normalizedHeader.includes('fee') || normalizedHeader.includes('paid')) && !isNaN(parseFloat(strVal.replace(/[^0-9.-]/g, '')))) {
      const num = parseFloat(strVal.replace(/[^0-9.-]/g, ''));
      return <span className="font-mono font-bold text-foreground">₹{num.toLocaleString('en-IN')}</span>;
    }
    
    return <span className="text-foreground text-xs font-semibold">{strVal}</span>;
  };

  const getSummaryCardDetails = (key) => {
    const normalizedKey = key.toLowerCase();
    
    if (normalizedKey.includes('student') || normalizedKey.includes('count') || normalizedKey.includes('enrollment') || normalizedKey.includes('member')) {
      return {
        icon: Users,
        color: 'blue',
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-500',
        borderColor: 'border-blue-500/20'
      };
    }
    if (normalizedKey.includes('active') || normalizedKey.includes('present') || normalizedKey.includes('success')) {
      return {
        icon: CheckCircle,
        color: 'emerald',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-500',
        borderColor: 'border-emerald-500/20'
      };
    }
    if (normalizedKey.includes('attendance') || normalizedKey.includes('ratio') || normalizedKey.includes('percentage')) {
      return {
        icon: Activity,
        color: 'emerald',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-500',
        borderColor: 'border-emerald-500/20'
      };
    }
    if (normalizedKey.includes('revenue') || normalizedKey.includes('amount') || normalizedKey.includes('paid') || normalizedKey.includes('collection') || normalizedKey.includes('fee')) {
      if (normalizedKey.includes('pending') || normalizedKey.includes('due') || normalizedKey.includes('outstanding') || normalizedKey.includes('unpaid')) {
        return {
          icon: AlertCircle,
          color: 'rose',
          bgColor: 'bg-rose-500/10',
          textColor: 'text-rose-500',
          borderColor: 'border-rose-500/20'
        };
      }
      return {
        icon: DollarSign,
        color: 'emerald',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-500',
        borderColor: 'border-emerald-500/20'
      };
    }
    
    return {
      icon: TrendingUp,
      color: 'slate',
      bgColor: 'bg-slate-500/10',
      textColor: 'text-slate-500',
      borderColor: 'border-slate-500/20'
    };
  };

  // Load saved data from localStorage and fetch filter options
  useEffect(() => {
    const saved = localStorage.getItem('reportSavedFilters');
    if (saved) setSavedFilters(JSON.parse(saved));
    
    const recent = localStorage.getItem('recentReports');
    if (recent) setRecentReports(JSON.parse(recent));
    
    // Fetch filter options from API (use cache if available to prevent duplicate calls)
    fetchFilterOptions(false);

    // Fetch academy details
    const fetchAcademyDetails = async () => {
      try {
        const token = getAdminToken();
        if (!token) return;
        const response = await fetch('/api/v1/admin/academy', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const result = await response.json();
          setAcademyDetails(result.data || result);
        }
      } catch (err) {
        console.error('Failed to fetch academy details:', err);
      }
    };
    fetchAcademyDetails();
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
    
    const filename = generateExportFilename(format === 'pdf' ? 'pdf' : 'html');
    
    if (format === 'print' || format === 'pdf') {
      const originalTitle = document.title;
      // Strip extension for browser's default download title
      document.title = filename.replace(/\.[^/.]+$/, "");
      
      window.print();
      
      // Restore original document title
      document.title = originalTitle;
      
      showToast(format === 'pdf' ? 'PDF Export layout opened' : 'Print dialog opened');
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
      a.download = filename.replace(/\.[^/.]+$/, ".csv");
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSV exported successfully');
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
      className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-2 font-sans text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="print-hidden-wrapper print:hidden space-y-6">
        
        {/* Page Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm text-white shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-none">
                Reports
              </h1>
              <p className="text-xs font-semibold text-muted-foreground mt-1 tracking-wide">
                Analyze academy performance, attendance, students and revenue
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center self-start sm:self-center">
            {showReportPreview && reportData && (
              <div className="flex items-center gap-1.5 border-r border-border/60 pr-2 mr-2">
                <button
                  onClick={() => exportReport('csv')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-foreground bg-card hover:bg-muted border border-border rounded-xl transition-all shadow-sm h-9"
                  title="Export CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-650" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  onClick={() => exportReport('pdf')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-foreground bg-card hover:bg-muted border border-border rounded-xl transition-all shadow-sm h-9"
                  title="Export PDF"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Export PDF</span>
                </button>
                <button
                  onClick={() => exportReport('print')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-foreground bg-card hover:bg-muted border border-border rounded-xl transition-all shadow-sm h-9"
                  title="Print Report"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Print</span>
                </button>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowQuickReportsDrawer(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-primary hover:bg-emerald-600 rounded-xl shadow-sm border border-transparent transition-all h-9"
              title="Generate predefined quick reports"
            >
              <Activity className="w-3.5 h-3.5" />
              Quick Reports
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowRecentReportsDrawer(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-foreground bg-card hover:bg-muted border border-border rounded-xl transition-all shadow-sm h-9"
              title="View recently generated report history"
            >
              <Clock className="w-3.5 h-3.5 text-primary" />
              History
            </motion.button>
          </div>
        </motion.div>

        {/* Custom Report Builder Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4"
        >
          <div 
            onClick={() => setIsBuilderCollapsed(!isBuilderCollapsed)}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-black text-foreground">Custom Report Builder</h2>
              {selectedReportType && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">
                  {selectedReportType}
                </span>
              )}
              {getActiveFiltersCount() > 0 && (
                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[10px] font-bold rounded-full">
                  {getActiveFiltersCount()} Filters Active
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
                className="overflow-visible mt-2 space-y-4 pt-3 border-t border-border/40"
              >
                {/* Report Navigation Tabs */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Select Report Type</h3>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {REPORT_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isSelected = selectedReportType === type.id;
                      
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedReportType(type.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary shadow-sm'
                              : 'border-border hover:border-primary/45 hover:bg-muted bg-card text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filters Section */}
                {selectedReportType ? (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-2 border-t border-border/40"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Apply Dynamic Filters</h3>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-rose-500 flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reset Filters
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {FILTER_CONFIG[selectedReportType]?.map((filterKey) => (
                        <div key={filterKey} className="w-full">
                          {filterKey === 'dateRange' ? (
                            <div className="space-y-1.5 w-full">
                              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block capitalize">
                                Date Range
                              </label>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="date"
                                  className="flex-1 input-field py-2 px-3 text-xs bg-card border border-border rounded-xl focus:ring-1 focus:ring-primary/20 h-[38px] leading-[22px] text-foreground font-semibold"
                                  value={filters.startDate || ''}
                                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                />
                                <span className="text-muted-foreground text-xs font-bold">to</span>
                                <input
                                  type="date"
                                  className="flex-1 input-field py-2 px-3 text-xs bg-card border border-border rounded-xl focus:ring-1 focus:ring-primary/20 h-[38px] leading-[22px] text-foreground font-semibold"
                                  value={filters.endDate || ''}
                                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                />
                              </div>
                            </div>
                          ) : (
                            <SearchableSelect
                              label={filterKey.replace(/([A-Z])/g, ' $1').trim()}
                              value={filters[filterKey] || ''}
                              onChange={(val) => handleFilterChange(filterKey, val)}
                              options={filterOptions[filterKey] || []}
                              placeholder={`All ${filterKey.replace(/([A-Z])/g, ' $1').trim()}s`}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions inside builder */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-border/40">
                      <motion.button
                        type="button"
                        onClick={generateReport}
                        disabled={generating}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-emerald-650 shadow-sm transition-all h-[38px] disabled:opacity-50"
                      >
                        {generating ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-3.5 h-3.5" />
                            Generate Report
                          </>
                        )}
                      </motion.button>
                      
                      <motion.button
                        type="button"
                        onClick={() => setShowSaveFilterModal(true)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-foreground bg-card hover:bg-muted border border-border shadow-sm transition-all h-[38px]"
                      >
                        <Save className="w-3.5 h-3.5 text-primary" />
                        Save Preset
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-xs font-semibold">
                    Please select a report type above to view and apply filters.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Saved Presets */}
        {savedFilters.length > 0 && !showReportPreview && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 pt-4 border-t border-border/40"
          >
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Save className="w-3.5 h-3.5 text-primary" />
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
                    <X className="w-3.5 h-3.5" />
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
                      className="btn btn-secondary text-xs w-full py-2 rounded-xl"
                    >
                      Load Preset
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!showReportPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">No Report Generated Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mx-auto">
                Select a report sheet type and customize the filters above, then click **Generate Report** to analyze statistics.
              </p>
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
                        <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                        Retry Generation
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Info Card */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-foreground tracking-tight leading-none">
                      {generateReportTitle().title}
                    </h2>
                    <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-wide">
                      {generateReportTitle().subtitle}
                    </p>
                  </div>
                  {generatedTime && (
                    <div className="text-left md:text-right">
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Last Generated</p>
                      <p className="text-xs font-bold text-foreground">
                        {generatedTime.toLocaleDateString()} {generatedTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                      </p>
                    </div>
                  )}
                </div>

                {/* Active Filters summary row */}
                {getActiveFiltersCount() > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/40">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Active Filters:</span>
                    {Object.entries(filters).filter(([key, value]) => value).map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/10"
                      >
                        <span className="capitalize text-primary/70">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="ml-1">{value}</span>
                        <button
                          onClick={() => removeActiveFilter(key)}
                          className="hover:bg-primary/20 rounded-full p-0.5 ml-1 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={clearAllFilters}
                      className="text-[10px] text-rose-500 hover:text-rose-650 font-black uppercase tracking-wider ml-1"
                    >
                      Clear All
                    </button>
                  </div>
                )}

                {/* Summary Metadata Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/20 border border-border/50 rounded-xl text-xs font-semibold">
                  <div>
                    <span className="text-muted-foreground block text-[9px] font-black uppercase tracking-wider">Total Records</span>
                    <span className="font-extrabold text-foreground mt-0.5 block">{totalRecords}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] font-black uppercase tracking-wider">Applied Filters</span>
                    <span className="font-extrabold text-foreground mt-0.5 block">{getActiveFiltersCount()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] font-black uppercase tracking-wider">Date Range</span>
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
                    <span className="text-muted-foreground block text-[9px] font-black uppercase tracking-wider">Generated By</span>
                    <span className="font-extrabold text-foreground mt-0.5 block">Academy Administrator</span>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={refreshReport}
                      className="p-2 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border text-foreground transition-all"
                      title="Refresh Data"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={duplicateReport}
                      className="p-2 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border text-foreground transition-all"
                      title="Duplicate Settings / Edit Filters"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={changeFilters}
                      className="p-2 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border text-foreground transition-all"
                      title="Change Active Filters"
                    >
                      <Filter className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="relative">
                      <button
                        onClick={() => setShowColumnMenu(!showColumnMenu)}
                        className="p-2 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border text-foreground transition-all"
                        title="Toggle Column Visibility"
                      >
                        <Settings className="w-3.5 h-3.5" />
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

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mr-1">Export:</span>
                    <button
                      onClick={() => exportReport('csv')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-foreground bg-card hover:bg-muted border border-border rounded-xl transition-all shadow-sm"
                      title="Export CSV spreadsheet"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      CSV
                    </button>
                    <button
                      onClick={() => exportReport('pdf')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-foreground bg-card hover:bg-muted border border-border rounded-xl transition-all shadow-sm"
                      title="Export PDF file"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      PDF
                    </button>
                    <button
                      onClick={() => exportReport('print')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-foreground bg-card hover:bg-muted border border-border rounded-xl transition-all shadow-sm"
                      title="Print report layout"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      Print
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Object.entries(reportData.summary).map(([key, value]) => {
                  const cardDetails = getSummaryCardDetails(key);
                  const Icon = cardDetails.icon;
                  return (
                    <div key={key} className={`bg-card border ${cardDetails.borderColor} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-250 flex items-center justify-between`}>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                          {typeof value === 'number' && key.toLowerCase().includes('percentage')
                            ? `${value}%`
                            : typeof value === 'number' && (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('fee') || key.toLowerCase().includes('paid'))
                            ? `₹${value.toLocaleString('en-IN')}`
                            : value}
                        </p>
                      </div>
                      <div className={`w-9 h-9 rounded-xl ${cardDetails.bgColor} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${cardDetails.textColor}`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Charts Visual section */}
              {reportData.charts && reportData.charts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reportData.charts.map((chart, index) => (
                    <div key={index} className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-3">
                        {chart.type === 'pie' ? 'Distribution Analysis' : 'Trend Analysis'}
                      </h4>
                      <div className="p-2 border border-border/20 rounded-xl bg-muted/5">
                        <RenderRechartsChart chart={chart} reportType={selectedReportType} reportData={reportData} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Detailed Data Table card */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">Detailed Records</h4>
                    {reportData.table.rows.length > 0 && (
                      <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded-full">
                        Showing {filteredRows.length} records
                        {totalRecords > filteredRows.length && ` (filtered from ${totalRecords})`}
                      </span>
                    )}
                  </div>
                  
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search records..."
                      className="pl-9 pr-4 py-2 w-full rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 h-[36px]"
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>
                </div>
                
                {reportData.table.rows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <h5 className="text-sm font-bold text-foreground mb-1">No Records Found</h5>
                    <p className="text-xs text-muted-foreground max-w-sm mb-4">
                      No records match the selected filters or search query.
                    </p>
                    <button
                      onClick={changeFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground bg-card hover:bg-muted border border-border rounded-xl transition-colors"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      Change Filters
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-xl border border-border/50">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            {reportData.table.headers.map((header, index) => (
                              visibleColumns[index] && (
                                <th 
                                  key={header} 
                                  onClick={() => handleSort(index)}
                                  className="text-left py-2.5 px-3 font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none group"
                                >
                                  <div className="flex items-center gap-1">
                                    <span>{header}</span>
                                    <span className="inline-flex shrink-0 w-3 h-3 text-muted-foreground">
                                      {sortColumn === index ? (
                                        sortDirection === 'asc' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      )}
                                    </span>
                                  </div>
                                </th>
                              )
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {paginatedRows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-muted/10 transition-colors">
                              {row.map((cell, cellIndex) => (
                                visibleColumns[cellIndex] && (
                                  <td key={cellIndex} className="py-2.5 px-3 whitespace-nowrap align-middle">
                                    {formatTableCell(reportData.table.headers[cellIndex], cell)}
                                  </td>
                                )
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bottom Bar */}
                    {sortedRows.length > 0 && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/50 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                          <span>Rows:</span>
                          <select
                            value={rowsPerPage}
                            onChange={(e) => {
                              setRowsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="bg-card border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                          >
                            {[10, 25, 50, 100].map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                          <span className="ml-2">
                            Showing {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, sortedRows.length)} of {sortedRows.length}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 self-end sm:self-center">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-2 py-1 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors text-xs font-semibold"
                          >
                            Prev
                          </button>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                            let pageNum = idx + 1;
                            if (totalPages > 5 && currentPage > 3) {
                              pageNum = currentPage - 3 + idx;
                              if (pageNum + (4 - idx) > totalPages) {
                                pageNum = totalPages - 4 + idx;
                              }
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                  currentPage === pageNum
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'border border-border hover:bg-muted text-foreground'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-2 py-1 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors text-xs font-semibold"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
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
              {/* Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowQuickReportsDrawer(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in"
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
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Select a report sheet to download</p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {QUICK_REPORTS.map((report) => {
                      const Icon = report.icon;
                      const colorClasses = {
                        emerald: 'from-emerald-500 to-emerald-650',
                        blue: 'from-blue-500 to-blue-650',
                        purple: 'from-purple-500 to-purple-650',
                        amber: 'from-amber-500 to-amber-655',
                        rose: 'from-rose-500 to-rose-650',
                        cyan: 'from-cyan-500 to-cyan-650',
                        indigo: 'from-indigo-500 to-indigo-650',
                        orange: 'from-orange-500 to-orange-650',
                        red: 'from-red-500 to-red-650',
                        teal: 'from-teal-500 to-teal-650',
                      };
                      
                      return (
                        <motion.button
                          key={report.id}
                          onClick={() => {
                            handleQuickReport(report);
                            setShowQuickReportsDrawer(false);
                          }}
                          whileHover={{ x: 4 }}
                          className="flex items-center gap-4 p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/30 text-left transition-all group shadow-sm"
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
              {/* Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRecentReportsDrawer(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in"
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
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
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
                          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider shrink-0">
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
                className="bg-card border border-border rounded-2xl p-5 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-foreground">Save Filter Preset</h3>
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
                  className="w-full input-field py-2 px-3 text-xs bg-card border border-border rounded-xl focus:ring-1 focus:ring-primary/20 mb-4 h-[38px]"
                  autoFocus
                />
                <div className="flex gap-3">
                  <motion.button
                    onClick={saveFilterPreset}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="inline-flex items-center justify-center bg-primary hover:bg-emerald-650 text-white rounded-xl text-xs font-bold flex-1 py-2.5 h-[38px]"
                  >
                    Save Preset
                  </motion.button>
                  <motion.button
                    onClick={() => setShowSaveFilterModal(false)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="inline-flex items-center justify-center bg-card hover:bg-muted border border-border text-foreground rounded-xl text-xs font-bold flex-1 py-2.5 h-[38px]"
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

      </div>

      {/* DEDICATED PRINT/PDF LAYOUT CONTAINER */}
      {reportData && (
        <div className="hidden print:block bg-white text-black p-8 font-sans w-full max-w-4xl mx-auto space-y-8 print-report-container">
          
          {/* Academy Branding Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-4">
              {academyDetails?.logo ? (
                <img
                  src={academyDetails.logo}
                  alt={academyDetails.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-extrabold text-xl shrink-0">
                  {academyDetails?.name ? academyDetails.name.substring(0, 2).toUpperCase() : 'SP'}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {academyDetails?.name || 'Sports Academy Pro'}
                </h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  HQ Academy Management Reports
                </p>
              </div>
            </div>
            <div className="text-right text-[10px]">
              <p className="text-slate-500 font-bold uppercase">Report Generated On</p>
              <p className="font-bold text-slate-900">
                {generatedTime ? `${new Date(generatedTime).toLocaleDateString()} ${new Date(generatedTime).toLocaleTimeString()}` : new Date().toLocaleString()}
              </p>
            </div>
          </div>

          {/* Report Title & Filters */}
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {generateReportTitle().title}
            </h2>
            <p className="text-sm font-bold text-slate-700 tracking-wide">
              {generateReportTitle().subtitle}
            </p>
            
            {/* Filters Summary Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mt-3">
              <div>
                <span className="text-slate-500 font-bold uppercase block text-[9px] tracking-wider">Report Type</span>
                <span className="font-bold text-slate-800 uppercase">{REPORT_TYPES.find(t => t.id === selectedReportType)?.label || selectedReportType}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase block text-[9px] tracking-wider">Total Records</span>
                <span className="font-bold text-slate-800">{totalRecords}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase block text-[9px] tracking-wider">Date Range</span>
                <span className="font-bold text-slate-800">
                  {filters.startDate && filters.endDate 
                    ? `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`
                    : filters.startDate 
                    ? new Date(filters.startDate).toLocaleDateString()
                    : 'All Records'
                  }
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase block text-[9px] tracking-wider">Status/Filters</span>
                <span className="font-bold text-slate-800">
                  {Object.entries(filters)
                    .filter(([key, val]) => val && key !== 'startDate' && key !== 'endDate')
                    .map(([key, val]) => `${key}: ${val}`)
                    .join(', ') || 'No Additional Filters'}
                </span>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">Executive Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(reportData.summary).map(([key, value]) => (
                <div key={key} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                  <span className="text-slate-500 font-bold uppercase block text-[9px] tracking-wider capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-xl font-black text-slate-955 mt-1 block">
                    {typeof value === 'number' && key.includes('Percentage')
                      ? `${value}%`
                      : typeof value === 'number' && (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('amount'))
                      ? `₹${value.toLocaleString('en-IN')}`
                      : value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Charts visual analysis section */}
          {reportData.charts && reportData.charts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">Visual Distribution Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportData.charts.map((chart, index) => (
                  <div key={index} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                      {chart.type === 'pie' ? 'Distribution Analysis' : 'Trend Analysis'}
                    </h4>
                    <RenderRechartsChart chart={chart} reportType={selectedReportType} reportData={reportData} isPrint={true} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Records Table */}
          {reportData.table && reportData.table.rows.length > 0 && (
            <div className="space-y-4 page-break-before">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">Detailed Records</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-fade-in">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-50">
                      {reportData.table.headers.map((header, index) => (
                        visibleColumns[index] && (
                          <th key={header} className="text-left py-2.5 px-3 font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                            {header}
                          </th>
                        )
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="even:bg-slate-50/50">
                        {row.map((cell, cellIndex) => (
                          visibleColumns[cellIndex] && (
                            <td key={cellIndex} className="py-2.5 px-3 text-slate-900 font-semibold">
                              {cell}
                            </td>
                          )
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Print Report Footer */}
          <div className="border-t border-slate-300 pt-4 mt-8 flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase tracking-wider">
            <div>Generated by: Academy Administrator</div>
            <div>Sports Academy Pro SaaS Platform</div>
            <div>Page 1 of 1</div>
          </div>

        </div>
      )}

      {/* Print Styles overrides */}
      <style>{`
        @media print {
          /* HIDE ALL DEFAULT SCREEN LAYOUT ELEMENTS */
          aside, header, nav, footer, button, .no-print, .print-hidden-wrapper, .theme-toggle, .notification-bell {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }

          /* FORCE BACKGROUND WHITE AND UNSET SCROLL/HEIGHT LIMITS ON EVERY CONTAINER IN THE TREE */
          body, html, #root, #root > div, main, main > div, .relative.z-10, [class*="h-screen"], [class*="w-screen"], [class*="overflow-"] {
            background: white !important;
            background-image: none !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
            backdrop-filter: none !important;
          }

          /* SHOW DEDICATED PRINT CONTAINER */
          .print-report-container {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }

          .print-report-container * {
            visibility: visible !important;
            color: black !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          thead {
            display: table-header-group !important;
          }

          tr {
            page-break-inside: avoid !important;
          }

          th, td {
            page-break-inside: avoid !important;
          }

          .page-break-before {
            page-break-before: always !important;
          }

          @page {
            size: A4 portrait;
            margin: 15mm 15mm 20mm 15mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </motion.div>
  );
}
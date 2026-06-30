import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Activity, Target, PlusCircle, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { superAdminGet, superAdminPost } from '../../api/client';

const CONTROL_CATEGORIES = [
  { id: 'global-config', label: 'Global Config', icon: Settings },
  { id: 'sports-attributes', label: 'Sports Attributes', icon: Target },
  { id: 'roles', label: 'Roles', icon: Activity },
];

// Available sport icons for selection
const SPORT_ICONS = [
  '🏏', '⚽', '🏀', '🎾', '🏸', '🏊', '🏐', '🏓', '🏑', '🏃',
  '🥊', '🤼‍♂️', '🏌️‍♂️', '⚾', '🏉', '♟️', '🏹', '🤸‍♂️', '🚴', '🤼',
  '🎯', '🏅', '🎪', '🎢', '🎡', '🎠', '🎲', '🎳', '🎱', '🏆'
];

// INJECTED: 6 Sports with 10 Premium Attributes Each
const DEFAULT_SPORTS = [
  { id: 'cricket', name: 'Cricket', icon: '🏏', attributes: ["Batting Average", "Strike Rate", "Bowling Economy", "Wickets Taken", "Catches Dropped", "Run Out Direct Hits", "Dot Ball %", "Fitness Score", "Yo-Yo Test", "Matches Played"] },
  { id: 'football', name: 'Football', icon: '⚽', attributes: ["Goals Scored", "Assists", "Pass Accuracy %", "Interceptions", "Tackles Won", "Sprints Completed", "Distance Covered (km)", "Yellow/Red Cards", "Shot Accuracy %", "Clean Sheets"] },
  { id: 'basketball', name: 'Basketball', icon: '🏀', attributes: ["Points Per Game", "Rebounds", "Assists", "Steals", "Blocks", "Free Throw %", "3-Point %", "Turnovers", "Minutes Played", "Fouls"] },
  { id: 'tennis', name: 'Tennis', icon: '🎾', attributes: ["Aces", "First Serve %", "Double Faults", "Break Points Won", "Unforced Errors", "Winners", "Return Points Won", "Net Points Won", "Match Win Rate", "Stamina Index"] },
  { id: 'badminton', name: 'Badminton', icon: '🏸', attributes: ["Smash Winners", "Drop Shot Accuracy", "Rallies Won", "Errors at Net", "Serve Accuracy", "Footwork Speed", "Jump Smashes", "Matches Won", "Stamina Level", "Agility Score"] },
  { id: 'swimming', name: 'Swimming', icon: '🏊', attributes: ["50m Freestyle Time", "100m Butterfly Time", "Turn Speed", "Dive Reaction Time", "Breath Control (sec)", "Stroke Rate", "Kick Efficiency", "Endurance Score", "Lap Consistency", "Personal Best Beats"] },

  // --- Newly Added 14 Sports ---
  { id: 'volleyball', name: 'Volleyball', icon: '🏐', attributes: ["Spike Success %", "Blocks Made", "Digs", "Serve Aces", "Pass Accuracy %", "Setting Assists", "Service Errors", "Jump Height (cm)", "Agility Score", "Matches Played"] },
  { id: 'table_tennis', name: 'Table Tennis', icon: '🏓', attributes: ["Forehand Winners", "Backhand Winners", "Spin Accuracy", "Block Success %", "Serve Points", "Unforced Errors", "Rally Win Rate", "Reaction Time", "Footwork Speed", "Match Win Rate"] },
  { id: 'hockey', name: 'Hockey', icon: '🏑', attributes: ["Goals Scored", "Penalty Corner Conversion %", "Interceptions", "Pass Accuracy", "Tackles Won", "Saves (Goalie)", "Dribbles Completed", "Distance Covered", "Green/Yellow Cards", "Stamina Index"] },
  { id: 'athletics', name: 'Athletics (Track & Field)', icon: '🏃', attributes: ["100m Sprint Time", "400m Time", "Long Jump Distance", "High Jump Height", "Javelin Throw Distance", "Reaction Time at Block", "Stride Length", "Endurance Score", "Personal Best Improvements", "Form Consistency"] },
  { id: 'boxing', name: 'Boxing', icon: '🥊', attributes: ["Punches Landed", "Punch Accuracy %", "Knockdowns", "Dodges/Slips", "Jabs Landed", "Power Punches", "Block Success %", "Footwork Agility", "Stamina Level", "Matches Won"] },
  { id: 'kabaddi', name: 'Kabaddi', icon: '🤼‍♂️', attributes: ["Successful Raids", "Super Raids", "Tackle Points", "Super Tackles", "Touch Points", "Bonus Points", "Escapes", "Empty Raids", "Catch Success %", "Agility Index"] },
  { id: 'golf', name: 'Golf', icon: '🏌️‍♂️', attributes: ["Driving Distance", "Fairways Hit %", "Greens in Regulation (GIR)", "Putts per Round", "Sand Saves %", "Birdies", "Eagles", "Bogey Avoidance", "Handicap", "Swing Speed"] },
  { id: 'baseball', name: 'Baseball', icon: '⚾', attributes: ["Batting Average", "Home Runs", "RBIs", "On-Base Percentage", "Strikeouts (Pitcher)", "ERA (Earned Run Average)", "Fielding Percentage", "Stolen Bases", "Fastball Speed", "Innings Pitched"] },
  { id: 'rugby', name: 'Rugby', icon: '🏉', attributes: ["Tries Scored", "Tackles Made", "Tackle Success %", "Meters Gained", "Passes Completed", "Offloads", "Rucks Won", "Lineouts Won", "Penalties Conceded", "Stamina Index"] },
  { id: 'chess', name: 'Chess', icon: '♟️', attributes: ["ELO Rating", "Matches Won", "Draws", "Matches Lost", "Blunders", "Inaccuracies", "Centipawn Loss", "Opening Accuracy", "Middle-Game Tactics", "Endgame Conversion %"] },
  { id: 'archery', name: 'Archery', icon: '🏹', attributes: ["10-Ring Hits", "Bullseyes", "Average Arrow Score", "Wind Adjustment Accuracy", "Release Consistency", "Bow Arm Stability", "Draw Weight Comfort", "Total Points", "Tournament Wins", "Focus/Concentration Index"] },
  { id: 'gymnastics', name: 'Gymnastics', icon: '🤸‍♂️', attributes: ["Vault Score", "Uneven Bars Score", "Balance Beam Score", "Floor Exercise Score", "Execution Deductions", "Difficulty Value", "Landing Stability", "Flexibility Index", "Core Strength", "Competition Medals"] },
  { id: 'cycling', name: 'Cycling', icon: '🚴', attributes: ["Average Speed (km/h)", "Peak Power Output (Watts)", "FTP (Functional Threshold Power)", "Cadence (RPM)", "Distance Covered", "Elevation Climbed", "Sprint Speed", "Heart Rate Efficiency", "V02 Max", "Time Trial Record"] },
  { id: 'wrestling', name: 'Wrestling', icon: '🤼', attributes: ["Takedowns", "Escapes", "Reversals", "Near Falls", "Pins / Falls", "Mat Control Time", "Defense Success %", "Stamina Index", "Flexibility", "Matches Won"] }
];

export default function ControllerPanel() {
  const [activeCategory, setActiveCategory] = useState('sports-attributes');
  const [sports, setSports] = useState([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [expandedSportId, setExpandedSportId] = useState(null);
  const [newAttributeInputs, setNewAttributeInputs] = useState({});

  // Add New Sport Modal State
  const [isAddSportModalOpen, setIsAddSportModalOpen] = useState(false);
  const [newSportName, setNewSportName] = useState('');
  const [newSportIcon, setNewSportIcon] = useState('🏏');
  const [newSportAttributes, setNewSportAttributes] = useState([]);
  const [newAttributeInput, setNewAttributeInput] = useState('');
  const [isSavingSport, setIsSavingSport] = useState(false);

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
  };

  // Fetch sports from API on mount
  useEffect(() => {
    const fetchSports = async () => {
      try {
        setLoadingSports(true);
        const response = await superAdminGet('/sports');
        if (response && response.data) {
          setSports(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch sports:', error);
        // Fallback to default sports if API fails
        setSports(DEFAULT_SPORTS);
      } finally {
        setLoadingSports(false);
      }
    };

    fetchSports();
  }, []);

  const toggleSportExpansion = (sportId) => {
    setExpandedSportId(expandedSportId === sportId ? null : sportId);
  };

  const handleAddAttribute = (sportId) => {
    const attributeName = newAttributeInputs[sportId]?.trim();
    if (!attributeName) return;

    setSports((prevSports) =>
      prevSports.map((sport) =>
        sport.id === sportId
          ? {
            ...sport,
            attributes: [...sport.attributes, attributeName]
          }
          : sport
      )
    );
    setNewAttributeInputs((prev) => ({ ...prev, [sportId]: '' }));
  };

  const handleRemoveAttribute = (sportId, attributeIndex) => {
    setSports((prevSports) =>
      prevSports.map((sport) =>
        sport.id === sportId
          ? {
            ...sport,
            attributes: sport.attributes.filter((_, index) => index !== attributeIndex)
          }
          : sport
      )
    );
  };

  const handleAttributeInputChange = (sportId, value) => {
    setNewAttributeInputs((prev) => ({ ...prev, [sportId]: value }));
  };

  // Add New Sport Modal Handlers
  const handleAddSportAttribute = () => {
    const attributeName = newAttributeInput.trim();
    if (!attributeName) return;
    setNewSportAttributes([...newSportAttributes, attributeName]);
    setNewAttributeInput('');
  };

  const handleRemoveSportAttribute = (index) => {
    setNewSportAttributes(newSportAttributes.filter((_, i) => i !== index));
  };

  const handleSaveNewSport = async () => {
    if (!newSportName.trim()) {
      alert("Please enter a sport name.");
      return;
    }

    setIsSavingSport(true);
    try {
      const payload = {
        name: newSportName.trim(),
        icon: newSportIcon,           // Selected icon exact state pass ho raha hai
        attributes: newSportAttributes // Dynamic list arrays strings ke sath
      };

      // 🎯 FIX: URL path ko badal kar '/super-admin/sports' kiya taaki 404 error na aaye
      // 🎯 FINAL CLEAN CALL INSIDE CONTROLLER PANEL
      const response = await superAdminPost('/super-admin/sports', payload);

      // successResponse utility ya unwrap check validation
      if (response && (response.success || response.id)) {

        // Backend se return hone wala saved object extract karo safely
        const savedSport = response.sport || response.data || response;

        // Main list custom hook/state me update sync karo (Bina refresh ke render hoga)
        setSports((prevSports) => [...prevSports, savedSport]);

        // Reset layout states completely
        setIsAddSportModalOpen(false);
        setNewSportName('');
        setNewSportIcon('🏏'); // Default status fallback
        setNewSportAttributes([]);
        setNewAttributeInput('');

        alert('Sport created successfully! 🎉');
      } else {
        alert(response?.message || 'Failed to create sport. Validation error.');
      }
    } catch (error) {
      console.error('Failed to create sport:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Please try again.';
      alert(`Failed to create sport: ${errorMessage}`);
    } finally {
      setIsSavingSport(false);
    }
  };

  const handleCancelAddSport = () => {
    setIsAddSportModalOpen(false);
    setNewSportName('');
    setNewSportIcon('🏏');
    setNewSportAttributes([]);
    setNewAttributeInput('');
  };

  return (
    <div className="bg-slate-50 min-h-screen flex w-full overflow-hidden">
      {/* Left Sidebar - Control Categories */}
      <div className="w-64 bg-white/50 border-r border-slate-200/60 p-4 flex-shrink-0">
        <div className="mb-6">
          <h2 className="text-slate-800 text-lg font-bold">Controller Panel</h2>
          <p className="text-slate-400 text-xs mt-1">Global system configuration</p>
        </div>

        <nav className="space-y-2">
          {CONTROL_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <motion.button
                key={category.id}
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${isActive
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-slate-600 hover:bg-slate-100/70'
                  }`}
                onClick={() => handleCategoryChange(category.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Right Main Area - Sports Attributes */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeCategory === 'sports-attributes' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-slate-800 text-2xl font-bold">Manage Sports Attributes</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Define dynamic performance tracking metrics for coaches and admins
                </p>
              </div>
              <motion.button
                type="button"
                className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 text-sm font-medium shadow-sm"
                onClick={() => setIsAddSportModalOpen(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <PlusCircle className="w-4 h-4" />
                Add New Sport
              </motion.button>
            </div>

            {/* Sports Grid */}
            {loadingSports ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-slate-400 text-sm">Loading sports...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sports?.map((sport, index) => (
                  <motion.div
                    key={sport.id}
                    className="bg-white/75 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    {/* Sport Header */}
                    <motion.button
                      type="button"
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                      onClick={() => toggleSportExpansion(sport.id)}
                      whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">
                          {sport.icon}
                        </div>
                        <div className="text-left">
                          <h3 className="text-slate-800 text-base font-semibold">{sport.name}</h3>
                          <p className="text-slate-400 text-xs">
                            {sport.attributes?.length || 0} attributes configured
                          </p>
                        </div>
                      </div>
                      {expandedSportId === sport.id ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </motion.button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedSportId === sport.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-200/60"
                        >
                          <div className="p-5 space-y-4">
                            {/* Attributes List */}
                            <div>
                              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                                Existing Attributes
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {sport.attributes?.map((attribute, attrIndex) => (
                                  <span
                                    key={attrIndex}
                                    className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 text-sm text-slate-600 rounded-lg"
                                  >
                                    {attribute}
                                    <motion.button
                                      type="button"
                                      className="text-slate-400 hover:text-red-500 transition-colors"
                                      onClick={() => handleRemoveAttribute(sport.id, attrIndex)}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </motion.button>
                                  </span>
                                )) || (
                                    <span className="text-slate-400 text-sm">No attributes configured</span>
                                  )}
                              </div>
                            </div>

                            {/* Add New Attribute Form */}
                            <div className="flex gap-3">
                              <input
                                type="text"
                                placeholder="e.g., Batting Average"
                                value={newAttributeInputs[sport.id] || ''}
                                onChange={(e) => handleAttributeInputChange(sport.id, e.target.value)}
                                className="flex-1 px-4 py-2.5 bg-white/90 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddAttribute(sport.id);
                                  }
                                }}
                              />
                              <motion.button
                                type="button"
                                className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 text-sm font-medium"
                                onClick={() => handleAddAttribute(sport.id)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <PlusCircle className="w-4 h-4" />
                                Add
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeCategory === 'global-config' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-full"
          >
            <div className="text-center">
              <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-slate-800 text-lg font-semibold">Global Configuration</h3>
              <p className="text-slate-400 text-sm mt-2">Coming soon</p>
            </div>
          </motion.div>
        )}

        {activeCategory === 'roles' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-full"
          >
            <div className="text-center">
              <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-slate-800 text-lg font-semibold">Roles Management</h3>
              <p className="text-slate-400 text-sm mt-2">Coming soon</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Add New Sport Modal */}
      <AnimatePresence>
        {isAddSportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleCancelAddSport}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-slate-800 text-lg font-bold">Add New Sport</h3>
                  <p className="text-slate-400 text-xs mt-1">Create a new sport with custom attributes</p>
                </div>
                <motion.button
                  type="button"
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  onClick={handleCancelAddSport}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-slate-400" />
                </motion.button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Sport Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Sport Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Karate"
                    value={newSportName}
                    onChange={(e) => setNewSportName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all"
                  />
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Icon *</label>
                  <div className="grid grid-cols-10 gap-2">
                    {SPORT_ICONS.map((icon) => (
                      <motion.button
                        key={icon}
                        type="button"
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${newSportIcon === icon
                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-500 ring-offset-2'
                          : 'bg-slate-100 hover:bg-slate-200'
                          }`}
                        onClick={() => setNewSportIcon(icon)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {icon}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Attributes Manager */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Attributes</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="e.g., Punch Power"
                      value={newAttributeInput}
                      onChange={(e) => setNewAttributeInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSportAttribute();
                        }
                      }}
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all"
                    />
                    <motion.button
                      type="button"
                      className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 text-sm font-medium"
                      onClick={handleAddSportAttribute}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <PlusCircle className="w-4 h-4" />
                    </motion.button>
                  </div>
                  {newSportAttributes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newSportAttributes.map((attr, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 text-sm text-slate-600 rounded-lg"
                        >
                          {attr}
                          <motion.button
                            type="button"
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            onClick={() => handleRemoveSportAttribute(index)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </motion.button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <motion.button
                  type="button"
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-medium"
                  onClick={handleCancelAddSport}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="button"
                  className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all text-sm font-medium"
                  onClick={handleSaveNewSport}
                  disabled={isSavingSport}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSavingSport ? 'Saving...' : 'Save Sport'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
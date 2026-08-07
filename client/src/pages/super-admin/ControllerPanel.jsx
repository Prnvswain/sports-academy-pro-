import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, PlusCircle, Trash2, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import {
  superAdminGet,
  superAdminPost,
  superAdminPut,
  superAdminDelete
} from '../../api/client';

const CONTROL_CATEGORIES = [
  { id: 'sports-attributes', label: 'Sports Attributes', icon: Target },
];

const SPORT_ICONS = [
  '🏏', '⚽', '🏀', '🎾', '🏸', '🏊', '🏐', '🏓', '🏑', '🏃',
  '🥊', '🤼‍♂️', '🏌️‍♂️', '⚾', '🏉', '♟️', '🏹', '🤸‍♂️', '🚴', '🤼',
  '🎯', '🏅', '🎪', '🎢', '🎡', '🎠', '🎲', '🎳', '🎱', '🏆'
];

export default function SportsSettingsPanel() {
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

  // Delete Sport Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sportToDelete, setSportToDelete] = useState(null);
  const [isDeletingSport, setIsDeletingSport] = useState(false);

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
  };

  useEffect(() => {
    const fetchSports = async () => {
      try {
        setLoadingSports(true);
        const response = await superAdminGet('/super-admin/sports');
        if (response && response.data && Array.isArray(response.data)) {
          setSports(response.data);
        } else {
          setSports([]);
        }
      } catch (error) {
        console.error('Failed to fetch sports:', error);
        setSports([]);
      } finally {
        setLoadingSports(false);
      }
    };
    fetchSports();
  }, []);

  const toggleSportExpansion = (sportId) => {
    setExpandedSportId(expandedSportId === sportId ? null : sportId);
  };

  const handleAddAttribute = async (sportId) => {
    const attributeName = newAttributeInputs[sportId]?.trim();
    if (!attributeName) return;
    const sport = sports.find((s) => s.id === sportId);
    if (!sport) return;
    const updatedAttributes = [...(sport.attributes || []), attributeName];
    try {
      await superAdminPut(`/super-admin/sports/${sportId}/attributes`, { attributes: updatedAttributes });
      setSports((prev) =>
        prev.map((s) => s.id === sportId ? { ...s, attributes: updatedAttributes } : s)
      );
      setNewAttributeInputs((prev) => ({ ...prev, [sportId]: "" }));
    } catch (err) {
      console.error(err);
      alert("Failed to save attribute.");
    }
  };

  const handleRemoveAttribute = async (sportId, attributeIndex) => {
    const sport = sports.find(s => s.id === sportId);
    if (!sport) return;
    const updatedAttributes = sport.attributes.filter((_, i) => i !== attributeIndex);
    try {
      await superAdminPut(`/super-admin/sports/${sportId}/attributes`, { attributes: updatedAttributes });
      setSports(prev =>
        prev.map(s => s.id === sportId ? { ...s, attributes: updatedAttributes } : s)
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update attributes.");
    }
  };

  const handleAttributeInputChange = (sportId, value) => {
    setNewAttributeInputs((prev) => ({ ...prev, [sportId]: value }));
  };

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
        icon: newSportIcon,
        attributes: newSportAttributes
      };
      const response = await superAdminPost('/super-admin/sports', payload);
      if (response && response.success && response.data) {
        const savedSport = response.data;
        const sportWithFallback = { ...savedSport, icon: savedSport.icon || '🏅' };
        setSports((prevSports) => [...prevSports, sportWithFallback]);
        setIsAddSportModalOpen(false);
        setNewSportName('');
        setNewSportIcon('🏏');
        setNewSportAttributes([]);
        setNewAttributeInput('');
        alert('Sport created successfully! 🎉');
      } else {
        alert(response?.message || 'Failed to create sport.');
      }
    } catch (error) {
      alert(error.message || 'Error occurred');
    } finally {
      setIsSavingSport(false);
    }
  };

  const handleDeleteSportClick = (sport) => {
    setSportToDelete(sport);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!sportToDelete) return;
    setIsDeletingSport(true);
    try {
      const response = await superAdminDelete(`/super-admin/sports/${sportToDelete.id}`);
      if (response?.success) {
        setSports(prev => prev.filter(s => s.id !== sportToDelete.id));
        setIsDeleteModalOpen(false);
        setSportToDelete(null);
        alert('Sport deleted successfully!');
      }
    } catch (err) {
      alert(err.message || 'Failed to delete sport');
    } finally {
      setIsDeletingSport(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setSportToDelete(null);
  };

  const handleCancelAddSport = () => {
    setIsAddSportModalOpen(false);
    setNewSportName('');
    setNewSportIcon('🏏');
    setNewSportAttributes([]);
    setNewAttributeInput('');
  };

  return (
    <div className="flex h-full min-h-[500px] rounded-2xl overflow-hidden super-glass border border-white/10 dark:border-white/5 text-foreground shadow-xl">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-white/5 p-4 flex-shrink-0 bg-white/5">
        <div className="mb-6">
          <h2 className="text-foreground text-sm font-extrabold uppercase tracking-wider">Controller Panel</h2>
          <p className="text-muted-foreground text-[10px] font-bold mt-1">Platform global metadata setups</p>
        </div>

        <nav className="space-y-2">
          {CONTROL_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <motion.button
                key={category.id}
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl uppercase tracking-wider transition-all ${isActive
                  ? 'premium-gradient-purple text-white shadow-lg shadow-purple-500/20'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
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

      {/* Right Main Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeCategory === 'sports-attributes' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h2 className="text-foreground text-lg font-extrabold tracking-tight">Platform Performance Metrics</h2>
                <p className="text-muted-foreground text-xs font-semibold mt-1">
                  Define dynamic tracking performance parameters for coaches and academy admins.
                </p>
              </div>
              <motion.button
                type="button"
                className="px-4 py-2.5 premium-gradient-purple text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20"
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
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sports?.map((sport, index) => (
                  <motion.div
                    key={sport.id}
                    className="bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl shadow-inner overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    {/* Sport Header */}
                    <div
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => toggleSportExpansion(sport.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-md">
                          {sport.icon}
                        </div>
                        <div className="text-left min-w-0">
                          <h3 className="text-foreground text-sm font-extrabold truncate">{sport.name}</h3>
                          <p className="text-muted-foreground text-[10px] font-bold mt-0.5 uppercase tracking-wide">
                            {sport.attributes?.length || 0} parameters
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSportClick(sport);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expandedSportId === sport.id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedSportId === sport.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-white/5 bg-white/5"
                        >
                          <div className="p-5 space-y-4">
                            {/* Attributes List */}
                            <div>
                              <p className="text-muted-foreground text-[9px] font-extrabold uppercase tracking-wider mb-3">
                                Existing Parameters
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {sport.attributes?.map((attribute, attrIndex) => (
                                  <span
                                    key={attrIndex}
                                    className="inline-flex items-center gap-2 bg-white/5 border border-black/5 dark:border-white/5 px-3 py-1.5 text-xs text-foreground font-semibold rounded-lg shadow-sm"
                                  >
                                    {attribute}
                                    <button
                                      type="button"
                                      className="text-muted-foreground hover:text-red-500 transition-colors"
                                      onClick={() => handleRemoveAttribute(sport.id, attrIndex)}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                )) || (
                                    <span className="text-muted-foreground text-xs font-semibold">No attributes configured</span>
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
                                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 dark:border-white/5 rounded-xl focus:outline-none focus:border-purple-500 text-xs text-foreground placeholder-slate-400 outline-none transition-all shadow-inner"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddAttribute(sport.id);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="px-4 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-950 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md hover:opacity-90 transition-all shrink-0"
                                onClick={() => handleAddAttribute(sport.id)}
                              >
                                <PlusCircle className="w-4 h-4" />
                                Add
                              </button>
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
      </div>

      {/* Add New Sport Modal */}
      <AnimatePresence>
        {isAddSportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleCancelAddSport}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-955/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col justify-between text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-foreground text-sm font-extrabold uppercase tracking-wider">Add New Sport Profile</h3>
                  <p className="text-muted-foreground text-[10px] font-semibold mt-1">Configure metrics definition matrix</p>
                </div>
                <button
                  type="button"
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  onClick={handleCancelAddSport}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                {/* Sport Name */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Sport Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Karate"
                    value={newSportName}
                    onChange={(e) => setNewSportName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 dark:border-white/5 rounded-xl focus:outline-none focus:border-purple-500 text-xs text-foreground placeholder-slate-400 outline-none transition-all shadow-inner"
                  />
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Select Icon *</label>
                  <div className="grid grid-cols-10 gap-2 max-h-40 overflow-y-auto p-1.5 border border-white/5 rounded-xl bg-white/5 shadow-inner">
                    {SPORT_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all ${newSportIcon === icon
                          ? 'premium-gradient-purple text-white shadow-lg shadow-purple-500/25 scale-105'
                          : 'hover:bg-white/10'
                          }`}
                        onClick={() => setNewSportIcon(icon)}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Attributes Manager */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Parameters List</label>
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
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 dark:border-white/5 rounded-xl focus:outline-none focus:border-purple-500 text-xs text-foreground placeholder-slate-400 outline-none transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      className="px-4 py-2.5 premium-gradient-purple text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20"
                      onClick={handleAddSportAttribute}
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                  {newSportAttributes.length > 0 && (
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-white/5 rounded-xl bg-white/5 shadow-inner">
                      {newSportAttributes.map((attr, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 text-xs text-foreground font-semibold rounded-lg shadow-sm"
                        >
                          {attr}
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                            onClick={() => handleRemoveSportAttribute(index)}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  className="px-4 py-2.5 super-glass border border-white/10 dark:border-white/5 text-muted-foreground rounded-xl font-bold text-xs hover:text-foreground"
                  onClick={handleCancelAddSport}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-5 py-2.5 premium-gradient-purple text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-500/20 hover:opacity-90"
                  onClick={handleSaveNewSport}
                  disabled={isSavingSport}
                >
                  {isSavingSport ? 'Saving...' : 'Save Sport Profile'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {isDeleteModalOpen && sportToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  handleCancelDelete();
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-slate-955/95 dark:bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-foreground p-6 space-y-4"
              >
                {/* Modal Header */}
                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Delete Sport Profile</h3>
                </div>

                {/* Modal Body */}
                <div className="text-xs font-semibold text-muted-foreground">
                  <p>
                    Are you sure you want to delete <span className="font-extrabold text-foreground">"{sportToDelete.name}"</span>?
                  </p>
                  <p className="text-[10px] text-red-500/80 font-bold mt-1 uppercase tracking-wider">This action cannot be undone.</p>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    className="px-4 py-2.5 super-glass border border-white/15 dark:border-white/5 text-muted-foreground rounded-xl font-bold text-xs"
                    onClick={handleCancelDelete}
                    disabled={isDeletingSport}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-red-500 hover:bg-red-650 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-500/25"
                    onClick={handleConfirmDelete}
                    disabled={isDeletingSport}
                  >
                    {isDeletingSport ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
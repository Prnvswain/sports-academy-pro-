import { useState, useEffect } from 'react';
import { coachGet, coachPost } from '../../api/client';

const PerformanceRatingForm = ({ studentId, batchId, sportId, onSuccess, onCancel }) => {
  const [attributes, setAttributes] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchAttributes();
  }, [sportId]);

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const url = sportId
        ? `/coach/performance/attributes?sport_id=${sportId}&status=APPROVED`
        : '/coach/performance/attributes?status=APPROVED';
      const response = await coachGet(url);
      setAttributes(response.data || response || []);
    } catch (error) {
      console.error('Failed to fetch attributes:', error);
      setErrorMsg('Could not load performance attributes.');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (attributeId, score) => {
    setRatings(prev => ({
      ...prev,
      [attributeId]: score
    }));
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    
    // Formulate payload safely
    const ratingPayload = Object.entries(ratings).map(([attributeId, score]) => ({
      attribute_id: parseInt(attributeId, 10),
      score
    }));

    // Check if everything has been evaluated to avoid partial submission gaps
    if (ratingPayload.length < attributes.length) {
      setErrorMsg('Please assign a rating to all available attributes.');
      return;
    }

    try {
      setSubmitting(true);
      await coachPost('/coach/performance/weekly-performance', {
        student_id: studentId,
        batch_id: batchId,
        ratings: ratingPayload
      });
      onSuccess?.();
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to sync evaluation data.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Determine if form can attempt submission
  const isFormIncomplete = Object.keys(ratings).length < attributes.length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Weekly Performance Evaluation</h2>
      <p className="text-gray-500 text-sm mb-6">Assign a metric level from 1 to 10 for each specific criterion cluster.</p>
      
      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="space-y-6">
        {attributes.length > 0 ? (
          attributes.map((attribute) => (
            <div key={attribute.attribute_id} className="border-b border-gray-100 pb-5 last:border-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                <span className="text-base font-semibold text-gray-700 sm:w-1/3">
                  {attribute.name}
                </span>
                
                <div className="flex flex-wrap items-center gap-1.5 sm:w-2/3 sm:justify-end">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    // FIXED: Equality assessment ensures standard radio button behavior over a filled progress bar
                    const isSelected = ratings[attribute.attribute_id] === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRatingChange(attribute.attribute_id, num)}
                        className={`
                          w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-150
                          ${isSelected 
                            ? 'bg-emerald-500 text-white shadow-md scale-105 ring-2 ring-emerald-500/20' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
                          }
                        `}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {ratings[attribute.attribute_id] && (
                <div className="text-left sm:text-right text-xs text-emerald-600 font-bold tracking-wide">
                  Selected Matrix Rank: {ratings[attribute.attribute_id]} / 10
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
            No active metrics mapped to this training block.
          </p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-6 py-3 rounded-lg font-semibold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || isFormIncomplete}
          className={`
            flex-1 py-3 px-6 rounded-lg font-semibold text-sm transition-all shadow-xs
            ${submitting || isFormIncomplete
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.99]'
            }
          `}
        >
          {submitting ? 'Transmitting Data Model...' : 'Submit Evaluation to Admin & Parent'}
        </button>
      </div>
    </div>
  );
};

export default PerformanceRatingForm;
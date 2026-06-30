import { useState, useEffect } from 'react';
import { api } from '../../api';

const PerformanceRatingForm = ({ studentId, batchId, onSuccess, onCancel }) => {
  const [attributes, setAttributes] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/performance/attributes?status=APPROVED');
      setAttributes(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch attributes:', error);
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
    const ratingPayload = Object.entries(ratings).map(([attributeId, score]) => ({
      attribute_id: parseInt(attributeId, 10),
      score
    }));

    if (ratingPayload.length === 0) {
      alert('Please rate at least one attribute');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/performance/weekly-performance', {
        student_id: studentId,
        batch_id: batchId,
        ratings: ratingPayload
      });
      onSuccess?.();
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
      alert(error.response?.data?.message || 'Failed to submit evaluation');
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Weekly Performance Evaluation</h2>
      
      <div className="space-y-6">
        {attributes.map((attribute) => (
          <div key={attribute.attribute_id} className="border-b border-gray-200 pb-4 last:border-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-medium text-gray-700 w-1/3">
                {attribute.name}
              </span>
              
              <div className="flex items-center gap-1 w-2/3 justify-end">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = ratings[attribute.attribute_id] >= num;
                  return (
                    <button
                      key={num}
                      onClick={() => handleRatingChange(attribute.attribute_id, num)}
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200
                        ${isSelected 
                          ? 'bg-emerald-500 text-white shadow-md transform scale-110' 
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
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
              <div className="text-right text-sm text-emerald-600 font-medium">
                Rating: {ratings[attribute.attribute_id]}/10
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={submitting || Object.keys(ratings).length === 0}
          className={`
            flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200
            ${submitting || Object.keys(ratings).length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-xl'
            }
          `}
        >
          {submitting ? 'Submitting...' : 'Submit Evaluation to Admin & Parent'}
        </button>
        
        <button
          onClick={onCancel}
          className="px-6 py-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PerformanceRatingForm;

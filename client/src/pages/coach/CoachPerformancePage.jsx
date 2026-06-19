import { useCallback, useEffect, useState } from 'react';
import Loader from '../../components/Loader';
import { coachGet, coachPost } from '../../api/client';

export default function CoachPerformancePage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [scores, setScores] = useState({});
  const [newAttributeForm, setNewAttributeForm] = useState({
    sport_id: '',
    name: '',
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showNewProposal, setShowNewProposal] = useState(false);

  const loadBatches = useCallback(async () => {
    try {
      const result = await coachGet('/coach/batches');
      const responseData = result.data;
      if (Array.isArray(responseData)) {
        setBatches(responseData);
      } else if (responseData && Array.isArray(responseData.data)) {
        setBatches(responseData.data);
      } else if (responseData && Array.isArray(responseData.batches)) {
        setBatches(responseData.batches);
      } else {
        setBatches([]);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setBatches([]);
    }
  }, []);

  const loadStudents = useCallback(async (batchId) => {
    if (!batchId) {
      setStudents([]);
      return;
    }
    try {
      const result = await coachGet(`/coach/batches/${batchId}`);
      const responseData = result.data;
      if (responseData && Array.isArray(responseData.students)) {
        setStudents(responseData.students);
      } else {
        setStudents([]);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setStudents([]);
    }
  }, []);

  const loadAttributes = useCallback(async (sportId) => {
    if (!sportId) {
      setAttributes([]);
      return;
    }
    try {
      const result = await coachGet(
        `/coach/performance/attributes?sport_id=${sportId}&status=APPROVED`,
      );
      const responseData = result.data;
      if (Array.isArray(responseData)) {
        setAttributes(responseData);
      } else if (responseData && Array.isArray(responseData.data)) {
        setAttributes(responseData.data);
      } else {
        setAttributes([]);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setAttributes([]);
    }
  }, []);

  const loadStudentPerformance = useCallback(async (studentId) => {
    if (!studentId) {
      setScores({});
      return;
    }
    try {
      const result = await coachGet(`/coach/performance/students/${studentId}`);
      const responseData = result.data;
      const scoresMap = {};
      if (responseData && responseData.attributes) {
        responseData.attributes.forEach((attrGroup) => {
          if (attrGroup.scores && attrGroup.scores.length > 0) {
            const latestScore = attrGroup.scores[0];
            scoresMap[attrGroup.attribute.attribute_id] = latestScore.score;
          }
        });
      }
      setScores(scoresMap);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setScores({});
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadBatches();
      setLoading(false);
    };
    initialize();
  }, [loadBatches]);

  useEffect(() => {
    if (selectedBatch) {
      loadStudents(selectedBatch.batch_id);
      if (selectedBatch.sport_id) {
        loadAttributes(selectedBatch.sport_id);
      }
    }
  }, [selectedBatch, loadStudents, loadAttributes]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentPerformance(selectedStudent.student_id);
    }
  }, [selectedStudent, loadStudentPerformance]);

  const handleBatchSelect = (batch) => {
    setSelectedBatch(batch);
    setSelectedStudent(null);
    setScores({});
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
  };

  const handleScoreChange = (attributeId, value) => {
    setScores((prev) => ({
      ...prev,
      [attributeId]: parseInt(value),
    }));
  };

  const handleSubmitScores = async () => {
    if (!selectedStudent || !selectedBatch) {
      setMessage({ text: 'Please select a student and batch', type: 'error' });
      return;
    }

    const scoreEntries = Object.entries(scores);
    if (scoreEntries.length === 0) {
      setMessage({ text: 'No scores to submit', type: 'error' });
      return;
    }

    setMessage({ text: '', type: '' });
    try {
      const promises = scoreEntries.map(([attributeId, score]) =>
        coachPost('/coach/performance/scores', {
          student_id: selectedStudent.student_id,
          attribute_id: parseInt(attributeId),
          batch_id: selectedBatch.batch_id,
          score: score,
        }),
      );

      await Promise.all(promises);
      setMessage({ text: 'Performance scores submitted successfully', type: 'success' });
      loadStudentPerformance(selectedStudent.student_id);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleDownloadReport = () => {
    if (!selectedStudent || attributes.length === 0) {
      setMessage({ text: 'No data to export', type: 'error' });
      return;
    }

    const csvContent = [
      ['Attribute', 'Score', 'Sport'].join(','),
      ...attributes.map((attr) =>
        [attr.name, scores[attr.attribute_id] || 'N/A', attr.sport?.name || 'Unknown'].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance_${selectedStudent.name}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleProposeAttribute = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      const result = await coachPost('/coach/performance/attributes', {
        sport_id: newAttributeForm.sport_id,
        name: newAttributeForm.name.trim(),
      });
      setMessage({ text: result.message, type: 'success' });
      setNewAttributeForm({ sport_id: '', name: '' });
      setShowNewProposal(false);
      if (selectedBatch && selectedBatch.sport_id) {
        loadAttributes(selectedBatch.sport_id);
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="bg-surface min-h-screen space-y-6 p-6">
      <div>
        <h2 className="text-foreground text-2xl font-bold">Performance Tracker</h2>
        <p className="text-muted text-sm">Evaluate student performance across sports attributes.</p>
      </div>

      {message.text && (
        <div className={`alert-${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      {/* Batch Selection */}
      <div className="card">
        <h3 className="text-foreground mb-4 font-bold">Select Batch</h3>
        {batches.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {batches.map((batch) => (
              <button
                key={batch.batch_id}
                onClick={() => handleBatchSelect(batch)}
                className={`hover:border-accent/30 rounded-lg border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                  selectedBatch?.batch_id === batch.batch_id
                    ? 'border-accent bg-accent/5'
                    : 'border-border bg-surface-secondary'
                }`}
              >
                <div className="text-foreground font-bold">{batch.name}</div>
                <div className="text-muted mt-1 text-sm">
                  {batch.sport?.name || '—'} · {batch.students?.length ?? 0} students
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">No batches assigned to you.</p>
        )}
      </div>

      {selectedBatch && (
        <>
          {/* Student Selection */}
          <div className="card">
            <h3 className="text-foreground mb-4 font-bold">Select Student</h3>
            {students.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((student) => (
                  <button
                    key={student.student_id}
                    onClick={() => handleStudentSelect(student)}
                    className={`hover:border-accent/30 rounded-lg border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                      selectedStudent?.student_id === student.student_id
                        ? 'border-accent bg-accent/5'
                        : 'border-border bg-surface-secondary'
                    }`}
                  >
                    <div className="text-foreground font-bold">{student.name}</div>
                    <div className="text-muted mt-1 text-sm">{student.sport?.name || '—'}</div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm">No students in this batch.</p>
            )}
          </div>

          {selectedStudent && attributes.length > 0 && (
            <>
              {/* Performance Evaluation Matrix */}
              <div className="card">
                <h3 className="text-foreground mb-4 font-bold">
                  Performance Evaluation - {selectedStudent.name}
                </h3>
                <div className="space-y-4">
                  {attributes.map((attr) => (
                    <div
                      key={attr.attribute_id}
                      className="bg-surface-secondary border-border rounded-lg border p-4"
                    >
                      <div className="mb-3">
                        <label className="label">{attr.name}</label>
                        <div className="text-muted mt-1 text-xs">
                          Sport: {attr.sport?.name || 'Unknown'}
                        </div>
                      </div>

                      {/* Interactive 1-10 Score Gauge */}
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                          <button
                            key={value}
                            onClick={() => handleScoreChange(attr.attribute_id, value)}
                            className={`h-8 w-8 rounded-full transition-all duration-300 ${
                              scores[attr.attribute_id] === value
                                ? 'bg-accent text-foreground scale-110'
                                : 'bg-surface border-border hover:border-accent border-2'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <div className="text-muted mt-2 text-xs">
                        Current Score: {scores[attr.attribute_id] || 'Not rated'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="border-border mt-6 flex gap-4 border-t pt-4">
                  <button
                    onClick={handleSubmitScores}
                    className="bg-accent hover:bg-accent-hover text-foreground rounded-xl px-6 py-3 text-sm font-bold transition-all duration-300"
                  >
                    Transmit Report to Admin Portal
                  </button>
                  <button
                    onClick={handleDownloadReport}
                    className="btn-secondary rounded-xl px-6 py-3 text-sm font-bold transition-all duration-300"
                  >
                    Download Performance Report
                  </button>
                </div>
              </div>

              {/* Propose New Attribute */}
              <div className="card">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-foreground font-bold">Propose New Tracking Attribute</h3>
                  <button
                    onClick={() => setShowNewProposal(!showNewProposal)}
                    className="text-accent hover:text-accent-hover text-sm transition-colors"
                  >
                    {showNewProposal ? 'Cancel' : 'Show Form'}
                  </button>
                </div>

                {showNewProposal && (
                  <form className="space-y-4" onSubmit={handleProposeAttribute}>
                    <div>
                      <label className="label" htmlFor="newAttrSport">
                        Sport
                      </label>
                      <select
                        id="newAttrSport"
                        className="input-field"
                        value={newAttributeForm.sport_id}
                        onChange={(e) =>
                          setNewAttributeForm({ ...newAttributeForm, sport_id: e.target.value })
                        }
                        required
                      >
                        <option value="">Select Sport</option>
                        {selectedBatch.sport && (
                          <option value={selectedBatch.sport_id}>
                            {selectedBatch.sport?.name}
                          </option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="newAttrName">
                        Attribute Name
                      </label>
                      <input
                        id="newAttrName"
                        type="text"
                        className="input-field"
                        placeholder="e.g., Bowling Speed"
                        value={newAttributeForm.name}
                        onChange={(e) =>
                          setNewAttributeForm({ ...newAttributeForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-accent hover:bg-accent-hover text-foreground rounded-lg px-4 py-2 text-sm font-bold transition-all duration-300"
                    >
                      Submit for Approval
                    </button>
                  </form>
                )}
              </div>
            </>
          )}

          {selectedStudent && attributes.length === 0 && (
            <div className="card">
              <p className="text-muted text-sm">
                No performance attributes defined for this sport yet. Contact your academy admin to
                add attributes.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

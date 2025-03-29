import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Frown, Angry, Skull, CheckSquare, AlertCircle, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Punishment {
  id: string;
  text: string;
  completed: boolean;
  status?: 'pending' | 'evaluation' | 'completed';
  evaluationDetails?: {
    learnings: string;
  };
}

interface MoodEntry {
  id: string;
  created_at: string;
  mood: 'pissed' | 'mad' | 'counting';
  event: string;
  description?: string;
  punishments?: Punishment[];
  completed?: boolean;
  user_id: string;
}

interface PunishmentTrackerProps {
  refreshTrigger?: number;
}

export function PunishmentTracker({ refreshTrigger = 0 }: PunishmentTrackerProps) {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionStats, setCompletionStats] = useState({
    total: 0,
    completed: 0,
    pending: 0
  });
  const [updatingPunishments, setUpdatingPunishments] = useState<string[]>([]);
  const [selectedPunishment, setSelectedPunishment] = useState<{entryId: string; punishmentId: string; text: string} | null>(null);
  const [evaluationDetails, setEvaluationDetails] = useState({
    learnings: ''
  });
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Use memoized fetchEntries to prevent recreating function on each render
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data: entries, error } = await supabase
      .from('mood_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching entries:', error);
    } else {
      // Filter to only include entries with punishments
      const entriesWithPunishments = (entries as MoodEntry[]).filter(
        entry => entry.punishments && entry.punishments.length > 0
      );
      setEntries(entriesWithPunishments);
      
      // Calculate completion statistics
      let totalPunishments = 0;
      let completedPunishments = 0;
      
      entriesWithPunishments.forEach(entry => {
        if (entry.punishments) {
          totalPunishments += entry.punishments.length;
          completedPunishments += entry.punishments.filter(p => p.completed).length;
        }
      });
      
      setCompletionStats({
        total: totalPunishments,
        completed: completedPunishments,
        pending: totalPunishments - completedPunishments
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries, refreshTrigger]);

  // Redefined toggle function to handle the evaluation workflow
  const togglePunishment = useCallback(async (entryId: string, punishmentId: string, action: 'submit' | 'approve' | 'reject' = 'submit') => {
    // Prevent toggling if already updating
    if (updatingPunishments.includes(punishmentId)) return;
    
    // Add to updating state immediately
    setUpdatingPunishments(prev => [...prev, punishmentId]);
    
    try {
      // First get the current entry
      const { data: currentEntry } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('id', entryId)
        .single();
      
      if (!currentEntry || !currentEntry.punishments) {
        console.error('Entry not found or has no punishments');
        setUpdatingPunishments(prev => prev.filter(id => id !== punishmentId));
        await fetchEntries(); // Refresh to get back to consistent state
        return;
      }
      
      // Update the punishment based on the action
      const updatedPunishments = currentEntry.punishments.map((p: Punishment) => {
        if (p.id !== punishmentId) return p;
        
        switch (action) {
          case 'submit':
            // Move from pending to evaluation
            return { ...p, status: 'evaluation' };
          case 'approve':
            // Mark as completed when approved
            return { ...p, status: 'completed', completed: true };
          case 'reject':
            // Return to pending when rejected
            return { ...p, status: 'pending' };
          default:
            return p;
        }
      });
      
      // Check if all punishments are completed
      const allCompleted = updatedPunishments.every((p: Punishment) => p.completed);
      
      // Update in database
      const { error } = await supabase
        .from('mood_entries')
        .update({
          punishments: updatedPunishments,
          completed: allCompleted
        })
        .eq('id', entryId);
      
      if (error) {
        console.error('Error updating punishment:', error);
      }
      
      // Update local state after database update
      setEntries(currentEntries => {
        return currentEntries.map(entry => {
          if (entry.id !== entryId) return entry;
          return {
            ...entry,
            punishments: updatedPunishments,
            completed: allCompleted
          };
        });
      });
      
    } catch (error) {
      console.error('Error in togglePunishment:', error);
    } finally {
      // Always remove from updating state
      setUpdatingPunishments(prev => prev.filter(id => id !== punishmentId));
    }
  }, [updatingPunishments, fetchEntries]);

  // Function to submit a punishment for evaluation with details
  const submitForEvaluation = async (entryId: string, punishmentId: string) => {
    setUpdatingPunishments(prev => [...prev, punishmentId]);
    
    try {
      // Get the current entry
      const { data: currentEntry } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('id', entryId)
        .single();
      
      if (!currentEntry || !currentEntry.punishments) {
        console.error('Entry not found or has no punishments');
        setUpdatingPunishments(prev => prev.filter(id => id !== punishmentId));
        return;
      }
      
      // Update the punishment status and add evaluation details
      const updatedPunishments = currentEntry.punishments.map((p: Punishment) => 
        p.id === punishmentId ? { 
          ...p, 
          status: 'evaluation',
          evaluationDetails: evaluationDetails.learnings ? { learnings: evaluationDetails.learnings } : undefined
        } : p
      );
      
      // Update in database
      const { error } = await supabase
        .from('mood_entries')
        .update({
          punishments: updatedPunishments
        })
        .eq('id', entryId);
      
      if (error) {
        console.error('Error updating punishment:', error);
      } else {
        // Update local state
        setEntries(currentEntries => {
          return currentEntries.map(entry => {
            if (entry.id !== entryId) return entry;
            return {
              ...entry,
              punishments: updatedPunishments
            };
          });
        });
        
        // Reset form and close modal
        setSelectedPunishment(null);
        setEvaluationDetails({ learnings: '' });
        setShowSubmitModal(false);
      }
    } catch (error) {
      console.error('Error in submitForEvaluation:', error);
    } finally {
      setUpdatingPunishments(prev => prev.filter(id => id !== punishmentId));
    }
  };

  // Modal component for submission
  const SubmitModal = () => {
    if (!selectedPunishment || !showSubmitModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" 
           onClick={() => setShowSubmitModal(false)}>
        <div className="bg-white rounded-lg p-6 w-11/12 max-w-md mx-auto shadow-2xl transform transition-all" 
             onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-xl font-bold text-gray-900">Submit for Evaluation</h3>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setShowSubmitModal(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md mb-4 border-l-4 border-blue-500">
            <p className="text-gray-800 font-medium">{selectedPunishment.text}</p>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">What did you learn? (optional)</label>
            <textarea 
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
              value={evaluationDetails.learnings}
              onChange={(e) => setEvaluationDetails({ learnings: e.target.value })}
              placeholder="Your learnings from this experience..."
              autoFocus
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              onClick={() => {
                setShowSubmitModal(false);
                setSelectedPunishment(null);
                setEvaluationDetails({ learnings: '' });
              }}
            >
              Cancel
            </button>
            <button
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-md"
              onClick={() => submitForEvaluation(selectedPunishment.entryId, selectedPunishment.punishmentId)}
            >
              Send for Evaluation
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Organize punishments by status
  const getPendingPunishments = useCallback(() => {
    const pending: { entryId: string; entry: MoodEntry; punishment: Punishment }[] = [];
    
    entries.forEach(entry => {
      if (entry.punishments) {
        entry.punishments
          .filter(p => !p.completed && (!p.status || p.status === 'pending'))
          .forEach(punishment => {
            pending.push({
              entryId: entry.id,
              entry,
              punishment: { ...punishment, status: punishment.status || 'pending' }
            });
          });
      }
    });
    
    return pending;
  }, [entries]);

  // Get punishments that are in evaluation stage
  const getEvaluationPunishments = useCallback(() => {
    const evaluating: { entryId: string; entry: MoodEntry; punishment: Punishment }[] = [];
    
    entries.forEach(entry => {
      if (entry.punishments) {
        entry.punishments
          .filter(p => p.status === 'evaluation')
          .forEach(punishment => {
            evaluating.push({
              entryId: entry.id,
              entry,
              punishment
            });
          });
      }
    });
    
    return evaluating;
  }, [entries]);

  // Get completed punishments
  const getCompletedPunishments = useCallback(() => {
    const completed: { entryId: string; entry: MoodEntry; punishment: Punishment }[] = [];
    
    entries.forEach(entry => {
      if (entry.punishments) {
        entry.punishments
          .filter(p => p.completed || p.status === 'completed')
          .forEach(punishment => {
            completed.push({
              entryId: entry.id,
              entry,
              punishment
            });
          });
      }
    });
    
    return completed;
  }, [entries]);

  const getEvaluationStats = useCallback(() => {
    let total = getEvaluationPunishments().length;
    let pendingCount = getPendingPunishments().length;
    let completedCount = getCompletedPunishments().length;
    let totalPunishments = total + pendingCount + completedCount;
    
    return {
      evaluationCount: total,
      evaluationPercentage: totalPunishments > 0 ? Math.round((total / totalPunishments) * 100) : 0,
      pendingToEvaluationRatio: pendingCount > 0 ? Math.round((total / pendingCount) * 100) : 0,
      averageTimeInEvaluation: "24 hours" // Placeholder - would need actual timestamps
    };
  }, [getEvaluationPunishments, getPendingPunishments, getCompletedPunishments]);

  const evaluationStats = getEvaluationStats();

  const pendingPunishments = getPendingPunishments();
  const evaluationPunishments = getEvaluationPunishments();
  const completedPunishments = getCompletedPunishments();

  const getMoodIcon = (mood: 'pissed' | 'mad' | 'counting') => {
    switch (mood) {
      case 'pissed': return <Frown className="text-green-500" />;
      case 'mad': return <Angry className="text-blue-500" />;
      case 'counting': return <Skull className="text-pink-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-cream p-6" onClick={(e) => e.stopPropagation()}>
      <div className="max-w-6xl mx-auto">
        <motion.h1 
          className="text-4xl font-bold mb-8 text-center fun-title gradient-text"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          Punishment Tracker
        </motion.h1>

        {loading ? (
          <div className="text-center py-8">Loading punishments...</div>
        ) : (
          <>
            {/* Stats Cards */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-white rounded-lg shadow-md p-5 mood-card">
                <h3 className="text-gray-500 text-sm font-medium">Total Punishments</h3>
                <p className="text-3xl font-bold mt-2">{completionStats.total}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-5 mood-card">
                <h3 className="text-gray-500 text-sm font-medium">Pending Punishments</h3>
                <p className="text-3xl font-bold mt-2 text-red-500">{completionStats.pending}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-5 mood-card">
                <h3 className="text-gray-500 text-sm font-medium">Completion Rate</h3>
                <p className="text-3xl font-bold mt-2">
                  {completionStats.total > 0 
                    ? `${Math.round((completionStats.completed / completionStats.total) * 100)}%` 
                    : '0%'}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full" 
                    style={{ width: `${completionStats.total > 0 ? (completionStats.completed / completionStats.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </motion.div>

            {/* Pending Punishments */}
            <motion.div 
              className="bg-white rounded-lg shadow-md p-5 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold mb-4 fun-title flex items-center">
                <AlertCircle className="mr-2 text-red-500" /> Pending Punishments
              </h2>

              {/* Submission Guidelines */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-2">Submission Guidelines:</h3>
                <ul className="text-sm space-y-2 text-gray-600">
                  <li><span className="font-medium">1.</span> What did you learn from this experience?</li>
                  <li><span className="font-medium">2.</span> Was the punishment proportional to the mood event?</li>
                  <li><span className="font-medium">3.</span> How has this changed your perspective?</li>
                  <li><span className="font-medium">4.</span> Submit with honest reflection for proper evaluation.</li>
                </ul>
              </div>
              
              {selectedPunishment ? (
                <motion.div 
                  className="bg-blue-50 p-5 rounded-lg mb-6 border-l-4 border-blue-500"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <h3 className="font-medium text-blue-700 mb-3 flex items-center">
                    <Clock className="mr-2" /> Submit for Evaluation: <span className="ml-2 font-bold">{selectedPunishment.text}</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">What did you learn from this?</label>
                      <textarea 
                        className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        value={evaluationDetails.learnings}
                        onChange={(e) => setEvaluationDetails({ learnings: e.target.value })}
                        placeholder="Describe what you learned..."
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-2">
                      <button
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        onClick={() => {
                          setSelectedPunishment(null);
                          setEvaluationDetails({ learnings: '' });
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={() => submitForEvaluation(selectedPunishment.entryId, selectedPunishment.punishmentId)}
                      >
                        Submit for Evaluation
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
              
              {pendingPunishments.length > 0 ? (
                <ul className="space-y-4">
                  {pendingPunishments.map(({ entryId, entry, punishment }) => (
                    <motion.li 
                      key={`${entryId}-${punishment.id}`}
                      className="border-b pb-4 tilt-card"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      whileHover={{ x: 5 }}
                    >
                      <div className="flex items-center mb-2">
                        <span className="mr-2">{getMoodIcon(entry.mood)}</span>
                        <span className="font-medium">{entry.event}</span>
                        <span className="ml-auto text-xs text-gray-500">
                          {format(new Date(entry.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      
                      <div className="ml-6 flex items-center justify-between">
                        <span className="text-sm mr-4">{punishment.text}</span>
                        <button 
                          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm flex items-center"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedPunishment({
                              entryId,
                              punishmentId: punishment.id,
                              text: punishment.text
                            });
                            setShowSubmitModal(true);
                          }}
                        >
                          <Clock className="h-4 w-4 mr-1.5" /> Submit
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No pending punishments!</p>
                  <p className="text-sm mt-2">You're all caught up. Great job!</p>
                </div>
              )}
            </motion.div>

            {/* Evaluating Punishments - Enhanced Section */}
            <motion.div 
              className="bg-orange-50 rounded-lg shadow-md p-5 mb-8 border-2 border-orange-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold mb-4 fun-title flex items-center text-orange-700">
                <Clock className="mr-2 text-orange-500" /> Punishment Evaluation Center
              </h2>
              
              {/* Evaluation Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-lg">
                <div className="text-center p-3 bg-orange-100 rounded-lg">
                  <p className="text-sm text-orange-700 font-medium">Items Awaiting Evaluation</p>
                  <p className="text-2xl font-bold text-orange-600">{evaluationStats.evaluationCount}</p>
                  <p className="text-xs text-orange-500">{evaluationStats.evaluationPercentage}% of all punishments</p>
                </div>
                <div className="text-center p-3 bg-orange-100 rounded-lg">
                  <p className="text-sm text-orange-700 font-medium">Pending to Evaluation Ratio</p>
                  <p className="text-2xl font-bold text-orange-600">{evaluationStats.pendingToEvaluationRatio}%</p>
                  <p className="text-xs text-orange-500">Higher means more items are being submitted</p>
                </div>
                <div className="text-center p-3 bg-orange-100 rounded-lg">
                  <p className="text-sm text-orange-700 font-medium">Avg. Time in Evaluation</p>
                  <p className="text-2xl font-bold text-orange-600">{evaluationStats.averageTimeInEvaluation}</p>
                  <p className="text-xs text-orange-500">Be honest with your evaluations!</p>
                </div>
              </div>
              
              {/* Evaluation Guide */}
              <div className="bg-white p-4 rounded-lg mb-6">
                <h3 className="font-medium text-orange-700 mb-2">Evaluation Guidelines:</h3>
                <ul className="text-sm space-y-2 text-gray-700">
                  <li><span className="font-medium">1.</span> Did you complete the punishment fully and honestly?</li>
                  <li><span className="font-medium">2.</span> Was the punishment proportional to the mood event?</li>
                  <li><span className="font-medium">3.</span> Have you learned something from this experience?</li>
                  <li><span className="font-medium">4.</span> Only approve if you can answer YES to all of the above.</li>
                </ul>
              </div>
              
              {evaluationPunishments.length > 0 ? (
                <div>
                  <h3 className="font-medium text-orange-700 mb-4">Items Awaiting Your Evaluation:</h3>
                  <ul className="space-y-4">
                    {evaluationPunishments.map(({ entryId, entry, punishment }) => (
                      <motion.li 
                        key={`${entryId}-${punishment.id}`}
                        className="border-l-4 border-orange-400 bg-white pl-4 pr-2 py-3 rounded-lg shadow-sm"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        whileHover={{ x: 5, backgroundColor: "#FFF8F0" }}
                      >
                        <div className="flex items-center mb-2">
                          <span className="mr-2">{getMoodIcon(entry.mood)}</span>
                          <span className="font-medium">{entry.event}</span>
                          <span className="ml-auto text-xs text-gray-500">
                            {format(new Date(entry.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        
                        <div className="ml-6 mb-3">
                          <p className="text-sm font-medium mb-1">{punishment.text}</p>
                          {entry.description && (
                            <p className="text-xs text-gray-600 italic">Original context: {entry.description}</p>
                          )}
                        </div>
                        
                        <div className="ml-6 flex items-center justify-end space-x-3">
                          <div 
                            className="flex items-center cursor-pointer hover:bg-green-100 py-1 px-3 rounded-full transition-colors"
                            aria-label={`Approve punishment ${punishment.text}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              togglePunishment(entryId, punishment.id, 'approve');
                            }}
                          >
                            <ThumbsUp className="h-5 w-5 text-green-500 mr-1" />
                            <span className="text-sm text-green-700">Approve</span>
                          </div>
                          <div 
                            className="flex items-center cursor-pointer hover:bg-red-100 py-1 px-3 rounded-full transition-colors"
                            aria-label={`Reject punishment ${punishment.text}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              togglePunishment(entryId, punishment.id, 'reject');
                            }}
                          >
                            <ThumbsDown className="h-5 w-5 text-red-500 mr-1" />
                            <span className="text-sm text-red-700">Reject</span>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-6 text-orange-500 bg-white rounded-lg">
                  <p className="font-medium">No punishments in evaluation.</p>
                  <p className="text-sm mt-2">Submit some pending punishments for evaluation!</p>
                </div>
              )}
            </motion.div>

            {/* Completed Punishments */}
            <motion.div 
              className="bg-white rounded-lg shadow-md p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-xl font-semibold mb-4 fun-title flex items-center">
                <CheckSquare className="mr-2 text-green-500" /> Recently Completed
              </h2>
              
              {completedPunishments.length > 0 ? (
                <ul className="space-y-4">
                  {completedPunishments.map(({ entryId, entry, punishment }) => (
                    <li 
                      key={`${entryId}-${punishment.id}`}
                      className="border-b pb-3 opacity-75"
                    >
                      <div className="flex items-center mb-2">
                        <span className="mr-2">{getMoodIcon(entry.mood)}</span>
                        <span className="font-medium">{entry.event}</span>
                        <span className="ml-auto text-xs text-gray-500">
                          {format(new Date(entry.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      
                      <div className="ml-6 flex items-center">
                        <div
                          className="mr-2 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          aria-label={`Toggle punishment ${punishment.text}`}
                        >
                          <CheckSquare className="h-4 w-4 text-green-500" />
                        </div>
                        <span className="text-sm line-through text-gray-500">{punishment.text}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No completed punishments yet.</p>
                </div>
              )}
            </motion.div>
            <SubmitModal />
          </>
        )}
      </div>
    </div>
  );
}

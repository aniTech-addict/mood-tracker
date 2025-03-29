import { useState, useEffect, FormEvent } from 'react';
import { Calendar, Frown, Angry, Skull, BarChart2, Sparkles, ChevronDown, ChevronUp, CheckSquare, Square, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { MoodTrackerDashboard } from './MoodTrackerDashboard';
import { PunishmentTracker } from './PunishmentTracker';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';

interface Punishment {
  id: string;
  text: string;
  completed: boolean;
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

export function MoodTracker() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [newEvent, setNewEvent] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPunishments, setNewPunishments] = useState<string[]>(['']);
  const [selectedMood, setSelectedMood] = useState<MoodEntry['mood']>('counting');
  const [activeView, setActiveView] = useState<'board' | 'dashboard' | 'punishments'>('board');
  const [shake, setShake] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showDescriptionField, setShowDescriptionField] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    const { data: entries, error } = await supabase
      .from('mood_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching entries:', error);
    } else {
      setEntries(entries || []);
    }
  }

  async function addEntry(e?: FormEvent) {
    if (e) {
      e.preventDefault();
    }
    
    if (isSubmitting) return;
    
    if (!newEvent.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const entryData = {
        mood: selectedMood,
        event: newEvent,
      };
      
      // Filter out empty punishments
      const filteredPunishments = newPunishments.filter(p => p.trim()).map((text, index) => ({
        id: `${index}`,
        text,
        completed: false
      }));
      
      // Create complete entry data with all fields
      const completeEntryData = {
        ...entryData,
        description: newDescription.trim() || undefined,
        punishments: filteredPunishments.length > 0 ? filteredPunishments : undefined,
        completed: false
      };
      
      // Add entry with all data
      try {
        const { error } = await supabase
          .from('mood_entries')
          .insert([completeEntryData]);
          
        if (error) {
          console.error('Error adding complete entry:', error);
          
          // If it fails, try without punishments
          if (error.message?.includes('punishments')) {
            const { error: errorWithoutPunishments } = await supabase
              .from('mood_entries')
              .insert([{
                ...entryData,
                description: newDescription.trim() || undefined
              }]);
              
            if (errorWithoutPunishments) {
              // If that fails too, try without description
              if (errorWithoutPunishments.message?.includes('description')) {
                const { error: basicError } = await supabase
                  .from('mood_entries')
                  .insert([entryData]);
                  
                if (basicError) {
                  console.error('Error adding basic entry:', basicError);
                  alert('Failed to add entry: ' + basicError.message);
                  return;
                }
              } else {
                console.error('Error adding entry without punishments:', errorWithoutPunishments);
                alert('Failed to add entry: ' + errorWithoutPunishments.message);
                return;
              }
            }
          } else if (error.message?.includes('description')) {
            // Try without description but with punishments if possible
            try {
              const { error: noPunishmentsError } = await supabase
                .from('mood_entries')
                .insert([{
                  ...entryData,
                  punishments: filteredPunishments.length > 0 ? filteredPunishments : undefined
                }]);
                
              if (noPunishmentsError) {
                // Last resort - try just the basic entry
                const { error: basicError } = await supabase
                  .from('mood_entries')
                  .insert([entryData]);
                  
                if (basicError) {
                  console.error('Error adding basic entry:', basicError);
                  alert('Failed to add entry: ' + basicError.message);
                  return;
                }
              }
            } catch (innerErr) {
              // If that fails, try just the basic data
              const { error: basicError } = await supabase
                .from('mood_entries')
                .insert([entryData]);
                
              if (basicError) {
                console.error('Error adding basic entry:', basicError);
                alert('Failed to add entry: ' + basicError.message);
                return;
              }
            }
          } else {
            alert('Failed to add entry: ' + error.message);
            return;
          }
        }
      } catch (outerErr) {
        console.error('Error in outer try block:', outerErr);
        // Last resort - try just the basic data
        const { error: basicError } = await supabase
          .from('mood_entries')
          .insert([entryData]);
          
        if (basicError) {
          console.error('Error adding basic entry:', basicError);
          alert('Failed to add entry: ' + basicError.message);
          return;
        }
      }
      
      // If we got here, the entry was added successfully
      // Clear form fields
      setNewEvent('');
      setNewDescription('');
      setNewPunishments(['']);
      setShowDescriptionField(false);
      
      // Refresh entries
      await fetchEntries();
      
      // Trigger refresh of punishment tracker if there were punishments added
      if (filteredPunishments.length > 0) {
        setRefreshTrigger(prev => prev + 1);
      }
      
      // Display confetti for successful entry
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Function to toggle punishment completion
  async function togglePunishment(entryId: string, punishmentId: string) {
    const entry = entries.find(e => e.id === entryId);
    if (!entry || !entry.punishments) return;

    const updatedPunishments = entry.punishments.map(p => 
      p.id === punishmentId ? { ...p, completed: !p.completed } : p
    );
    
    // Check if all punishments are completed
    const allCompleted = updatedPunishments.every(p => p.completed);
    
    const { error } = await supabase
      .from('mood_entries')
      .update({ 
        punishments: updatedPunishments,
        completed: allCompleted
      })
      .eq('id', entryId);
    
    if (error) {
      console.error('Error updating punishment:', error);
    } else {
      await fetchEntries();
      
      // Show confetti if all punishments are completed
      if (allCompleted) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
  }

  // Function to add a new punishment field
  function addPunishmentField() {
    setNewPunishments([...newPunishments, '']);
  }

  // Function to update a punishment field
  function updatePunishmentField(index: number, value: string) {
    const updated = [...newPunishments];
    updated[index] = value;
    setNewPunishments(updated);
  }

  // Function to remove a punishment field
  function removePunishmentField(index: number) {
    const updated = [...newPunishments];
    updated.splice(index, 1);
    setNewPunishments(updated);
  }

  const toggleEntryDetails = (entryId: string) => {
    setExpandedEntryId(expandedEntryId === entryId ? null : entryId);
  };

  const renderBoard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          className="bg-green-50 p-6 rounded-lg border-2 border-green-200 mood-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center fun-title">
            <Frown className="mr-2" /> Pissed
          </h2>
          {entries
            .filter(entry => entry.mood === 'pissed')
            .map((entry, index) => (
              <motion.div 
                key={entry.id} 
                className={`bg-white p-3 rounded mb-2 tilt-card ${index === 0 ? 'pulse' : ''} ${entry.completed ? 'opacity-50' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                onHoverStart={() => setHoverIndex(parseInt(entry.id))}
                onHoverEnd={() => setHoverIndex(null)}
                onClick={() => toggleEntryDetails(entry.id)}
              >
                <p className="text-sm text-gray-600">{format(new Date(entry.created_at), 'MMM d, yyyy')}</p>
                <div className="flex justify-between items-center">
                  <p className={entry.completed ? 'line-through' : ''}>{entry.event}</p>
                  {(entry.description || (entry.punishments && entry.punishments.length > 0)) && (
                    <button className="text-gray-400 hover:text-gray-600">
                      {expandedEntryId === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {expandedEntryId === entry.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-sm text-gray-600 border-t pt-2"
                    >
                      {entry.description && (
                        <p className="italic mb-2">{entry.description}</p>
                      )}
                      
                      {entry.punishments && entry.punishments.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium mb-1">Punishments:</p>
                          <ul className="space-y-1">
                            {entry.punishments.map(punishment => (
                              <li key={punishment.id} className="flex items-center">
                                <button 
                                  className="mr-2 flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePunishment(entry.id, punishment.id);
                                  }}
                                >
                                  {punishment.completed ? 
                                    <CheckSquare className="h-4 w-4 text-green-500" /> : 
                                    <Square className="h-4 w-4 text-gray-400" />}
                                </button>
                                <span className={punishment.completed ? 'line-through text-gray-400' : ''}>
                                  {punishment.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                {hoverIndex === parseInt(entry.id) && expandedEntryId !== entry.id && (
                  <div className="mt-2 text-xs text-gray-500 italic">Click to see more</div>
                )}
              </motion.div>
            ))}
        </motion.div>

        <motion.div 
          className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200 mood-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center fun-title">
            <Angry className="mr-2" /> Really MAD
          </h2>
          {entries
            .filter(entry => entry.mood === 'mad')
            .map((entry, index) => (
              <motion.div 
                key={entry.id} 
                className={`bg-white p-3 rounded mb-2 tilt-card ${index === 0 ? 'pulse' : ''} ${entry.completed ? 'opacity-50' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => toggleEntryDetails(entry.id)}
              >
                <p className="text-sm text-gray-600">{format(new Date(entry.created_at), 'MMM d, yyyy')}</p>
                <div className="flex justify-between items-center">
                  <p className={entry.completed ? 'line-through' : ''}>{entry.event}</p>
                  {(entry.description || (entry.punishments && entry.punishments.length > 0)) && (
                    <button className="text-gray-400 hover:text-gray-600">
                      {expandedEntryId === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {expandedEntryId === entry.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-sm text-gray-600 border-t pt-2"
                    >
                      {entry.description && (
                        <p className="italic mb-2">{entry.description}</p>
                      )}
                      
                      {entry.punishments && entry.punishments.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium mb-1">Punishments:</p>
                          <ul className="space-y-1">
                            {entry.punishments.map(punishment => (
                              <li key={punishment.id} className="flex items-center">
                                <button 
                                  className="mr-2 flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePunishment(entry.id, punishment.id);
                                  }}
                                >
                                  {punishment.completed ? 
                                    <CheckSquare className="h-4 w-4 text-green-500" /> : 
                                    <Square className="h-4 w-4 text-gray-400" />}
                                </button>
                                <span className={punishment.completed ? 'line-through text-gray-400' : ''}>
                                  {punishment.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
        </motion.div>

        <motion.div 
          className="bg-pink-50 p-6 rounded-lg border-2 border-pink-200 mood-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center fun-title">
            <Calendar className="mr-2" /> Count ur days
          </h2>
          {entries
            .filter(entry => entry.mood === 'counting')
            .map((entry, index) => (
              <motion.div 
                key={entry.id} 
                className={`bg-white p-3 rounded mb-2 tilt-card ${index === 0 ? 'pulse' : ''} ${entry.completed ? 'opacity-50' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => toggleEntryDetails(entry.id)}
              >
                <p className="text-sm text-gray-600">{format(new Date(entry.created_at), 'MMM d, yyyy')}</p>
                <div className="flex justify-between items-center">
                  <p className={entry.completed ? 'line-through' : ''}>{entry.event}</p>
                  {(entry.description || (entry.punishments && entry.punishments.length > 0)) && (
                    <button className="text-gray-400 hover:text-gray-600">
                      {expandedEntryId === entry.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {expandedEntryId === entry.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-sm text-gray-600 border-t pt-2"
                    >
                      {entry.description && (
                        <p className="italic mb-2">{entry.description}</p>
                      )}
                      
                      {entry.punishments && entry.punishments.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium mb-1">Punishments:</p>
                          <ul className="space-y-1">
                            {entry.punishments.map(punishment => (
                              <li key={punishment.id} className="flex items-center">
                                <button 
                                  className="mr-2 flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePunishment(entry.id, punishment.id);
                                  }}
                                >
                                  {punishment.completed ? 
                                    <CheckSquare className="h-4 w-4 text-green-500" /> : 
                                    <Square className="h-4 w-4 text-gray-400" />}
                                </button>
                                <span className={punishment.completed ? 'line-through text-gray-400' : ''}>
                                  {punishment.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
        </motion.div>
      </div>

      <motion.div 
        className="bg-white p-6 rounded-lg shadow-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-lg font-semibold mb-4 fun-title">Add New Entry</h3>
        <div className="flex gap-4 mb-4">
          <motion.button
            onClick={() => setSelectedMood('pissed')}
            className={`flex-1 p-3 rounded ${selectedMood === 'pissed' ? 'bg-green-200' : 'bg-gray-100'} neon-button`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Frown className="mx-auto" />
          </motion.button>
          <motion.button
            onClick={() => setSelectedMood('mad')}
            className={`flex-1 p-3 rounded ${selectedMood === 'mad' ? 'bg-blue-200' : 'bg-gray-100'} neon-button`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Angry className="mx-auto" />
          </motion.button>
          <motion.button
            onClick={() => setSelectedMood('counting')}
            className={`flex-1 p-3 rounded ${selectedMood === 'counting' ? 'bg-pink-200' : 'bg-gray-100'} neon-button`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Skull className="mx-auto" />
          </motion.button>
        </div>
        <form onSubmit={addEntry} className="flex flex-col gap-2">
          <input
            type="text"
            value={newEvent}
            onChange={(e) => setNewEvent(e.target.value)}
            placeholder="What happened?"
            className={`w-full p-2 border rounded ${shake ? 'shake' : ''}`}
            onFocus={() => setShowDescriptionField(true)}
          />
          <AnimatePresence>
            {showDescriptionField && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full"
              >
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Add a description (optional)"
                  className="w-full p-2 border rounded mt-2"
                  rows={3}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="w-full">
            {newPunishments.map((punishment, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={punishment}
                  onChange={(e) => updatePunishmentField(index, e.target.value)}
                  placeholder="Add a punishment"
                  className="w-full p-2 border rounded"
                />
                <button
                  type="button"
                  onClick={() => removePunishmentField(index)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addPunishmentField}
              className="bg-green-500 text-white px-2 py-1 rounded"
            >
              <CheckSquare size={16} />
            </button>
          </div>
          <div className="flex justify-end mt-2">
            <motion.button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 neon-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isSubmitting}
            >
              <Sparkles className="mr-2 inline-block" /> {isSubmitting ? 'Adding...' : 'Add Entry'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </>
  );

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <motion.h1 
            className="text-4xl font-bold mb-4 md:mb-0 fun-title gradient-text"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Mood Tracker
          </motion.h1>
          <div className="flex space-x-2">
            <motion.button
              onClick={() => setActiveView('board')}
              className={`px-4 py-2 rounded ${activeView === 'board' ? 'bg-purple-600 text-white' : 'bg-gray-200'} neon-button`}
              whileHover={{ scale: 1.05 }}
            >
              <Calendar className="mr-2 inline-block" /> Board
            </motion.button>
            <motion.button
              onClick={() => setActiveView('dashboard')}
              className={`px-4 py-2 rounded ${activeView === 'dashboard' ? 'bg-purple-600 text-white' : 'bg-gray-200'} neon-button`}
              whileHover={{ scale: 1.05 }}
            >
              <BarChart2 className="mr-2 inline-block" /> Dashboard
            </motion.button>
            <motion.button
              onClick={() => setActiveView('punishments')}
              className={`px-4 py-2 rounded ${activeView === 'punishments' ? 'bg-purple-600 text-white' : 'bg-gray-200'} neon-button`}
              whileHover={{ scale: 1.05 }}
            >
              <AlertCircle className="mr-2 inline-block" /> Punishments
            </motion.button>
          </div>
        </div>

        {activeView === 'board' ? renderBoard() : activeView === 'dashboard' ? <MoodTrackerDashboard /> : <PunishmentTracker refreshTrigger={refreshTrigger} />}

        {showConfetti && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={300}
            gravity={0.15}
          />
        )}
      </div>
    </div>
  );
}
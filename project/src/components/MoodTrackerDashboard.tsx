import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Zap, Heart, Award } from 'lucide-react';

interface MoodEntry {
  id: string;
  created_at: string;
  mood: 'pissed' | 'mad' | 'counting';
  event: string;
  user_id: string;
}

interface DashboardMetrics {
  totalEvents: number;
  eventsByMood: {
    pissed: number;
    mad: number;
    counting: number;
  };
  recentEntries: MoodEntry[];
  overallStatus: 'chill' | 'concerned' | 'critical';
}

export function MoodTrackerDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalEvents: 0,
    eventsByMood: { pissed: 0, mad: 0, counting: 0 },
    recentEntries: [],
    overallStatus: 'chill'
  });
  const [activeStat, setActiveStat] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    const { data: entries, error } = await supabase
      .from('mood_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching entries for metrics:', error);
      return;
    }

    const typedEntries = entries as MoodEntry[];
    if (!typedEntries.length) return;

    // Calculate metrics
    const totalEvents = typedEntries.length;
    
    const eventsByMood = {
      pissed: typedEntries.filter(e => e.mood === 'pissed').length,
      mad: typedEntries.filter(e => e.mood === 'mad').length,
      counting: typedEntries.filter(e => e.mood === 'counting').length
    };
    
    const recentEntries = typedEntries.slice(0, 5); // Get 5 most recent entries

    // Determine overall status
    let overallStatus: 'chill' | 'concerned' | 'critical' = 'chill';
    const countingPercentage = (eventsByMood.counting / totalEvents) * 100;
    const madPercentage = (eventsByMood.mad / totalEvents) * 100;
    
    if (countingPercentage > 30) {
      overallStatus = 'critical';
    } else if (madPercentage > 40 || countingPercentage > 10) {
      overallStatus = 'concerned';
    }

    setMetrics({
      totalEvents,
      eventsByMood,
      recentEntries,
      overallStatus
    });
  }

  const getStatusColor = (status: 'chill' | 'concerned' | 'critical') => {
    switch (status) {
      case 'chill': return 'bg-green-100 text-green-800 border-green-200';
      case 'concerned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getAdvice = (status: 'chill' | 'concerned' | 'critical') => {
    switch (status) {
      case 'chill':
        return 'Everything seems to be going smoothly! Keep that positive energy flowing.';
      case 'concerned':
        return 'Might be time for some self-care. Consider a warm bath or your favorite comfort food.';
      case 'critical':
        return 'Things are looking pretty intense! Might be time to talk to someone or take a mental health day.';
    }
  };

  const getMoodIcon = (mood: 'pissed' | 'mad' | 'counting') => {
    switch (mood) {
      case 'pissed': return '😠';
      case 'mad': return '😡';
      case 'counting': return '💀';
    }
  };

  const getMoodName = (mood: 'pissed' | 'mad' | 'counting') => {
    switch (mood) {
      case 'pissed': return 'Pissed';
      case 'mad': return 'Really MAD';
      case 'counting': return 'Count ur days';
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-6xl mx-auto">
        <motion.h1 
          className="text-4xl font-bold mb-8 text-center fun-title gradient-text"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          Mood Dashboard
        </motion.h1>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Total Events Card */}
          <motion.div 
            className="bg-white rounded-lg shadow-md p-5 mood-card"
            variants={item}
            whileHover={{ scale: 1.03, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
            onHoverStart={() => setActiveStat('total')}
            onHoverEnd={() => setActiveStat(null)}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-gray-500 text-sm font-medium">Total Events</h3>
              <Zap className={`h-6 w-6 text-purple-500 ${activeStat === 'total' ? 'text-yellow-500 rotate-12' : ''}`} style={{ transition: 'all 0.3s ease' }} />
            </div>
            <p className="text-3xl font-bold mt-2">{metrics.totalEvents}</p>
            {activeStat === 'total' && (
              <p className="text-xs text-gray-500 mt-2 italic">All your mood entries so far!</p>
            )}
          </motion.div>
          
          {/* Most Common Mood Card */}
          <motion.div 
            className="bg-white rounded-lg shadow-md p-5 mood-card"
            variants={item}
            whileHover={{ scale: 1.03, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
            onHoverStart={() => setActiveStat('common')}
            onHoverEnd={() => setActiveStat(null)}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-gray-500 text-sm font-medium">Most Common Mood</h3>
              <Award className={`h-6 w-6 text-blue-500 ${activeStat === 'common' ? 'text-yellow-500 rotate-12' : ''}`} style={{ transition: 'all 0.3s ease' }} />
            </div>
            <p className="text-3xl font-bold mt-2">
              {Object.entries(metrics.eventsByMood)
                .sort((a, b) => b[1] - a[1])[0]?.[0] === 'pissed' ? 'Pissed' :
                Object.entries(metrics.eventsByMood)
                  .sort((a, b) => b[1] - a[1])[0]?.[0] === 'mad' ? 'Really MAD' :
                  'Count ur days'}
            </p>
            {activeStat === 'common' && (
              <p className="text-xs text-gray-500 mt-2 italic">Your most frequent feeling lately</p>
            )}
          </motion.div>
          
          {/* Critical Events Card */}
          <motion.div 
            className="bg-white rounded-lg shadow-md p-5 mood-card"
            variants={item}
            whileHover={{ scale: 1.03, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
            onHoverStart={() => setActiveStat('critical')}
            onHoverEnd={() => setActiveStat(null)}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-gray-500 text-sm font-medium">"Count ur days" Events</h3>
              <span className="text-2xl">💀</span>
            </div>
            <p className="text-3xl font-bold mt-2">{metrics.eventsByMood.counting}</p>
            <p className="text-sm text-gray-500 mt-1">
              {metrics.totalEvents > 0 
                ? `${Math.round((metrics.eventsByMood.counting / metrics.totalEvents) * 100)}% of total` 
                : '0% of total'}
            </p>
            {activeStat === 'critical' && (
              <p className="text-xs text-red-500 mt-2 italic">Yikes! The super serious events!</p>
            )}
          </motion.div>
          
          {/* Status Card */}
          <motion.div 
            className="bg-white rounded-lg shadow-md p-5 mood-card"
            variants={item}
            whileHover={{ scale: 1.03, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
            onHoverStart={() => setActiveStat('status')}
            onHoverEnd={() => setActiveStat(null)}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-gray-500 text-sm font-medium">Overall Status</h3>
              <Heart className={`h-6 w-6 text-red-500 ${activeStat === 'status' ? 'scale-125' : ''}`} style={{ transition: 'all 0.3s ease' }} />
            </div>
            <div className={`mt-2 px-2 py-1 rounded-md inline-block border ${getStatusColor(metrics.overallStatus)}`}>
              {metrics.overallStatus.charAt(0).toUpperCase() + metrics.overallStatus.slice(1)}
            </div>
            {activeStat === 'status' && (
              <p className="text-xs text-gray-500 mt-2 italic">Based on your mood distribution</p>
            )}
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Events by Mood Chart */}
          <motion.div 
            className="bg-white rounded-lg shadow-md p-5 mood-card"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-gray-700 font-medium mb-4 fun-title">Events by Mood</h3>
            <div className="space-y-3">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Pissed</span>
                  <span className="text-sm">{metrics.eventsByMood.pissed}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <motion.div 
                    className="bg-green-400 h-2.5 rounded-full" 
                    initial={{ width: 0 }}
                    animate={{ width: `${(metrics.eventsByMood.pissed / metrics.totalEvents) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  ></motion.div>
                </div>
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Really MAD</span>
                  <span className="text-sm">{metrics.eventsByMood.mad}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <motion.div 
                    className="bg-blue-400 h-2.5 rounded-full" 
                    initial={{ width: 0 }}
                    animate={{ width: `${(metrics.eventsByMood.mad / metrics.totalEvents) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  ></motion.div>
                </div>
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Count ur days</span>
                  <span className="text-sm">{metrics.eventsByMood.counting}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <motion.div 
                    className="bg-pink-400 h-2.5 rounded-full" 
                    initial={{ width: 0 }}
                    animate={{ width: `${(metrics.eventsByMood.counting / metrics.totalEvents) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  ></motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Recent Entries */}
          <motion.div 
            className="bg-white rounded-lg shadow-md p-5 mood-card"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-gray-700 font-medium mb-4 fun-title">Recent Entries</h3>
            {metrics.recentEntries.length > 0 ? (
              <div className="space-y-3">
                {metrics.recentEntries.map((entry, index) => (
                  <motion.div 
                    key={entry.id} 
                    className="border-b pb-2 tilt-card"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ x: 5 }}
                  >
                    <div className="flex items-center">
                      <span className="text-xl mr-2">{getMoodIcon(entry.mood)}</span>
                      <span className="font-medium">{getMoodName(entry.mood)}</span>
                      <span className="ml-auto text-xs text-gray-500">
                        {format(new Date(entry.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{entry.event}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No entries yet</p>
            )}
          </motion.div>
        </motion.div>
        
        {/* Mood Advice */}
        <motion.div 
          className="bg-white rounded-lg shadow-md p-5 mood-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-gray-700 font-medium mb-2 fun-title">Mood Advice</h3>
          <p className="text-gray-600 italic">"<span className="gradient-text">{getAdvice(metrics.overallStatus)}</span>"</p>
        </motion.div>
      </div>
    </div>
  );
}

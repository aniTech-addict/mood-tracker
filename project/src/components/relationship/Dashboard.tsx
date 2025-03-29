import { useEffect, useState } from 'react';
import { Event, DashboardMetrics } from '../../lib/types';
import { supabase } from '../../lib/supabase';

export function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalEvents: 0,
    eventsByCategory: { mad: 0, ultraMad: 0, uDead: 0 },
    averageCompletion: 0,
    taskCompletionByEvent: [],
    overallStatus: 'good'
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    // Fetch all events
    const { data, error } = await supabase
      .from('relationship_events')
      .select('*');

    if (error) {
      console.error('Error fetching events for metrics:', error);
      return;
    }

    const events = data as Event[];
    if (!events.length) return;

    // Calculate metrics
    const totalEvents = events.length;
    
    const eventsByCategory = {
      mad: events.filter(e => e.columnId === 'mad').length,
      ultraMad: events.filter(e => e.columnId === 'ultraMad').length,
      uDead: events.filter(e => e.columnId === 'uDead').length
    };
    
    const averageCompletion = Math.round(
      events.reduce((sum, event) => sum + event.completionPercentage, 0) / events.length
    );
    
    const taskCompletionByEvent = events
      .filter(event => event.tasks.length > 0)
      .slice(0, 5) // Top 5 events
      .map(event => ({
        title: event.title,
        completion: event.completionPercentage
      }));

    // Determine overall status
    let overallStatus: 'good' | 'concerning' | 'critical' = 'good';
    const uDeadPercentage = (eventsByCategory.uDead / totalEvents) * 100;
    const ultraMadPercentage = (eventsByCategory.ultraMad / totalEvents) * 100;
    
    if (uDeadPercentage > 30) {
      overallStatus = 'critical';
    } else if (ultraMadPercentage > 40 || uDeadPercentage > 10) {
      overallStatus = 'concerning';
    }

    setMetrics({
      totalEvents,
      eventsByCategory,
      averageCompletion,
      taskCompletionByEvent,
      overallStatus
    });
  }

  const getStatusColor = (status: 'good' | 'concerning' | 'critical') => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800 border-green-200';
      case 'concerning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getAdvice = (status: 'good' | 'concerning' | 'critical') => {
    switch (status) {
      case 'good':
        return 'Relationship looking healthy! Keep up the great communication.';
      case 'concerning':
        return 'Might be time for a heart-to-heart. Consider a nice dinner and open conversation.';
      case 'critical':
        return 'Better start sleeping with one eye open. Seriously though, professional counseling might help!';
    }
  };

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Relationship Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Events Card */}
          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="text-gray-500 text-sm font-medium">Total Events</h3>
            <p className="text-3xl font-bold mt-2">{metrics.totalEvents}</p>
          </div>
          
          {/* Average Completion Card */}
          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="text-gray-500 text-sm font-medium">Average Completion</h3>
            <p className="text-3xl font-bold mt-2">{metrics.averageCompletion}%</p>
          </div>
          
          {/* Highest Category Card */}
          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="text-gray-500 text-sm font-medium">Most Common Issue</h3>
            <p className="text-3xl font-bold mt-2">
              {Object.entries(metrics.eventsByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'}
            </p>
          </div>
          
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="text-gray-500 text-sm font-medium">Overall Status</h3>
            <div className={`mt-2 px-2 py-1 rounded-md inline-block border ${getStatusColor(metrics.overallStatus)}`}>
              {metrics.overallStatus.charAt(0).toUpperCase() + metrics.overallStatus.slice(1)}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Events by Category Chart */}
          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="text-gray-700 font-medium mb-4">Events by Category</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Mad</span>
                  <span className="text-sm">{metrics.eventsByCategory.mad}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-red-400 h-2.5 rounded-full" style={{ width: `${(metrics.eventsByCategory.mad / metrics.totalEvents) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Ultra Mad</span>
                  <span className="text-sm">{metrics.eventsByCategory.ultraMad}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-orange-400 h-2.5 rounded-full" style={{ width: `${(metrics.eventsByCategory.ultraMad / metrics.totalEvents) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">U Dead</span>
                  <span className="text-sm">{metrics.eventsByCategory.uDead}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-purple-400 h-2.5 rounded-full" style={{ width: `${(metrics.eventsByCategory.uDead / metrics.totalEvents) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Task Completion by Event */}
          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="text-gray-700 font-medium mb-4">Task Completion by Event</h3>
            {metrics.taskCompletionByEvent.length > 0 ? (
              <div className="space-y-3">
                {metrics.taskCompletionByEvent.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm truncate" style={{ maxWidth: '70%' }}>{item.title}</span>
                      <span className="text-sm">{item.completion}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${item.completion < 30 ? 'bg-red-500' : item.completion < 70 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                        style={{ width: `${item.completion}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No tasks created yet</p>
            )}
          </div>
        </div>
        
        {/* Relationship Advice */}
        <div className="bg-white rounded-lg shadow-md p-5">
          <h3 className="text-gray-700 font-medium mb-2">Relationship Advice</h3>
          <p className="text-gray-600 italic">"{getAdvice(metrics.overallStatus)}"</p>
        </div>
      </div>
    </div>
  );
}

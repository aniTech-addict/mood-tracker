import { useState } from 'react';
import { Event, Task } from '../../lib/types';
import { format } from 'date-fns';
import { Check, ChevronDown, ChevronUp, Plus, Trash } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EventCardProps {
  event: Event;
  onUpdate: (updatedEvent: Event) => void;
  onDelete: (eventId: string) => void;
}

export function EventCard({ event, onUpdate, onDelete }: EventCardProps) {
  const [isTaskListOpen, setIsTaskListOpen] = useState(false);
  const [newTaskDescription, setNewTaskDescription] = useState('');

  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const toggleTaskCompletion = async (taskId: string) => {
    const updatedTasks = event.tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    
    const completedCount = updatedTasks.filter(task => task.completed).length;
    const completionPercentage = updatedTasks.length > 0 
      ? Math.round((completedCount / updatedTasks.length) * 100) 
      : 0;
    
    const updatedEvent = {
      ...event,
      tasks: updatedTasks,
      completionPercentage
    };
    
    onUpdate(updatedEvent);
  };

  const addTask = async () => {
    if (!newTaskDescription.trim()) return;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      description: newTaskDescription,
      completed: false
    };
    
    const updatedTasks = [...event.tasks, newTask];
    const completedCount = updatedTasks.filter(task => task.completed).length;
    const completionPercentage = Math.round((completedCount / updatedTasks.length) * 100);
    
    const updatedEvent = {
      ...event,
      tasks: updatedTasks,
      completionPercentage
    };
    
    onUpdate(updatedEvent);
    setNewTaskDescription('');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold">{event.title}</h3>
        <button 
          onClick={() => onDelete(event.id)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash size={16} />
        </button>
      </div>
      
      {event.description && (
        <p className="text-gray-600 mb-3 text-sm">{event.description}</p>
      )}
      
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{event.completionPercentage}%</span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getProgressColor(event.completionPercentage)}`}
            style={{ width: `${event.completionPercentage}%` }}
          ></div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mb-3">
        Created: {format(new Date(event.createdAt), 'MMM d, yyyy')}
      </div>
      
      <div className="border-t pt-2">
        <button 
          className="flex items-center text-sm text-gray-600 hover:text-gray-800"
          onClick={() => setIsTaskListOpen(!isTaskListOpen)}
        >
          Tasks ({event.tasks.filter(t => t.completed).length}/{event.tasks.length})
          {isTaskListOpen ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
        </button>
        
        {isTaskListOpen && (
          <div className="mt-2">
            {event.tasks.length > 0 ? (
              <ul className="space-y-1">
                {event.tasks.map(task => (
                  <li key={task.id} className="flex items-start">
                    <button
                      onClick={() => toggleTaskCompletion(task.id)}
                      className={`flex-shrink-0 w-5 h-5 rounded-sm border mt-0.5 mr-2 flex items-center justify-center ${task.completed ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}
                    >
                      {task.completed && <Check size={12} className="text-white" />}
                    </button>
                    <span className={`text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {task.description}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No tasks</p>
            )}
            
            <div className="flex mt-2">
              <input
                type="text"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Add a task..."
                className="flex-1 text-sm border rounded-l px-2 py-1"
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <button
                onClick={addTask}
                className="bg-blue-500 text-white px-2 py-1 rounded-r hover:bg-blue-600"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

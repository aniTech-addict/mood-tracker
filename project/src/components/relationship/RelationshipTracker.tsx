import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { supabase } from '../../lib/supabase';
import { Event, Board } from '../../lib/types';
import { EventCard } from './EventCard';
import { Plus } from 'lucide-react';

export function RelationshipTracker() {
  const [board, setBoard] = useState<Board>({
    mad: [],
    ultraMad: [],
    uDead: []
  });
  const [isAddingEvent, setIsAddingEvent] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    const { data, error } = await supabase
      .from('relationship_events')
      .select('*');

    if (error) {
      console.error('Error fetching events:', error);
      return;
    }

    const typedData = data as Event[];
    const newBoard: Board = {
      mad: typedData.filter(event => event.columnId === 'mad'),
      ultraMad: typedData.filter(event => event.columnId === 'ultraMad'),
      uDead: typedData.filter(event => event.columnId === 'uDead')
    };

    setBoard(newBoard);
  }

  async function handleDragEnd(result: any) {
    const { source, destination, draggableId } = result;
    
    // Dropped outside the list
    if (!destination) return;
    
    // Dropped in the same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    // Find the columns
    const sourceColumn = source.droppableId as keyof Board;
    const destinationColumn = destination.droppableId as keyof Board;
    
    // Find the event
    const event = board[sourceColumn].find(e => e.id === draggableId);
    if (!event) return;
    
    // Create new board state
    const newBoard = { ...board };
    
    // Remove from source column
    newBoard[sourceColumn] = board[sourceColumn].filter(e => e.id !== draggableId);
    
    // Add to destination column
    const updatedEvent = { ...event, columnId: destinationColumn };
    newBoard[destinationColumn] = [
      ...board[destinationColumn].slice(0, destination.index),
      updatedEvent,
      ...board[destinationColumn].slice(destination.index)
    ];
    
    // Update state
    setBoard(newBoard);
    
    // Update in database
    await supabase
      .from('relationship_events')
      .update({ columnId: destinationColumn })
      .eq('id', draggableId);
  }

  async function addEvent(columnId: keyof Board) {
    if (!newEventTitle.trim()) return;
    
    const newEvent: Omit<Event, 'id'> = {
      title: newEventTitle,
      description: newEventDescription || undefined,
      tasks: [],
      completionPercentage: 0,
      createdAt: new Date().toISOString(),
      columnId: columnId
    };
    
    const { data, error } = await supabase
      .from('relationship_events')
      .insert([newEvent])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding event:', error);
      return;
    }
    
    // Update board state
    setBoard(prev => ({
      ...prev,
      [columnId]: [...prev[columnId], data as Event]
    }));
    
    // Reset form
    setNewEventTitle('');
    setNewEventDescription('');
    setIsAddingEvent(null);
  }

  async function updateEvent(updatedEvent: Event) {
    const columnId = updatedEvent.columnId;
    
    // Update in database
    const { error } = await supabase
      .from('relationship_events')
      .update({
        title: updatedEvent.title,
        description: updatedEvent.description,
        tasks: updatedEvent.tasks,
        completionPercentage: updatedEvent.completionPercentage
      })
      .eq('id', updatedEvent.id);
    
    if (error) {
      console.error('Error updating event:', error);
      return;
    }
    
    // Update board state
    setBoard(prev => ({
      ...prev,
      [columnId]: prev[columnId].map(event =>
        event.id === updatedEvent.id ? updatedEvent : event
      )
    }));
  }

  async function deleteEvent(eventId: string) {
    // Find which column the event is in
    let columnId: keyof Board | null = null;
    for (const col of ['mad', 'ultraMad', 'uDead'] as const) {
      if (board[col].some(e => e.id === eventId)) {
        columnId = col;
        break;
      }
    }
    
    if (!columnId) return;
    
    // Delete from database
    const { error } = await supabase
      .from('relationship_events')
      .delete()
      .eq('id', eventId);
    
    if (error) {
      console.error('Error deleting event:', error);
      return;
    }
    
    // Update board state
    setBoard(prev => ({
      ...prev,
      [columnId as keyof Board]: prev[columnId as keyof Board].filter(e => e.id !== eventId)
    }));
  }

  const renderAddEventForm = (columnId: keyof Board) => (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">Add New Event</h3>
      <input
        type="text"
        value={newEventTitle}
        onChange={(e) => setNewEventTitle(e.target.value)}
        placeholder="Event title"
        className="w-full mb-2 p-2 border rounded"
      />
      <textarea
        value={newEventDescription}
        onChange={(e) => setNewEventDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full mb-3 p-2 border rounded"
        rows={3}
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setIsAddingEvent(null)}
          className="px-3 py-1 border rounded hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={() => addEvent(columnId)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Save
        </button>
      </div>
    </div>
  );

  const renderColumn = (title: string, columnId: keyof Board, bgColor: string, borderColor: string) => (
    <div className={`${bgColor} p-4 rounded-lg ${borderColor} border-2`}>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      
      <Droppable droppableId={columnId}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="min-h-[200px]"
          >
            {isAddingEvent === columnId && renderAddEventForm(columnId)}
            
            {board[columnId].map((event, index) => (
              <Draggable key={event.id} draggableId={event.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <EventCard 
                      event={event} 
                      onUpdate={updateEvent} 
                      onDelete={deleteEvent} 
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            
            {isAddingEvent !== columnId && (
              <button
                onClick={() => setIsAddingEvent(columnId)}
                className="w-full py-2 flex items-center justify-center text-gray-600 bg-white bg-opacity-50 rounded-lg border border-dashed border-gray-300 hover:bg-opacity-100"
              >
                <Plus size={16} className="mr-1" />
                Add Event
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Relationship Tracker</h1>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderColumn('Mad', 'mad', 'bg-red-50', 'border-red-200')}
            {renderColumn('Ultra Mad', 'ultraMad', 'bg-orange-50', 'border-orange-200')}
            {renderColumn('U Dead', 'uDead', 'bg-purple-50', 'border-purple-200')}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}

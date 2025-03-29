import { useState } from 'react';
import { RelationshipTracker } from './RelationshipTracker';
import { Dashboard } from './Dashboard';

export function RelationshipTrackerMain() {
  const [activeView, setActiveView] = useState<'board' | 'dashboard'>('board');

  return (
    <div className="min-h-screen bg-cream">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-purple-600">Relationship Tracker</h1>
              </div>
              <div className="hidden sm:flex sm:space-x-8 sm:ml-6 sm:items-center">
                <button
                  onClick={() => setActiveView('board')}
                  className={`px-3 py-2 text-sm font-medium ${activeView === 'board' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Kanban Board
                </button>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-3 py-2 text-sm font-medium ${activeView === 'dashboard' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Dashboard
                </button>
              </div>
            </div>
            <div className="sm:hidden flex items-center">
              <div className="relative">
                <select
                  value={activeView}
                  onChange={(e) => setActiveView(e.target.value as 'board' | 'dashboard')}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                >
                  <option value="board">Board</option>
                  <option value="dashboard">Dashboard</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {activeView === 'board' ? <RelationshipTracker /> : <Dashboard />}
    </div>
  );
}

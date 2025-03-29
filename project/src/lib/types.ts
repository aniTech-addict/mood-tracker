export interface Task {
  id: string;
  description: string;
  completed: boolean;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  tasks: Task[];
  completionPercentage: number;
  createdAt: string;
  columnId: 'mad' | 'ultraMad' | 'uDead';
}

export interface Board {
  mad: Event[];
  ultraMad: Event[];
  uDead: Event[];
}

export interface DashboardMetrics {
  totalEvents: number;
  eventsByCategory: {[key: string]: number};
  averageCompletion: number;
  taskCompletionByEvent: {title: string; completion: number}[];
  overallStatus: 'good' | 'concerning' | 'critical';
}

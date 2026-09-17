export type TaskStatus = 'Upcoming' | 'In Progress' | 'Done';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  subtasks: Task[];
  parentId: string | null;
  userId: string;
  createdAt: number;
  updatedAt: number;
  level: number; // 0 for root categories, 1 for subcategories, 2+ for tasks
  type: 'category' | 'subcategory' | 'task';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: number;
}

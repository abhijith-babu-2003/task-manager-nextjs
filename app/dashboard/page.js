'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import DashboardStats from '@/components/DashboardStats';
import TaskList from '@/components/TaskList';
import TaskModal from '@/components/TaskModal';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [categories, setCategories] = useState(['Work', 'Personal', 'Shopping', 'Health', 'Other']);

  // Redirect to login if not authenticated
  useEffect(() => {
    console.log('Dashboard: Auth state changed', { user, authLoading });
    if (!authLoading && !user) {
      console.log('Dashboard: No user found, redirecting to login');
      router.push('/login?from=/dashboard');
    }
  }, [user, authLoading, router]);

  // Fetch tasks from the API
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
      
      // Extract unique categories
      const categorySet = new Set();
      data.forEach(task => {
        if (task.category) {
          categorySet.add(task.category);
        }
      });
      setCategories(Array.from(categorySet));
      
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks on component mount
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  // Handle task creation/update
  const handleTaskSubmit = async (taskData) => {
  try {
    const url = editingTask
      ? `/api/tasks/${editingTask.id}`
      : '/api/tasks';
    const method = editingTask ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to save task');
    }

    await fetchTasks();
    setIsModalOpen(false);
    setEditingTask(null);

    // ✅ Success toast
    toast.success(editingTask ? 'Task updated successfully!' : 'Task created successfully!');
  } catch (error) {
    console.error('Error saving task:', error);

    // ❌ Error toast
    toast.error(error.message || 'Something went wrong');
  }
};

  const handleEditTask = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCreateNewTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  // Toggle task completion status
  const handleToggleComplete = async (taskId, newStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...task,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task status');
      }

      await fetchTasks();
    } catch (error) {
      console.error('Error toggling task status:', error);
      alert('Failed to update task status. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={handleCreateNewTask}
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Add Task
            </button>
          </div>

          <div className="mb-8">
            <DashboardStats tasks={tasks} />
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <TaskList 
              tasks={tasks} 
              loading={loading} 
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onToggleComplete={handleToggleComplete}
            />
          </div>
        </div>
      </main>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onTaskSubmit={handleTaskSubmit}
        task={editingTask}
        categories={categories}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@heroicons/react/24/outline";
import DashboardStats from "@/components/DashboardStats";
import TaskList from "@/components/TaskList";
import TaskModal from "@/components/TaskModal";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [categories, setCategories] = useState(["Work", "Personal", "Shopping", "Health", "Other"]);

  // Redirect to login if not authenticated
  useEffect(() => {
    console.log("Dashboard: Auth state changed", { user, authLoading });
    if (!authLoading && !user) {
      console.log("Dashboard: No user found, redirecting to login");
      router.replace("/login?from=/dashboard");
    }
  }, [user, authLoading, router]);

  // Fetch tasks from the API
  const fetchTasks = useCallback(async () => {
    if (!user) {
      console.log("Dashboard: No user available, skipping task fetch");
      return;
    }

    try {
      setLoading(true);
      console.log("Dashboard: Fetching tasks for user:", user.email);

      const response = await fetch("/api/tasks", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log("Dashboard: Unauthorized, redirecting to login");
          router.replace("/login?from=/dashboard");
          return;
        }
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }

      const data = await response.json();
      console.log("Dashboard: Tasks fetched:", data.length || 0, "tasks");

      const taskList = Array.isArray(data) ? data : [];
      setTasks(taskList);

      // Extract unique categories
      const categorySet = new Set(["Work", "Personal", "Shopping", "Health", "Other"]);
      taskList.forEach((task) => {
        if (task.category && task.category.trim()) {
          categorySet.add(task.category.trim());
        }
      });
      setCategories(Array.from(categorySet));
    } catch (error) {
      console.error("Dashboard: Error fetching tasks:", error);
      toast.error("Failed to fetch tasks. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  // Fetch tasks when user is available
  useEffect(() => {
    if (user && !authLoading) {
      fetchTasks();
    }
  }, [user, authLoading, fetchTasks]);

  // Handle task creation/update
  const handleTaskSubmit = async (taskData) => {
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id || editingTask._id}` : "/api/tasks";
      const method = editingTask ? "PUT" : "POST";

      console.log("Dashboard: Submitting task", { method, url, taskData });

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Failed to ${editingTask ? "update" : "create"} task`);
      }

      await fetchTasks();
      setIsModalOpen(false);
      setEditingTask(null);

      toast.success(editingTask ? "Task updated successfully!" : "Task created successfully!");
    } catch (error) {
      console.error("Dashboard: Error saving task:", error);
      toast.error(error.message || "Something went wrong");
    }
  };

  const handleEditTask = (task) => {
    console.log("Dashboard: Editing task:", task);
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCreateNewTask = () => {
    console.log("Dashboard: Creating new task");
    setEditingTask(null);
    setIsModalOpen(true);
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      console.log("Dashboard: Deleting task:", taskId);

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete task");
      }

      await fetchTasks();
      toast.success("Task deleted successfully!");
    } catch (error) {
      console.error("Dashboard: Error deleting task:", error);
      toast.error(error.message || "Failed to delete task. Please try again.");
    }
  };

  // Toggle task completion status
  const handleToggleComplete = async (taskId, newStatus) => {
    try {
      const task = tasks.find((t) => (t.id || t._id) === taskId);
      if (!task) {
        console.error("Dashboard: Task not found for toggle:", taskId);
        return;
      }

      console.log("Dashboard: Toggling task status:", taskId, newStatus);

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...task,
          status: newStatus,
          completedAt: newStatus === "completed" ? new Date() : null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update task status");
      }

      await fetchTasks();
      toast.success(`Task marked as ${newStatus}!`);
    } catch (error) {
      console.error("Dashboard: Error toggling task status:", error);
      toast.error(error.message || "Failed to update task status. Please try again.");
    }
  };

  // Show loading while checking auth or fetching initial data
  if (authLoading || (loading && !tasks.length)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
              <p className="text-gray-600 mt-1">Welcome back, {user.name || user.email}!</p>
            </div>
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
'use client';

import { useState, useEffect } from 'react';
import TaskItem from './TaskItem';

export default function TaskList({ tasks = [], onEdit, onDelete, onToggleComplete }) {
  const [filteredTasks, setFilteredTasks] = useState(tasks);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  });

  const categories = ['all', ...new Set(tasks.map(task => task.category).filter(Boolean))];

  // Apply filters + sorting
  useEffect(() => {
    let result = [...tasks];

    if (filters.status !== 'all') {
      result = result.filter(task => task.status === filters.status);
    }
    if (filters.priority !== 'all') {
      result = result.filter(task => task.priority === filters.priority);
    }
    if (filters.category !== 'all') {
      result = result.filter(task => task.category === filters.category);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (filters.sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (filters.sortBy === 'dueDate') {
        comparison = new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
      } else if (filters.sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
      } else if (filters.sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredTasks(result);
  }, [tasks, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const toggleSortOrder = (field) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIndicator = ({ field }) => (
    filters.sortBy === field && (
      <span className="ml-1">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
    )
  );

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Priority</label>
            <select
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.filter(cat => cat !== 'all').map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={() => setFilters({
                status: 'all',
                priority: 'all',
                category: 'all',
                sortBy: 'dueDate',
                sortOrder: 'asc',
              })}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          {['title', 'dueDate', 'priority'].map(field => (
            <button
              key={field}
              onClick={() => toggleSortOrder(field)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filters.sortBy === field
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {field.charAt(0).toUpperCase() + field.slice(1)}
              <SortIndicator field={field} />
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-md border border-gray-200">
            <p className="text-gray-500 text-sm">No tasks found. Create a new task to get started!</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleComplete={onToggleComplete}
            />
          ))
        )}
      </div>
    </div>
  );
}

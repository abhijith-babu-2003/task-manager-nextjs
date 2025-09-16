'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { PencilIcon, TrashIcon, CheckIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function TaskItem({ task, onEdit, onDelete, onToggleComplete }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  const statusIcons = {
    completed: <CheckIcon className="h-5 w-5 text-green-500" />,
    'in-progress': <ClockIcon className="h-5 w-5 text-blue-500" />,
    pending: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />,
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-4">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={task.status === 'completed'}
            onChange={() => onToggleComplete(task.id, task.status === 'completed' ? 'pending' : 'completed')}
            className="h-5 w-5 text-blue-600 rounded"
          />
          <div>
            <h3 className={`text-lg leading-6 font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.title}
            </h3>
            {task.dueDate && (
              <p className="mt-1 text-sm text-gray-500">
                Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {task.priority && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[task.priority] || 'bg-gray-100 text-gray-800'}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          )}
          {task.category && (
            <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
              {task.category}
            </span>
          )}
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-gray-400 hover:text-blue-500"
            aria-label="Edit task"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={async () => {
              if (window.confirm('Are you sure you want to delete this task?')) {
                setIsDeleting(true);
                await onDelete(task.id);
                setIsDeleting(false);
              }
            }}
            disabled={isDeleting}
            className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
            aria-label="Delete task"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      {task.description && (
        <div className="border-t border-gray-200 px-4 py-3 sm:px-6">
          <p className="text-sm text-gray-700">{task.description}</p>
        </div>
      )}
    </div>
  );
}

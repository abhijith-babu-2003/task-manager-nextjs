'use client';

import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

const StatCard = ({ title, value, icon: Icon, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div className="bg-white/80 backdrop-blur-lg border border-gray-100 hover:shadow-lg transition transform hover:-translate-y-1 rounded-2xl overflow-hidden">
      <div className="p-6 flex items-center">
        <div className={`flex-shrink-0 rounded-xl p-3 ${colorClasses[color]}`}>
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="ml-5">
          <dt className="text-sm font-medium text-gray-500">{title}</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900">{value}</dd>
        </div>
      </div>
      {trend && (
        <div className="bg-gray-50 px-6 py-3 flex items-center text-sm">
          {trend.increase ? (
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-600 mr-1" />
          ) : (
            <ArrowTrendingDownIcon className="h-4 w-4 text-red-600 mr-1" />
          )}
          <span className={`font-medium ${trend.increase ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value}% {trend.increase ? 'increase' : 'decrease'}
          </span>
          <span className="text-gray-400 ml-1">from last week</span>
        </div>
      )}
    </div>
  );
};

export default function DashboardStats({ tasks = [] }) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueToday = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime() && task.status !== 'completed';
  }).length;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
      <StatCard
        title="Total Tasks"
        value={totalTasks}
        icon={ChartBarIcon}
        color="indigo"
      />
      <StatCard
        title="Completed"
        value={`${completionRate}%`}
        icon={CheckCircleIcon}
        color="green"
        trend={{ value: 12, increase: true }}
      />
      <StatCard
        title="In Progress"
        value={inProgressTasks}
        icon={ClockIcon}
        color="blue"
      />
      <StatCard
        title="Due Today"
        value={dueToday}
        icon={ExclamationTriangleIcon}
        color="yellow"
      />
    </div>
  );
}

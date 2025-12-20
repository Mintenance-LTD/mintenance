'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/figma';

export interface Task {
  id: string;
  title: string;
  status: 'approved' | 'in_review' | 'on_going' | 'pending';
  completed: boolean;
}

interface TodayTasksProps {
  tasks: Task[];
  onToggleTask?: (taskId: string) => void;
  taskUrlPattern?: string; // e.g., '/jobs/{id}' or '/contractor/jobs/{id}'
}

export function TodayTasks({ tasks, onToggleTask, taskUrlPattern = '/jobs/{id}' }: TodayTasksProps) {
  const getUrl = (id: string) => taskUrlPattern.replace('{id}', id);
  const [activeTab, setActiveTab] = useState<'all' | 'important' | 'notes' | 'links'>('all');

  const tabs = [
    { id: 'all', label: 'All', count: tasks.length },
    { id: 'important', label: 'Important', count: 0 },
    { id: 'notes', label: 'Notes', count: 0 },
    { id: 'links', label: 'Links', count: 0 },
  ] as const;

  return (
    <div>
      <h2 className="text-subheading-md font-[560] text-gray-900 mb-6 tracking-normal">
        Today Tasks
      </h2>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              bg-transparent border-none py-3 px-4 text-sm font-[560]
              transition-all duration-200 flex items-center gap-2 -mb-px
              ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {tab.label}
            <span
              className={`
                inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-[560]
                ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }
              `}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-3">
        {tasks.map((task) => {
          return (
            <div
              key={task.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200 cursor-pointer group"
            >
              {/* Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTask?.(task.id);
                }}
                className={`
                  w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0
                  ${
                    task.completed
                      ? 'bg-success-DEFAULT border-success-DEFAULT'
                      : 'border-gray-300 hover:border-primary-600'
                  }
                `}
              >
                {task.completed && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11.6667 3.5L5.25 9.91667L2.33333 7"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>

              {/* Task Title */}
              <Link
                href={getUrl(task.id)}
                className={`
                  flex-1 text-sm font-[460] transition-colors duration-200
                  ${
                    task.completed
                      ? 'text-gray-500 line-through'
                      : 'text-gray-900 group-hover:text-primary-600'
                  }
                `}
                onClick={(e) => {
                  if (task.completed) {
                    e.preventDefault();
                  }
                }}
              >
                {task.title}
              </Link>

              {/* Status Badge */}
              <StatusBadge status={task.status as any} />
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-base font-[460] text-gray-700 mb-1 leading-[1.5]">
            No tasks for today. You're all caught up! 🎉
          </p>
          <p className="text-sm font-[460] text-gray-500 leading-[1.5]">
            New tasks will appear here as they're assigned
          </p>
        </div>
      )}
    </div>
  );
}

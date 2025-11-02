'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import Link from 'next/link';

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

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'approved':
        return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
      case 'in_review':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'on_going':
        return { bg: '#FEF3C7', text: '#EA580C', border: '#FDE68A' };
      case 'pending':
        return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
      default:
        return { bg: theme.colors.backgroundSecondary, text: theme.colors.textSecondary, border: theme.colors.border };
    }
  };

  const tabs = [
    { id: 'all', label: 'All', count: tasks.length },
    { id: 'important', label: 'Important', count: 0 },
    { id: 'notes', label: 'Notes', count: 0 },
    { id: 'links', label: 'Links', count: 0 },
  ] as const;

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '20px',
        padding: theme.spacing[6],
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: theme.spacing[6],
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
        }}
      >
        Today Tasks
      </h2>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: theme.spacing[4],
          marginBottom: theme.spacing[6],
          borderBottom: `1px solid ${theme.colors.border}`,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary,
              borderBottom: activeTab === tab.id ? `2px solid ${theme.colors.primary}` : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              marginBottom: '-1px',
            }}
          >
            {tab.label}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '20px',
                height: '20px',
                padding: '0 6px',
                borderRadius: '10px',
                backgroundColor: activeTab === tab.id ? theme.colors.primary : theme.colors.border,
                color: activeTab === tab.id ? theme.colors.white : theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.bold,
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[3],
        }}
      >
        {tasks.map((task) => {
          const statusColors = getStatusColor(task.status);

          return (
            <div
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[4],
                padding: theme.spacing[4],
                borderRadius: '12px',
                backgroundColor: theme.colors.backgroundSecondary,
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.border;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }}
            >
              {/* Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTask?.(task.id);
                }}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  border: `2px solid ${task.completed ? theme.colors.success : theme.colors.border}`,
                  backgroundColor: task.completed ? theme.colors.success : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
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
                style={{
                  flex: 1,
                  fontSize: theme.typography.fontSize.sm,
                  color: task.completed ? theme.colors.textSecondary : theme.colors.textPrimary,
                  textDecoration: task.completed ? 'line-through' : 'none',
                  textDecorationThickness: task.completed ? '1px' : 'none',
                }}
                onClick={(e) => {
                  if (task.completed) {
                    e.preventDefault();
                  }
                }}
              >
                {task.title}
              </Link>

              {/* Status Badge */}
              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: '12px',
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                  border: `1px solid ${statusColors.border}`,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.medium,
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                }}
              >
                {task.status.replace(/_/g, ' ')}
              </span>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div
          style={{
            padding: theme.spacing[8],
            textAlign: 'center',
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
          }}
        >
          No tasks for today. You're all caught up! 🎉
        </div>
      )}
    </div>
  );
}

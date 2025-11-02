'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  manager: string;
  dueDate: string;
  status: 'completed' | 'delayed' | 'at_risk' | 'on_going' | 'posted' | 'pending';
  progress: number;
}

interface ProjectTableProps {
  projects: Project[];
  jobUrlPattern?: string; // e.g., '/jobs/{id}' or '/contractor/jobs/{id}'
}

export function ProjectTable({ projects, jobUrlPattern = '/jobs/{id}' }: ProjectTableProps) {
  const getUrl = (id: string) => jobUrlPattern.replace('{id}', id);
  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
      case 'delayed':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      case 'at_risk':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'on_going':
        return { bg: '#FEF3C7', text: '#EA580C', border: '#FDE68A' };
      case 'posted':
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      default:
        return { bg: theme.colors.backgroundSecondary, text: theme.colors.textSecondary, border: theme.colors.border };
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return theme.colors.success;
    if (progress >= 60) return '#10B981'; // green
    if (progress >= 30) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '20px',
        padding: theme.spacing[6],
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing[6],
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}
        >
          Project Summary
        </h2>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: `1px solid ${theme.colors.border}`,
              }}
            >
              <th
                style={{
                  textAlign: 'left',
                  padding: theme.spacing[3],
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                }}
              >
                Name
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: theme.spacing[3],
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                }}
              >
                Project Manager
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: theme.spacing[3],
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                }}
              >
                Due Date
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: theme.spacing[3],
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                }}
              >
                Status
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: theme.spacing[3],
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                }}
              >
                Progress
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const statusColors = getStatusColor(project.status);
              const progressColor = getProgressColor(project.progress);

              return (
                <tr
                  key={project.id}
                  style={{
                    borderBottom: `1px solid ${theme.colors.border}`,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td
                    style={{
                      padding: theme.spacing[4],
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    <Link
                      href={getUrl(project.id)}
                      style={{
                        textDecoration: 'none',
                        color: theme.colors.textPrimary,
                      }}
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td
                    style={{
                      padding: theme.spacing[4],
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    {project.manager}
                  </td>
                  <td
                    style={{
                      padding: theme.spacing[4],
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    {new Date(project.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td style={{ padding: theme.spacing[4] }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        backgroundColor: statusColors.bg,
                        color: statusColors.text,
                        border: `1px solid ${statusColors.border}`,
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.medium,
                        textTransform: 'capitalize',
                      }}
                    >
                      {project.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: theme.spacing[4],
                      textAlign: 'right',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        width: '50px',
                        height: '50px',
                      }}
                    >
                      <svg width="50" height="50" style={{ transform: 'rotate(-90deg)' }}>
                        <circle
                          cx="25"
                          cy="25"
                          r="20"
                          fill="none"
                          stroke={theme.colors.border}
                          strokeWidth="4"
                        />
                        <circle
                          cx="25"
                          cy="25"
                          r="20"
                          fill="none"
                          stroke={progressColor}
                          strokeWidth="4"
                          strokeDasharray={2 * Math.PI * 20}
                          strokeDashoffset={2 * Math.PI * 20 * (1 - project.progress / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span
                        style={{
                          position: 'absolute',
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.bold,
                          color: theme.colors.textPrimary,
                        }}
                      >
                        {project.progress}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

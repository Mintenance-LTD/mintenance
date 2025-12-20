import React from 'react';
import { theme } from '@/lib/theme';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/figma';

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
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden h-full group relative">
      {/* Gradient bar - appears on hover, always visible on large screens */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity duration-200 z-10" data-gradient-bar="true"></div>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-subheading-md font-[560] text-gray-900 tracking-normal">
            Project Summary
          </h2>
          <p className="text-sm font-[460] text-gray-600 mt-1">{projects.length} total projects</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-900 mb-2">No projects yet</p>
          <p className="text-sm text-gray-500">Your projects will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-6 text-xs font-[560] text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left py-4 px-6 text-xs font-[560] text-gray-600 uppercase tracking-wider">
                  Project Manager
                </th>
                <th className="text-left py-4 px-6 text-xs font-[560] text-gray-600 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="text-left py-4 px-6 text-xs font-[560] text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right py-4 px-6 text-xs font-[560] text-gray-600 uppercase tracking-wider">
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
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors duration-150 group cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <Link
                        href={getUrl(project.id)}
                        className="text-sm font-[560] text-gray-900 hover:text-secondary transition-colors duration-200 flex items-center gap-2 group-hover:gap-3"
                      >
                        <span className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-secondary transition-colors"></span>
                        {project.name}
                      </Link>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-xs font-[560] text-primary">
                          {project.manager.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span className="text-sm font-[460] text-gray-700">{project.manager}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm font-[460] text-gray-600">
                      {new Date(project.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={project.status as any} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center justify-center relative w-12 h-12">
                        <svg width="48" height="48" className="-rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r="18"
                            fill="none"
                            stroke="#E5E7EB"
                            strokeWidth="4"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="18"
                            fill="none"
                            stroke={progressColor}
                            strokeWidth="4"
                            strokeDasharray={2 * Math.PI * 18}
                            strokeDashoffset={2 * Math.PI * 18 * (1 - project.progress / 100)}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                          />
                        </svg>
                        <span className="absolute text-xs font-[560] text-gray-900">
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
      )}
    </div>
  );
}

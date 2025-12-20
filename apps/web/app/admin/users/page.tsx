'use client';

import React, { useState } from 'react';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'homeowner' | 'contractor' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  joinedAt: string;
  lastActive: string;
  jobsCount?: number;
  verified?: boolean;
}

export default function AdminUsersPage2025() {
  const { user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'homeowner' | 'contractor' | 'admin'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'suspended' | 'pending'>('all');

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

  // Mock data
  const [users, setUsers] = useState<UserRecord[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      role: 'homeowner',
      status: 'active',
      joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      jobsCount: 12,
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      role: 'contractor',
      status: 'active',
      joinedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      jobsCount: 45,
      verified: true,
    },
    {
      id: '3',
      name: 'Mike Wilson',
      email: 'mike@example.com',
      role: 'contractor',
      status: 'pending',
      joinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      verified: false,
    },
  ]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      searchQuery === '' ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSuspendUser = async (userId: string) => {
    try {
      // API call would go here
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'suspended' as const } : u));
      toast.success('User suspended successfully');
    } catch (error) {
      toast.error('Failed to suspend user');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      // API call would go here
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'active' as const } : u));
      toast.success('User activated successfully');
    } catch (error) {
      toast.error('Failed to activate user');
    }
  };

  const stats = [
    { label: 'Total Users', value: users.length, icon: '👥', color: 'purple' },
    { label: 'Homeowners', value: users.filter(u => u.role === 'homeowner').length, icon: '🏠', color: 'teal' },
    { label: 'Contractors', value: users.filter(u => u.role === 'contractor').length, icon: '🔨', color: 'emerald' },
    { label: 'Pending', value: users.filter(u => u.status === 'pending').length, icon: '⏳', color: 'amber' },
  ];

  const getRoleBadge = (role: string) => {
    const badges = {
      homeowner: 'bg-teal-100 text-teal-700',
      contractor: 'bg-emerald-100 text-emerald-700',
      admin: 'bg-purple-100 text-purple-700',
    };
    return badges[role as keyof typeof badges] || 'bg-gray-100 text-gray-700';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-emerald-100 text-emerald-700',
      suspended: 'bg-rose-100 text-rose-700',
      pending: 'bg-amber-100 text-amber-700',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="admin"
        userInfo={{
          name: userDisplayName,
          email: user?.email || '',
          avatar: (user as any)?.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-1">User Management</h1>
                <p className="text-purple-100 text-lg">Manage platform users and permissions</p>
              </div>
            </div>

            {/* Stats Grid */}
            <MotionDiv
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {stats.map((stat) => (
                <MotionDiv
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-purple-100 text-sm">{stat.label}</div>
                </MotionDiv>
              ))}
            </MotionDiv>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          {/* Filters */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="md:col-span-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Role Filter */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Roles</option>
                <option value="homeowner">Homeowners</option>
                <option value="contractor">Contractors</option>
                <option value="admin">Admins</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </MotionDiv>

          {/* Users Table */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">User</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Role</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Joined</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Last Active</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Jobs</th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              {u.name}
                              {u.verified && (
                                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${getRoleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${getStatusBadge(u.status)}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700">
                        {new Date(u.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700">
                        {new Date(u.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700">
                        {u.jobsCount || '-'}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200">
                            View
                          </button>
                          {u.status === 'active' ? (
                            <button
                              onClick={() => handleSuspendUser(u.id)}
                              className="px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-200"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(u.id)}
                              className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-200"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MotionDiv>
        </div>
      </main>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';;
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Briefcase,
  Settings,
  Key,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'technician' | 'apprentice';
  status: 'active' | 'inactive' | 'pending';
  joinDate: string;
  completedJobs: number;
  rating: number;
  specialties: string[];
  permissions: {
    manageJobs: boolean;
    manageBids: boolean;
    manageFinances: boolean;
    manageTeam: boolean;
  };
}

export default function ContractorTeamPage2025() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: 'TEAM-001',
      name: 'John Smith',
      email: 'john@plumbing.com',
      phone: '+44 7700 900001',
      role: 'admin',
      status: 'active',
      joinDate: '2020-01-15',
      completedJobs: 342,
      rating: 4.9,
      specialties: ['Plumbing', 'Heating', 'Gas Safety'],
      permissions: {
        manageJobs: true,
        manageBids: true,
        manageFinances: true,
        manageTeam: true,
      },
    },
    {
      id: 'TEAM-002',
      name: 'Mike Johnson',
      email: 'mike@plumbing.com',
      phone: '+44 7700 900002',
      role: 'manager',
      status: 'active',
      joinDate: '2021-03-20',
      completedJobs: 218,
      rating: 4.7,
      specialties: ['Plumbing', 'Bathrooms'],
      permissions: {
        manageJobs: true,
        manageBids: true,
        manageFinances: false,
        manageTeam: false,
      },
    },
    {
      id: 'TEAM-003',
      name: 'Sarah Williams',
      email: 'sarah@plumbing.com',
      phone: '+44 7700 900003',
      role: 'technician',
      status: 'active',
      joinDate: '2022-06-10',
      completedJobs: 156,
      rating: 4.8,
      specialties: ['Heating', 'Boilers'],
      permissions: {
        manageJobs: true,
        manageBids: false,
        manageFinances: false,
        manageTeam: false,
      },
    },
    {
      id: 'TEAM-004',
      name: 'Tom Brown',
      email: 'tom@plumbing.com',
      phone: '+44 7700 900004',
      role: 'apprentice',
      status: 'active',
      joinDate: '2024-01-05',
      completedJobs: 28,
      rating: 4.5,
      specialties: ['Plumbing'],
      permissions: {
        manageJobs: false,
        manageBids: false,
        manageFinances: false,
        manageTeam: false,
      },
    },
    {
      id: 'TEAM-005',
      name: 'Emma Davis',
      email: 'emma@plumbing.com',
      phone: '+44 7700 900005',
      role: 'technician',
      status: 'pending',
      joinDate: '2025-01-28',
      completedJobs: 0,
      rating: 0,
      specialties: ['Gas Safety'],
      permissions: {
        manageJobs: false,
        manageBids: false,
        manageFinances: false,
        manageTeam: false,
      },
    },
  ]);

  const stats = {
    totalMembers: teamMembers.length,
    activeMembers: teamMembers.filter((m) => m.status === 'active').length,
    pendingInvites: teamMembers.filter((m) => m.status === 'pending').length,
    averageRating: teamMembers.reduce((sum, m) => sum + m.rating, 0) / teamMembers.filter((m) => m.rating > 0).length,
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'technician':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'apprentice':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleAddMember = () => {
    setShowAddForm(true);
  };

  const handleEditPermissions = (member: TeamMember) => {
    setSelectedMember(member);
    setShowPermissions(true);
  };

  const handleRemoveMember = (id: string) => {
    setTeamMembers(teamMembers.filter((m) => m.id !== id));
    toast.success('Team member removed');
  };

  const handleSavePermissions = () => {
    toast.success('Permissions updated successfully!');
    setShowPermissions(false);
    setSelectedMember(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      {/* Hero Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-emerald-600 via-amber-600 to-emerald-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <Users className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold">Team Management</h1>
              </div>
              <p className="text-emerald-100 text-lg">
                Manage your team members, roles, and permissions
              </p>
            </div>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddMember}
              className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Team Member
            </MotionButton>
          </div>

          {/* Stats Grid */}
          <MotionDiv
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8"
          >
            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-emerald-200" />
                <p className="text-emerald-100 text-sm">Total Team</p>
              </div>
              <p className="text-3xl font-bold">{stats.totalMembers}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-200" />
                <p className="text-emerald-100 text-sm">Active</p>
              </div>
              <p className="text-3xl font-bold">{stats.activeMembers}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-200" />
                <p className="text-emerald-100 text-sm">Pending</p>
              </div>
              <p className="text-3xl font-bold">{stats.pendingInvites}</p>
            </MotionDiv>

            <MotionDiv
              variants={staggerItem}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-200" />
                <p className="text-emerald-100 text-sm">Avg Rating</p>
              </div>
              <p className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Member Form */}
        <AnimatePresence>
          {showAddForm && (
            <MotionDiv
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add Team Member</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    placeholder="John Smith"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    placeholder="+44 7700 900000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    <option value="technician">Technician</option>
                    <option value="apprentice">Apprentice</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
                  <input
                    type="text"
                    placeholder="e.g., Plumbing, Heating, Gas Safety"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    toast.success('Invitation sent to team member');
                    setShowAddForm(false);
                  }}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Send Invitation
                </MotionButton>
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </MotionButton>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Permissions Modal */}
        <AnimatePresence>
          {showPermissions && selectedMember && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowPermissions(false)}
            >
              <MotionDiv
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Permissions for {selectedMember.name}
                </h3>

                <div className="space-y-4">
                  {Object.entries(selectedMember.permissions).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => {
                            setSelectedMember({
                              ...selectedMember,
                              permissions: {
                                ...selectedMember.permissions,
                                [key]: e.target.checked,
                              },
                            });
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <MotionButton
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSavePermissions}
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Save Changes
                  </MotionButton>
                  <MotionButton
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowPermissions(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </MotionButton>
                </div>
              </MotionDiv>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Team Members Grid */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {teamMembers.map((member) => (
            <MotionDiv
              key={member.id}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all"
            >
              {/* Member Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-3 rounded-full">
                    <Users className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{member.phone}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Jobs</p>
                  <p className="text-lg font-bold text-gray-900">{member.completedJobs}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <p className="text-lg font-bold text-gray-900">{member.rating > 0 ? member.rating.toFixed(1) : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Specialties */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {member.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleEditPermissions(member)}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Permissions
                </MotionButton>
                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </MotionButton>
                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </MotionButton>
              </div>
            </MotionDiv>
          ))}
        </MotionDiv>

        {teamMembers.length === 0 && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center"
          >
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No team members yet</h3>
            <p className="text-gray-500 mb-6">Start building your team by adding members</p>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddMember}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add First Team Member
            </MotionButton>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}

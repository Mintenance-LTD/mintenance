'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Play,
  Pause,
  Square,
  Plus,
  Calendar,
  Briefcase,
  TrendingUp,
  Download,
  Edit,
  Trash2,
  Filter,
} from 'lucide-react';
import { BarChart, DonutChart } from '@tremor/react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

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
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

interface TimeEntry {
  id: string;
  date: string;
  jobId: string;
  jobTitle: string;
  taskDescription: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  hourlyRate: number;
  isBillable: boolean;
  status: 'running' | 'stopped' | 'invoiced';
}

export default function TimeTrackingPage2025() {
  const router = useRouter();

  const [selectedWeek, setSelectedWeek] = useState<string>('2025-W04');
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([
    {
      id: '1',
      date: '2025-01-28',
      jobId: 'job_123',
      jobTitle: 'Kitchen Renovation - Smith Residence',
      taskDescription: 'Cabinet installation and final adjustments',
      startTime: '09:00',
      endTime: '14:30',
      duration: 330,
      hourlyRate: 50,
      isBillable: true,
      status: 'stopped',
    },
    {
      id: '2',
      date: '2025-01-27',
      jobId: 'job_456',
      jobTitle: 'Bathroom Remodel',
      taskDescription: 'Plumbing rough-in work',
      startTime: '08:30',
      endTime: '16:00',
      duration: 450,
      hourlyRate: 50,
      isBillable: true,
      status: 'invoiced',
    },
    {
      id: '3',
      date: '2025-01-27',
      jobId: 'admin',
      jobTitle: 'Administrative Tasks',
      taskDescription: 'Invoicing and quote preparation',
      startTime: '16:30',
      endTime: '18:00',
      duration: 90,
      hourlyRate: 0,
      isBillable: false,
      status: 'stopped',
    },
    {
      id: '4',
      date: '2025-01-26',
      jobId: 'job_789',
      jobTitle: 'Electrical Panel Upgrade',
      taskDescription: 'Panel installation and wiring',
      startTime: '09:00',
      endTime: '17:00',
      duration: 480,
      hourlyRate: 55,
      isBillable: true,
      status: 'stopped',
    },
  ]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalMinutes = timeEntries.reduce((sum, e) => sum + e.duration, 0);
    const totalHours = totalMinutes / 60;

    const billableMinutes = timeEntries
      .filter((e) => e.isBillable)
      .reduce((sum, e) => sum + e.duration, 0);
    const billableHours = billableMinutes / 60;

    const totalEarnings = timeEntries.reduce(
      (sum, e) => sum + (e.duration / 60) * e.hourlyRate,
      0
    );

    const invoicedEarnings = timeEntries
      .filter((e) => e.status === 'invoiced')
      .reduce((sum, e) => sum + (e.duration / 60) * e.hourlyRate, 0);

    const pendingEarnings = totalEarnings - invoicedEarnings;

    return {
      totalHours,
      billableHours,
      totalEarnings,
      invoicedEarnings,
      pendingEarnings,
    };
  }, [timeEntries]);

  // Time by job
  const timeByJob = useMemo(() => {
    const grouped = timeEntries.reduce((acc, entry) => {
      const job = entry.jobTitle;
      const hours = entry.duration / 60;
      acc[job] = (acc[job] || 0) + hours;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([job, hours]) => ({
        job,
        hours: parseFloat(hours.toFixed(2)),
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [timeEntries]);

  // Daily breakdown
  const dailyBreakdown = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });

      const dayEntries = timeEntries.filter((e) => e.date === dateStr);
      const totalMinutes = dayEntries.reduce((sum, e) => sum + e.duration, 0);
      const billableMinutes = dayEntries
        .filter((e) => e.isBillable)
        .reduce((sum, e) => sum + e.duration, 0);

      days.push({
        day: dayName,
        billable: parseFloat((billableMinutes / 60).toFixed(2)),
        nonBillable: parseFloat(((totalMinutes - billableMinutes) / 60).toFixed(2)),
      });
    }
    return days;
  }, [timeEntries]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleStartTimer = (jobId: string) => {
    setActiveTimer(jobId);
    toast.success('Timer started');
  };

  const handleStopTimer = () => {
    setActiveTimer(null);
    toast.success('Timer stopped');
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm('Delete this time entry?')) {
      setTimeEntries(timeEntries.filter((e) => e.id !== id));
      toast.success('Time entry deleted');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-red-50">
      {/* Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-emerald-600 to-red-600 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Time Tracking</h1>
              <p className="text-emerald-100">
                Track your time and maximize billable hours
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => toast.success('Exporting...')}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                <Download className="w-5 h-5" />
                Export
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Add Entry
              </button>
            </div>
          </div>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6"
        >
          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-emerald-100 rounded-lg mb-4 w-fit">
              <Clock className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Hours</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalHours.toFixed(1)}h
            </p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-green-100 rounded-lg mb-4 w-fit">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Billable Hours</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.billableHours.toFixed(1)}h
            </p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-blue-100 rounded-lg mb-4 w-fit">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-gray-900">
              £{stats.totalEarnings.toLocaleString('en-GB', { minimumFractionDigits: 0 })}
            </p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-purple-100 rounded-lg mb-4 w-fit">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Invoiced</p>
            <p className="text-2xl font-bold text-gray-900">
              £{stats.invoicedEarnings.toLocaleString('en-GB', { minimumFractionDigits: 0 })}
            </p>
          </MotionDiv>

          <MotionDiv
            variants={staggerItem}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <div className="p-3 bg-yellow-100 rounded-lg mb-4 w-fit">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-gray-900">
              £{stats.pendingEarnings.toLocaleString('en-GB', { minimumFractionDigits: 0 })}
            </p>
          </MotionDiv>
        </MotionDiv>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Hours */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Daily Hours (Last 7 Days)
            </h3>
            <BarChart
              data={dailyBreakdown}
              index="day"
              categories={['billable', 'nonBillable']}
              colors={['green', 'gray']}
              valueFormatter={(value) => `${value}h`}
              className="h-72"
              stack={true}
            />
          </MotionDiv>

          {/* Time by Job */}
          <MotionDiv
            variants={fadeIn}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Time by Job</h3>
            <DonutChart
              data={timeByJob}
              category="hours"
              index="job"
              valueFormatter={(value) => `${value}h`}
              colors={['orange', 'blue', 'green', 'purple', 'red']}
              className="h-72"
            />
          </MotionDiv>
        </div>

        {/* Time Entries */}
        <MotionDiv
          variants={fadeIn}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Time Entries</h3>

          <div className="space-y-3">
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{entry.jobTitle}</h4>
                        <p className="text-sm text-gray-600 mt-1">{entry.taskDescription}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(entry.date).toLocaleDateString('en-GB')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {entry.startTime} - {entry.endTime || 'Running'}
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatDuration(entry.duration)}
                      </span>
                      {entry.isBillable && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Billable
                        </span>
                      )}
                      {entry.status === 'invoiced' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          Invoiced
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {entry.isBillable && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Earnings</p>
                        <p className="text-lg font-bold text-gray-900">
                          £{((entry.duration / 60) * entry.hourlyRate).toFixed(2)}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {entry.status === 'running' ? (
                        <button
                          onClick={handleStopTimer}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <Square className="w-5 h-5" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              router.push(`/contractor/time-tracking/${entry.id}/edit`)
                            }
                            className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </MotionDiv>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Time Entry</h3>
            <p className="text-gray-600 mb-6">Time entry form would go here...</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('Time entry added');
                  setShowAddModal(false);
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add Entry
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </div>
  );
}

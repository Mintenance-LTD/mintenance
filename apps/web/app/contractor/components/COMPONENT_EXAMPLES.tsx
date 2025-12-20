/**
 * Professional Contractor Dashboard - Component Examples
 *
 * Copy-paste ready components that match the professional layout design system.
 * All components use Tailwind CSS classes and are fully responsive.
 */

import {
  Briefcase,
  TrendingUp,
  PoundSterling,
  Calendar,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Users,
  MessageSquare,
  MapPin,
  Phone,
  Mail,
  MoreVertical
} from 'lucide-react';

/* ==================== STAT CARDS ==================== */

/**
 * Stats Grid - 4 column layout with key metrics
 */
export function StatsGrid() {
  const stats = [
    {
      label: 'Active Jobs',
      value: '12',
      change: '+3',
      changeType: 'increase' as const,
      icon: Briefcase,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      label: 'Revenue (MTD)',
      value: '£8,450',
      change: '+12%',
      changeType: 'increase' as const,
      icon: PoundSterling,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Avg. Rating',
      value: '4.8',
      change: '+0.2',
      changeType: 'increase' as const,
      icon: Star,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Completion Rate',
      value: '94%',
      change: '-2%',
      changeType: 'decrease' as const,
      icon: TrendingUp,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span
              className={`font-medium ${
                stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {stat.changeType === 'increase' ? '↑' : '↓'} {stat.change}
            </span>
            <span className="text-gray-600 ml-2">vs last month</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== JOB CARDS ==================== */

/**
 * Job Card - Individual job listing with status
 */
export function JobCard({ job }: { job: any }) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  statusColors[job.status as keyof typeof statusColors]
                }`}
              >
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.title}</h3>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-1" />
              {job.location}
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{job.description}</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Start Date</p>
            <p className="text-sm font-medium text-gray-900">{job.startDate}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Budget</p>
            <p className="text-sm font-medium text-gray-900">£{job.budget}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <img
              src={job.clientAvatar || '/default-avatar.png'}
              alt={job.clientName}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{job.clientName}</p>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-gray-600">{job.clientRating}</span>
              </div>
            </div>
          </div>
          <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1">
            View Details
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Jobs Grid - List of job cards
 */
export function JobsGrid() {
  const jobs = [
    {
      id: 1,
      title: 'Kitchen Renovation',
      description: 'Complete kitchen remodel including cabinets, countertops, and appliances.',
      location: 'London, UK',
      status: 'active',
      startDate: 'Dec 15, 2025',
      budget: '12,500',
      clientName: 'Sarah Johnson',
      clientAvatar: null,
      clientRating: '4.9',
    },
    // Add more jobs...
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}

/* ==================== ACTIVITY TIMELINE ==================== */

/**
 * Activity Timeline - Recent events and updates
 */
export function ActivityTimeline() {
  const activities = [
    {
      id: 1,
      type: 'job_completed',
      title: 'Job Completed',
      description: 'Bathroom Renovation at 45 Park Lane',
      time: '2 hours ago',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      id: 2,
      type: 'new_message',
      title: 'New Message',
      description: 'John Smith sent you a message about the plumbing project',
      time: '4 hours ago',
      icon: MessageSquare,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      id: 3,
      type: 'payment_received',
      title: 'Payment Received',
      description: '£3,500 from Kitchen Renovation project',
      time: '1 day ago',
      icon: PoundSterling,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      id: 4,
      type: 'upcoming_appointment',
      title: 'Upcoming Appointment',
      description: 'Site visit at 123 Oak Street tomorrow at 10:00 AM',
      time: '2 days ago',
      icon: Calendar,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex gap-4">
              {/* Icon */}
              <div className={`w-10 h-10 ${activity.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <activity.icon className={`w-5 h-5 ${activity.iconColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>

              {/* Connector Line */}
              {index < activities.length - 1 && (
                <div className="absolute left-11 top-10 w-0.5 h-full bg-gray-200" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==================== DATA TABLE ==================== */

/**
 * Data Table - Recent jobs or invoices
 */
export function DataTable() {
  const data = [
    {
      id: 1,
      jobTitle: 'Kitchen Renovation',
      client: 'Sarah Johnson',
      location: 'London',
      status: 'In Progress',
      amount: '£12,500',
      date: 'Dec 15, 2025',
    },
    {
      id: 2,
      jobTitle: 'Bathroom Remodel',
      client: 'Mike Peters',
      location: 'Manchester',
      status: 'Completed',
      amount: '£8,300',
      date: 'Dec 10, 2025',
    },
    {
      id: 3,
      jobTitle: 'Office Fit-out',
      client: 'TechCorp Ltd',
      location: 'Birmingham',
      status: 'Pending',
      amount: '£25,000',
      date: 'Dec 20, 2025',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recent Jobs</h3>
        <button className="text-sm font-medium text-teal-600 hover:text-teal-700">
          View All
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{row.jobTitle}</div>
                  <div className="text-sm text-gray-500">{row.location}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{row.client}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      row.status === 'Completed'
                        ? 'bg-green-100 text-green-800'
                        : row.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.amount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ==================== QUICK ACTIONS ==================== */

/**
 * Quick Actions - Common tasks
 */
export function QuickActions() {
  const actions = [
    {
      title: 'Create Quote',
      description: 'Send a quote to a client',
      icon: PoundSterling,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      href: '/contractor/quotes/create',
    },
    {
      title: 'Schedule Visit',
      description: 'Book a site visit',
      icon: Calendar,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      href: '/contractor/scheduling',
    },
    {
      title: 'View Messages',
      description: '3 unread messages',
      icon: MessageSquare,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      href: '/contractor/messages',
      badge: 3,
    },
    {
      title: 'Find Jobs',
      description: 'Browse available jobs',
      icon: Briefcase,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      href: '/contractor/discover',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action) => (
        <a
          key={action.title}
          href={action.href}
          className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 group cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-12 h-12 ${action.iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <action.icon className={`w-6 h-6 ${action.iconColor}`} />
            </div>
            {action.badge && (
              <span className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                {action.badge}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">{action.title}</h4>
          <p className="text-xs text-gray-600">{action.description}</p>
        </a>
      ))}
    </div>
  );
}

/* ==================== PROGRESS BAR ==================== */

/**
 * Progress Bar - Job completion or milestone tracking
 */
export function ProgressBar({
  label,
  progress,
  color = 'teal'
}: {
  label: string;
  progress: number;
  color?: 'teal' | 'blue' | 'green' | 'amber';
}) {
  const colorClasses = {
    teal: 'bg-teal-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colorClasses[color]} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Progress Dashboard - Multiple progress indicators
 */
export function ProgressDashboard() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Job Progress</h3>
      <div className="space-y-6">
        <ProgressBar label="Kitchen Renovation" progress={75} color="teal" />
        <ProgressBar label="Bathroom Remodel" progress={100} color="green" />
        <ProgressBar label="Office Fit-out" progress={30} color="blue" />
        <ProgressBar label="Garden Landscaping" progress={45} color="amber" />
      </div>
    </div>
  );
}

/* ==================== EMPTY STATES ==================== */

/**
 * Empty State - When no data is available
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Briefcase className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      <a
        href={actionHref}
        className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
      >
        {actionLabel}
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}

/* ==================== NOTIFICATION BADGE ==================== */

/**
 * Notification Badge - Alerts and updates
 */
export function NotificationBadge({
  type,
  message
}: {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}) {
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-600',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: AlertCircle,
      iconColor: 'text-amber-600',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: AlertCircle,
      iconColor: 'text-red-600',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: Clock,
      iconColor: 'text-blue-600',
    },
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4 flex items-start gap-3`}>
      <Icon className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
      <p className={`text-sm ${style.text} flex-1`}>{message}</p>
    </div>
  );
}

/* ==================== USAGE EXAMPLE ==================== */

/**
 * Complete Dashboard Page Example
 */
export default function DashboardExample() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
      </div>

      {/* Notifications */}
      <NotificationBadge
        type="info"
        message="You have 3 quotes pending review from clients."
      />

      {/* Stats Grid */}
      <StatsGrid />

      {/* Quick Actions */}
      <QuickActions />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DataTable />
        </div>
        <div>
          <ActivityTimeline />
        </div>
      </div>

      {/* Progress Dashboard */}
      <ProgressDashboard />
    </div>
  );
}

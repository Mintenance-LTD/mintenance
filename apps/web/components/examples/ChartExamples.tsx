'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

/**
 * Example Revenue Chart Component
 * Demonstrates Recharts usage for data visualization
 */
interface RevenueChartProps {
  data?: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data || [
    { month: 'Jan', revenue: 12000, expenses: 8000, profit: 4000 },
    { month: 'Feb', revenue: 15000, expenses: 9000, profit: 6000 },
    { month: 'Mar', revenue: 18000, expenses: 10000, profit: 8000 },
    { month: 'Apr', revenue: 14000, expenses: 8500, profit: 5500 },
    { month: 'May', revenue: 20000, expenses: 11000, profit: 9000 },
    { month: 'Jun', revenue: 22000, expenses: 12000, profit: 10000 },
  ];

  return (
    <div className="space-y-6">
      {/* Line Chart */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10B981"
              strokeWidth={2}
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#EF4444"
              strokeWidth={2}
              name="Expenses"
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#3B82F6"
              strokeWidth={2}
              name="Profit"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Monthly Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
            <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Example Pie Chart Component
 * Shows distribution of job types
 */
interface JobDistributionChartProps {
  data?: Array<{
    name: string;
    value: number;
  }>;
}

export function JobDistributionChart({ data }: JobDistributionChartProps) {
  const chartData = data || [
    { name: 'Plumbing', value: 35 },
    { name: 'Electrical', value: 25 },
    { name: 'HVAC', value: 20 },
    { name: 'General', value: 20 },
  ];

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold">Job Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Dashboard Stats Chart Component
 * Shows multiple metrics in a compact format
 */
export function DashboardStatsChart() {
  const statsData = [
    { name: 'Active Jobs', value: 45, color: '#10B981' },
    { name: 'Pending', value: 12, color: '#F59E0B' },
    { name: 'Completed', value: 128, color: '#3B82F6' },
    { name: 'Cancelled', value: 5, color: '#EF4444' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => (
        <div
          key={stat.name}
          className="rounded-lg border bg-white p-4"
          style={{ borderLeft: `4px solid ${stat.color}` }}
        >
          <p className="text-sm text-gray-600">{stat.name}</p>
          <p className="text-2xl font-bold" style={{ color: stat.color }}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}


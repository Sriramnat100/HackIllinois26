import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AlertTriangle, TrendingUp, PieChart as PieChartIcon, ArrowUp, ArrowDown } from "lucide-react";

const COLORS = ["#059669", "#DC2626", "#D97706"];

export const AnalyticsCards = ({ analytics }) => {
  if (!analytics) return null;

  const pieData = [
    { name: "PASS", value: analytics.pass_fail_monitor?.pass || 0 },
    { name: "FAIL", value: analytics.pass_fail_monitor?.fail || 0 },
    { name: "MONITOR", value: analytics.pass_fail_monitor?.monitor || 0 },
  ];

  const total = pieData.reduce((acc, item) => acc + item.value, 0);
  const passRate = total > 0 ? Math.round((pieData[0].value / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4" data-testid="analytics-cards">
      {/* Most Failed Parts */}
      <div className="analytics-card">
        <div className="analytics-header">
          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">
              Top Failure Categories
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Last 90 days</p>
          </div>
        </div>
        <div className="px-4 pt-3 pb-1">
          <div className="h-36 w-full min-w-0">
            <ResponsiveContainer width="99%" height="100%">
              <BarChart
                data={analytics.failed_parts}
                layout="vertical"
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={75}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value, name, props) => [
                    `${value} failures (${props.payload.percentage}%)`,
                    "",
                  ]}
                />
                <Bar
                  dataKey="count"
                  fill="#DC2626"
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="analytics-insight">
          <span className="text-red-600 dark:text-red-400 font-medium">Hydraulics</span> account for 35% of all failures
        </p>
      </div>

      {/* Inspections Over Time */}
      <div className="analytics-card">
        <div className="analytics-header">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">
              Inspection Volume
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">6 month trend</p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <ArrowUp className="w-3 h-3" />
            12%
          </div>
        </div>
        <div className="px-4 pt-3 pb-1">
          <div className="h-28 w-full min-w-0">
            <ResponsiveContainer width="99%" height="100%">
              <LineChart
                data={analytics.inspections_over_time}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#F7B500"
                  strokeWidth={2.5}
                  dot={{ fill: "#F7B500", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#F7B500" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="analytics-insight">
          <span className="font-medium">{analytics.inspections_over_time?.slice(-1)[0]?.count || 0}</span> inspections completed this month
        </p>
      </div>

      {/* Pass vs Fail vs Monitor */}
      <div className="analytics-card">
        <div className="analytics-header">
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
            <PieChartIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">
              Inspection Outcomes
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">All time distribution</p>
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 min-w-[96px]">
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={28}
                    outerRadius={42}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-[12px] text-slate-600 dark:text-slate-400">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 pb-3 pt-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <span className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400">{passRate}%</span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Pass Rate</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCards;

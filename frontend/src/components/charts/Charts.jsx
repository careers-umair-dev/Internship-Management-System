import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { PRIORITY_COLOR, STATUS_COLOR, useChartColors } from './chartTheme';

const fmtPeriod = (p = '') => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return new Date(`${p}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  if (/^\d{4}-\d{2}$/.test(p)) return new Date(`${p}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return p.replace(/^\d{4}-/, ''); // 2026-W40 -> W40
};

function ChartTip({ active, payload, label, colors, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-pop">
      {label !== undefined && <p className="mb-1 font-medium text-foreground">{labelFormatter ? labelFormatter(label) : label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill || colors.primary }} />
          {p.name}: <b className="text-foreground">{p.value}</b>
        </p>
      ))}
    </div>
  );
}

const Empty = ({ text = 'No data for this period' }) => <EmptyState icon={BarChart3} title={text} className="py-10" />;

// Assigned vs completed tasks per period
export function TrendChart({ data = [], height = 280 }) {
  const c = useChartColors();
  if (!data.some((d) => d.assigned || d.completed)) return <Empty text="No task activity in this period" />;
  return (
    <div role="img" aria-label="Chart of tasks assigned and completed over time">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            {[['assigned', c.primary], ['completed', c.success]].map(([k, col]) => (
              <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={col} stopOpacity={0.3} /><stop offset="100%" stopColor={col} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis dataKey="period" tickFormatter={fmtPeriod} tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTip colors={c} labelFormatter={fmtPeriod} />} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: c.muted }} />
          <Area type="monotone" dataKey="assigned" name="Assigned" stroke={c.primary} strokeWidth={2} fill="url(#grad-assigned)" />
          <Area type="monotone" dataKey="completed" name="Completed" stroke={c.success} strokeWidth={2} fill="url(#grad-completed)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Donut: status breakdown (completed vs pending vs ...)
export function StatusDonut({ data = [], height = 240 }) {
  const c = useChartColors();
  const colors = STATUS_COLOR(c);
  const total = data.reduce((n, d) => n + d.value, 0);
  if (!total) return <Empty text="No tasks yet" />;
  return (
    <div>
      <div className="relative" role="img" aria-label="Donut chart of tasks by status">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data.filter((d) => d.value)} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none">
              {data.filter((d) => d.value).map((d) => <Cell key={d.name} fill={colors[d.name]} />)}
            </Pie>
            <Tooltip content={<ChartTip colors={c} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{total}</span><span className="text-xs text-muted">tasks</span>
        </div>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[d.name] }} /><span className="text-muted">{d.name}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Horizontal bars: average progress per intern
export function PerformanceChart({ data = [] }) {
  const c = useChartColors();
  if (!data.length) return <Empty text="No intern performance data yet" />;
  const rows = data.map((d) => ({ name: d.intern.name, progress: d.avgProgress, completed: d.completed, total: d.total, onTime: d.onTimeRate }));
  return (
    <div role="img" aria-label="Bar chart of average progress per intern">
      <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 44)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={96} tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(n) => (n.length > 13 ? `${n.slice(0, 12)}...` : n)} />
          <Tooltip cursor={{ fill: c.grid, opacity: 0.4 }} content={({ active, payload }) => active && payload?.length ? (
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-pop">
              <p className="mb-1 font-medium text-foreground">{payload[0].payload.name}</p>
              <p className="text-muted">Avg progress: <b className="text-foreground">{payload[0].payload.progress}%</b></p>
              <p className="text-muted">Completed: <b className="text-foreground">{payload[0].payload.completed}/{payload[0].payload.total}</b></p>
              <p className="text-muted">On-time rate: <b className="text-foreground">{payload[0].payload.onTime}%</b></p>
            </div>) : null} />
          <Bar dataKey="progress" name="Avg progress" fill={c.primary} radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriorityChart({ data = [], height = 220 }) {
  const c = useChartColors();
  const colors = PRIORITY_COLOR(c);
  if (!data.length) return <Empty text="No tasks yet" />;
  return (
    <div role="img" aria-label="Bar chart of tasks by priority">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: c.grid, opacity: 0.4 }} content={<ChartTip colors={c} />} />
          <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]} barSize={36}>
            {data.map((d) => <Cell key={d.name} fill={colors[d.name]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

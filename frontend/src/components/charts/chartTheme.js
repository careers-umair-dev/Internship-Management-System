import { useTheme } from '../../context/ThemeContext';

const LIGHT = { primary: '#4f46e5', success: '#059669', warning: '#d97706', danger: '#dc2626', info: '#0284c7', muted: '#64748b', grid: '#e2e8f0', surface: '#ffffff', text: '#0f172a' };
const DARK = { primary: '#818cf8', success: '#34d399', warning: '#fbbf24', danger: '#f87171', info: '#38bdf8', muted: '#94a3b8', grid: '#282e3e', surface: '#11141d', text: '#f1f5f9' };

// Recharts needs concrete colours (not CSS variables), so resolve them from the active theme.
export const useChartColors = () => (useTheme().resolved === 'dark' ? DARK : LIGHT);

export const STATUS_COLOR = (c) => ({ Completed: c.success, 'In Progress': c.info, Pending: c.muted, Overdue: c.danger });
export const PRIORITY_COLOR = (c) => ({ Critical: c.danger, High: c.warning, Medium: c.info, Low: c.muted });

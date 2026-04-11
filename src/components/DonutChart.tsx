import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CATEGORY_COLORS, type Category } from '@/types/finance';

interface Props {
  data: Record<string, number>;
  title: string;
  total: number;
}

export function DonutChart({ data, title, total }: Props) {
  const entries = Object.entries(data)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const chartData = entries.map(([name, value]) => ({ name, value }));

  if (chartData.length === 0) {
    return (
      <div className="glass-card p-4 fade-in">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{title}</h3>
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No expenses yet
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 fade-in">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">{title}</h3>
      <div className="flex items-center gap-4">
        <div className="w-28 h-28 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={CATEGORY_COLORS[entry.name as Category] || 'hsl(220, 15%, 50%)'}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-foreground">
              ₹{total.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {entries.slice(0, 5).map(([cat, val]) => (
            <div key={cat} className="flex items-center gap-2 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[cat as Category] }}
              />
              <span className="text-secondary-foreground flex-1 truncate">{cat}</span>
              <span className="font-semibold text-foreground">₹{val.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

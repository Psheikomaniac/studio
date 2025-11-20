'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts';

interface PlayerSparklineProps {
  data: number[];
}

export function PlayerSparkline({ data }: PlayerSparklineProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  const max = Math.max(1, ...data);

  return (
    <div className="h-8 w-[110px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <XAxis dataKey="i" hide />
          <YAxis domain={[0, max]} hide />
          <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

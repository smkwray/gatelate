import type { AirportSnapshot } from "../types";

interface Props {
  data: AirportSnapshot[];
  title: string;
}

export default function Leaderboard({ data, title }: Props) {
  const sorted = [...data].sort((a, b) => a.rank - b.rank);
  const maxPct = Math.max(...sorted.map((d) => d.on_time_pct));

  return (
    <div className="leaderboard">
      <h3>{title}</h3>
      <div className="leaderboard-list">
        {sorted.map((d) => (
          <div key={d.airport_code} className="leaderboard-row">
            <span className="lb-rank">#{d.rank}</span>
            <span className="lb-code">{d.airport_code}</span>
            <span className="lb-name">{d.airport_name}</span>
            <div className="lb-bar-track">
              <div
                className="lb-bar-fill"
                style={{ width: `${(d.on_time_pct / maxPct) * 100}%` }}
              />
            </div>
            <span className="lb-pct">{d.on_time_pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

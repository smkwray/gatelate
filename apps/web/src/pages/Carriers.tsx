import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { loadCarrierMonthly } from "../data";
import SourceNote from "../components/SourceNote";
import type { CarrierMonthly } from "../types";

const COLORS = ["#7dd3fc", "#c4b5fd", "#86efac", "#fca5a5", "#fde68a", "#f0abfc", "#67e8f9", "#fdba74"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Carriers() {
  const [data, setData] = useState<CarrierMonthly[]>([]);
  const [view, setView] = useState<"trends" | "rankings">("trends");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  useEffect(() => {
    loadCarrierMonthly().then(setData);
  }, []);

  const allCodes = useMemo(
    () => [...new Set(data.map((d) => d.carrier))].sort(),
    [data]
  );

  const latestMonth = useMemo(() => {
    if (!data.length) return { year: 0, month: 0 };
    const maxYear = Math.max(...data.map((d) => d.year));
    const maxMonth = Math.max(...data.filter((d) => d.year === maxYear).map((d) => d.month));
    return { year: maxYear, month: maxMonth };
  }, [data]);

  const latestData = useMemo(
    () =>
      data
        .filter((d) => d.year === latestMonth.year && d.month === latestMonth.month)
        .sort((a, b) => b.on_time_pct - a.on_time_pct),
    [data, latestMonth]
  );

  const activeCodes = useMemo(() => {
    if (selectedCodes.length > 0) return selectedCodes;
    return latestData.slice(0, 5).map((d) => d.carrier);
  }, [latestData, selectedCodes]);

  const chartData = useMemo(() => {
    const months = [...new Set(data.map((d) => `${d.year}-${String(d.month).padStart(2, "0")}`))].sort();
    return months.map((key) => {
      const [y, m] = key.split("-").map(Number);
      const row: Record<string, number | string> = { date: key, label: `${MONTHS[m - 1]} ${y}` };
      for (const code of activeCodes) {
        const match = data.find((d) => d.year === y && d.month === m && d.carrier === code);
        if (match) row[code] = match.on_time_pct;
      }
      return row;
    });
  }, [data, activeCodes]);

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const periodLabel = latestMonth.year
    ? `Dec 2023\u2013${MONTHS[latestMonth.month - 1]} ${latestMonth.year}`
    : "";

  return (
    <div className="page">
      <header className="page-header">
        <h1>Carrier Performance</h1>
        <p className="lede">Per-airline on-time arrival trends and rankings from TranStats delay cause data.</p>
      </header>

      <div className="controls-row">
        <div className="segmented-control">
          <button className={view === "trends" ? "seg active" : "seg"} onClick={() => setView("trends")}>
            Trends
          </button>
          <button className={view === "rankings" ? "seg active" : "seg"} onClick={() => setView("rankings")}>
            Rankings
          </button>
        </div>
      </div>

      {view === "trends" && data.length > 0 && (
        <section className="chart-section">
          <h2 className="section-title">Compare carriers: on-time % over time</h2>

          <div className="airport-picker">
            {allCodes.map((code) => (
              <button
                key={code}
                className={`chip ${activeCodes.includes(code) ? "active" : ""}`}
                onClick={() => toggleCode(code)}
              >
                {code}
              </button>
            ))}
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis
                  dataKey="date"
                  stroke="#9fb0d6"
                  fontSize={10}
                  interval={Math.max(1, Math.floor(chartData.length / 12))}
                />
                <YAxis domain={[50, 100]} stroke="#9fb0d6" fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "#141d3a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12 }}
                  labelFormatter={(label: string) => {
                    const item = chartData.find((d) => d.date === label);
                    return item ? String(item.label) : label;
                  }}
                  formatter={(v: number, name: string) => {
                    const carrier = data.find((d) => d.carrier === name);
                    const displayName = carrier ? `${name} (${carrier.carrier_name})` : name;
                    return [`${v.toFixed(1)}%`, displayName];
                  }}
                />
                {activeCodes.map((code, i) => (
                  <Line
                    key={code}
                    type="monotone"
                    dataKey={code}
                    name={code}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <SourceNote period={periodLabel} table="TranStats: Airline Delay Cause Data" />
        </section>
      )}

      {view === "rankings" && latestData.length > 0 && (
        <section className="chart-section">
          <h2 className="section-title">
            Carrier rankings ({MONTHS[latestMonth.month - 1]} {latestMonth.year})
          </h2>

          <div className="chart-container" style={{ padding: 0, overflow: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Code</th>
                  <th>Carrier</th>
                  <th className="num">Flights</th>
                  <th className="num">On-time</th>
                  <th className="num">Late</th>
                  <th className="num">Cancelled</th>
                  <th className="num">Diverted</th>
                </tr>
              </thead>
              <tbody>
                {latestData.map((d, i) => (
                  <tr key={d.carrier}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 700, color: "var(--accent)" }}>{d.carrier}</td>
                    <td>{d.carrier_name}</td>
                    <td className="num">{d.flights.toLocaleString()}</td>
                    <td className="num" style={{ color: "var(--green)" }}>{d.on_time_pct}%</td>
                    <td className="num">{d.late_pct}%</td>
                    <td className="num">{d.cancelled_pct}%</td>
                    <td className="num">{d.diverted_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SourceNote
            period={`${MONTHS[latestMonth.month - 1]} ${latestMonth.year}`}
            table="TranStats: Airline Delay Cause Data"
          />
        </section>
      )}
    </div>
  );
}

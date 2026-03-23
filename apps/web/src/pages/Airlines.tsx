import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { loadAirlineYtd, loadAirlineMonthly } from "../data";
import SourceNote from "../components/SourceNote";
import YearRangeFilter from "../components/YearRangeFilter";
import type { AirlineYtd, AirlineMonthly } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Airlines() {
  const [ytd, setYtd] = useState<AirlineYtd[]>([]);
  const [monthly, setMonthly] = useState<AirlineMonthly[]>([]);
  const [view, setView] = useState<"trend" | "monthly">("trend");
  const [yearFrom, setYearFrom] = useState(1995);
  const [yearTo, setYearTo] = useState(2025);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      loadAirlineYtd().then((d) => {
        setYtd(d);
        if (d.length) {
          setYearFrom(d[0].year);
          setYearTo(d[d.length - 1].year);
        }
      }),
      loadAirlineMonthly().then(setMonthly),
    ])
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const filteredYtd = useMemo(
    () => ytd.filter((d) => d.year >= yearFrom && d.year <= yearTo),
    [ytd, yearFrom, yearTo]
  );

  const filteredMonthly = useMemo(
    () => monthly.filter((d) => d.year >= yearFrom && d.year <= yearTo),
    [monthly, yearFrom, yearTo]
  );

  const monthlyByDate = useMemo(
    () =>
      [...filteredMonthly]
        .sort((a, b) => a.year - b.year || a.month - b.month)
        .map((d) => ({
          ...d,
          label: `${MONTHS[d.month - 1]} ${d.year}`,
          date: `${d.year}-${String(d.month).padStart(2, "0")}`,
        })),
    [filteredMonthly]
  );

  const bestMonths = useMemo(
    () => [...filteredMonthly].sort((a, b) => b.pct_on_time_arrivals - a.pct_on_time_arrivals).slice(0, 10),
    [filteredMonthly]
  );
  const worstMonths = useMemo(
    () => [...filteredMonthly].sort((a, b) => a.pct_on_time_arrivals - b.pct_on_time_arrivals).slice(0, 10),
    [filteredMonthly]
  );

  const yearMin = ytd.length ? ytd[0].year : 1995;
  const yearMax = ytd.length ? ytd[ytd.length - 1].year : 2025;

  if (loading) return <div className="page"><p>Loading&hellip;</p></div>;
  if (error) return <div className="page"><p className="error">Failed to load data.</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Airline Performance</h1>
        <p className="lede">Year-to-date and monthly on-time arrival trends since 1995.</p>
      </header>

      <div className="controls-row">
        <div className="segmented-control">
          <button className={view === "trend" ? "seg active" : "seg"} onClick={() => setView("trend")}>
            Annual trend
          </button>
          <button className={view === "monthly" ? "seg active" : "seg"} onClick={() => setView("monthly")}>
            Best &amp; worst months
          </button>
        </div>
        <YearRangeFilter
          min={yearMin}
          max={yearMax}
          from={yearFrom}
          to={yearTo}
          onChange={(f, t) => { setYearFrom(f); setYearTo(t); }}
        />
      </div>

      {view === "trend" && filteredYtd.length > 0 && (
        <section className="chart-section">
          <h2 className="section-title">On-time arrival rate by year (YTD)</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={filteredYtd} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="year" stroke="#9fb0d6" fontSize={12} />
                <YAxis domain={[60, 95]} stroke="#9fb0d6" fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "#141d3a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12 }}
                  labelStyle={{ color: "#e5ecff" }}
                  formatter={(v: number) => [`${v}%`, "On-time arrivals"]}
                />
                <Line
                  type="monotone"
                  dataKey="pct_on_time_arrivals"
                  stroke="#7dd3fc"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#7dd3fc" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h2 className="section-title" style={{ marginTop: 36 }}>Scheduled flights by year</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={filteredYtd} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="year" stroke="#9fb0d6" fontSize={12} />
                <YAxis stroke="#9fb0d6" fontSize={12} tickFormatter={(v: number) => `${(v / 1e6).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{ background: "#141d3a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12 }}
                  formatter={(v: number) => [`${(v / 1e6).toFixed(2)}M`, "Flights"]}
                />
                <Bar dataKey="operations" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <SourceNote
            period={`${yearFrom}\u2013${yearTo} YTD`}
            table="Table 1A: Reporting Operating Carrier Summary"
          />
        </section>
      )}

      {view === "monthly" && filteredMonthly.length > 0 && (
        <section className="chart-section">
          <div className="grid two-col">
            <div>
              <h2 className="section-title">Best months (on-time arrivals)</h2>
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Month</th><th>On-time</th><th>Flights</th></tr>
                </thead>
                <tbody>
                  {bestMonths.map((d, i) => (
                    <tr key={`${d.year}-${d.month}`}>
                      <td>{i + 1}</td>
                      <td>{MONTHS[d.month - 1]} {d.year}</td>
                      <td className="num">{d.pct_on_time_arrivals}%</td>
                      <td className="num">{d.scheduled_flights.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h2 className="section-title">Worst months (on-time arrivals)</h2>
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Month</th><th>On-time</th><th>Flights</th></tr>
                </thead>
                <tbody>
                  {worstMonths.map((d, i) => (
                    <tr key={`${d.year}-${d.month}`}>
                      <td>{i + 1}</td>
                      <td>{MONTHS[d.month - 1]} {d.year}</td>
                      <td className="num">{d.pct_on_time_arrivals}%</td>
                      <td className="num">{d.scheduled_flights.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <h2 className="section-title" style={{ marginTop: 36 }}>Monthly on-time rate (chronological)</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyByDate} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="date" stroke="#9fb0d6" fontSize={10} interval={Math.max(1, Math.floor(monthlyByDate.length / 15))} />
                <YAxis domain={[50, 100]} stroke="#9fb0d6" fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "#141d3a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12 }}
                  labelFormatter={(label: string) => {
                    const item = monthlyByDate.find((d) => d.date === label);
                    return item ? item.label : label;
                  }}
                  formatter={(v: number) => [`${v}%`, "On-time arrivals"]}
                />
                <Line type="monotone" dataKey="pct_on_time_arrivals" stroke="#7dd3fc" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <SourceNote
            period={`Monthly ${yearFrom}\u2013${yearTo}`}
            table="Table 2A: Ranking by Month Since 1995"
          />
        </section>
      )}
    </div>
  );
}

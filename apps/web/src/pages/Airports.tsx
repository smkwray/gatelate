import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  loadAirportArrivalMonth,
  loadAirportArrivalYtd,
  loadAirportArrivalAnnual,
  loadAirportDepartureMonth,
  loadAirportDepartureYtd,
  loadAirportDepartureAnnual,
  loadDataMeta,
} from "../data";
import Leaderboard from "../components/Leaderboard";
import SourceNote from "../components/SourceNote";
import type { AirportSnapshot, AirportAnnual, DataMeta } from "../types";

const COLORS = ["#7dd3fc", "#c4b5fd", "#86efac", "#fca5a5", "#fde68a", "#f0abfc", "#67e8f9", "#fdba74"];

export default function Airports() {
  const [direction, setDirection] = useState<"arrival" | "departure">("arrival");
  const [period, setPeriod] = useState<"month" | "ytd" | "annual">("month");
  const [search, setSearch] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  const [arrMonth, setArrMonth] = useState<AirportSnapshot[]>([]);
  const [arrYtd, setArrYtd] = useState<AirportSnapshot[]>([]);
  const [arrAnnual, setArrAnnual] = useState<AirportAnnual[]>([]);
  const [depMonth, setDepMonth] = useState<AirportSnapshot[]>([]);
  const [depYtd, setDepYtd] = useState<AirportSnapshot[]>([]);
  const [depAnnual, setDepAnnual] = useState<AirportAnnual[]>([]);
  const [meta, setMeta] = useState<DataMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      loadAirportArrivalMonth().then(setArrMonth),
      loadAirportArrivalYtd().then(setArrYtd),
      loadAirportArrivalAnnual().then(setArrAnnual),
      loadAirportDepartureMonth().then(setDepMonth),
      loadAirportDepartureYtd().then(setDepYtd),
      loadAirportDepartureAnnual().then(setDepAnnual),
      loadDataMeta().then(setMeta),
    ])
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const snapshotData = direction === "arrival"
    ? (period === "month" ? arrMonth : arrYtd)
    : (period === "month" ? depMonth : depYtd);

  const annualData = direction === "arrival" ? arrAnnual : depAnnual;

  const filteredSnapshot = useMemo(() => {
    if (!search) return snapshotData;
    const q = search.toLowerCase();
    return snapshotData.filter(
      (d) => d.airport_code.toLowerCase().includes(q) || d.airport_name.toLowerCase().includes(q)
    );
  }, [snapshotData, search]);

  // All unique airport codes in annual data
  const allCodes = useMemo(
    () => [...new Set(annualData.map((d) => d.airport_code))].sort(),
    [annualData]
  );

  // Default to top 5 of latest year if nothing selected
  const latestYear = useMemo(() => Math.max(0, ...annualData.map((d) => d.year)), [annualData]);
  const activeCodes = useMemo(() => {
    if (selectedCodes.length > 0) return selectedCodes;
    return annualData
      .filter((d) => d.year === latestYear && d.rank <= 5)
      .map((d) => d.airport_code);
  }, [annualData, latestYear, selectedCodes]);

  const annualChartData = useMemo(() => {
    const years = [...new Set(annualData.map((d) => d.year))].sort();
    return years.map((y) => {
      const row: Record<string, number> = { year: y };
      for (const code of activeCodes) {
        const match = annualData.find((d) => d.year === y && d.airport_code === code);
        if (match) row[code] = match.on_time_pct;
      }
      return row;
    });
  }, [annualData, activeCodes]);

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const tableLabel = direction === "arrival"
    ? (period === "month" ? "Table 3" : period === "ytd" ? "Table 4 (snapshot)" : "Table 4 (annual)")
    : (period === "month" ? "Table 5" : period === "ytd" ? "Table 6 (snapshot)" : "Table 6 (annual)");

  const periodLabel = period === "month"
    ? (meta?.report_month_label ?? "")
    : period === "ytd"
    ? (meta?.report_ytd_label ?? "")
    : `${meta?.bts_airport_annual_start ?? 2004}\u2013${latestYear}`;

  if (loading) return <div className="page"><p>Loading&hellip;</p></div>;
  if (error) return <div className="page"><p className="error">Failed to load data.</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Airport Performance</h1>
        <p className="lede">Major airport on-time rankings by arrivals and departures.</p>
      </header>

      <div className="controls-row">
        <div className="segmented-control">
          <button className={direction === "arrival" ? "seg active" : "seg"} onClick={() => setDirection("arrival")}>
            Arrivals
          </button>
          <button className={direction === "departure" ? "seg active" : "seg"} onClick={() => setDirection("departure")}>
            Departures
          </button>
        </div>

        <div className="segmented-control">
          <button className={period === "month" ? "seg active" : "seg"} onClick={() => setPeriod("month")}>
            Current month
          </button>
          <button className={period === "ytd" ? "seg active" : "seg"} onClick={() => setPeriod("ytd")}>
            Year-to-date
          </button>
          <button className={period === "annual" ? "seg active" : "seg"} onClick={() => setPeriod("annual")}>
            Annual history
          </button>
        </div>
      </div>

      {(period === "month" || period === "ytd") && (
        <>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search airports (code or city)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredSnapshot.length > 0 && (
            <section className="chart-section">
              <Leaderboard
                data={filteredSnapshot}
                title={`${direction === "arrival" ? "Arrival" : "Departure"} on-time ranking (${periodLabel})`}
              />

              <h2 className="section-title" style={{ marginTop: 28 }}>On-time percentage by airport</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={Math.max(400, filteredSnapshot.length * 22)}>
                  <BarChart
                    data={[...filteredSnapshot].sort((a, b) => b.on_time_pct - a.on_time_pct)}
                    layout="vertical"
                    margin={{ top: 10, right: 30, bottom: 10, left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                    <XAxis type="number" domain={[60, 90]} stroke="#9fb0d6" fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                    <YAxis type="category" dataKey="airport_code" stroke="#9fb0d6" fontSize={11} width={50} />
                    <Tooltip
                      contentStyle={{ background: "#141d3a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12 }}
                      formatter={(v: number) => [`${v.toFixed(1)}%`, "On-time"]}
                      labelFormatter={(code: string) => {
                        const match = filteredSnapshot.find((d) => d.airport_code === code);
                        return match ? `${match.airport_name} (${code})` : code;
                      }}
                    />
                    <Bar dataKey="on_time_pct" fill="#7dd3fc" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <SourceNote period={periodLabel} table={tableLabel} />
            </section>
          )}
        </>
      )}

      {period === "annual" && annualData.length > 0 && (
        <section className="chart-section">
          <h2 className="section-title">
            Compare airports: {direction} on-time % over time
          </h2>

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
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={annualChartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="year" stroke="#9fb0d6" fontSize={12} />
                <YAxis domain={[60, 90]} stroke="#9fb0d6" fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "#141d3a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12 }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`]}
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

          <h2 className="section-title" style={{ marginTop: 28 }}>Latest year rankings ({latestYear})</h2>
          <Leaderboard
            data={annualData
              .filter((d) => d.year === latestYear)
              .map((d) => ({ ...d, period: String(d.year), period_type: "annual" }))}
            title={`${direction === "arrival" ? "Arrival" : "Departure"} on-time ranking (${latestYear})`}
          />

          <SourceNote period={periodLabel} table={tableLabel} />
        </section>
      )}
    </div>
  );
}

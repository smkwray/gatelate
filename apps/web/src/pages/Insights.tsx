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
  ScatterChart,
  Scatter,
  Cell,
  ZAxis,
} from "recharts";
import {
  loadCarrierSeasonal,
  loadCarrierDelayCauses,
  loadCarrierSizeReliability,
  loadAirportCarrierMatrix,
  loadDataMeta,
} from "../data";
import SourceNote from "../components/SourceNote";
import type {
  CarrierSeasonal,
  CarrierDelayCauses,
  CarrierSizeReliability,
  AirportCarrierMatrix,
  DataMeta,
} from "../types";

const COLORS = ["#7dd3fc", "#c4b5fd", "#86efac", "#fca5a5", "#fde68a", "#f0abfc", "#67e8f9", "#fdba74"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type View = "seasonal" | "causes" | "scatter" | "matrix";

export default function Insights() {
  const [view, setView] = useState<View>("seasonal");
  const [seasonal, setSeasonal] = useState<CarrierSeasonal[]>([]);
  const [causes, setCauses] = useState<CarrierDelayCauses[]>([]);
  const [scatter, setScatter] = useState<CarrierSizeReliability[]>([]);
  const [matrix, setMatrix] = useState<AirportCarrierMatrix[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [matrixAirport, setMatrixAirport] = useState("");
  const [matrixCarrier, setMatrixCarrier] = useState("");
  const [matrixMode, setMatrixMode] = useState<"by-airport" | "by-carrier">("by-airport");
  const [matrixSearch, setMatrixSearch] = useState("");
  const [meta, setMeta] = useState<DataMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      loadCarrierSeasonal().then(setSeasonal),
      loadCarrierDelayCauses().then(setCauses),
      loadCarrierSizeReliability().then(setScatter),
      loadAirportCarrierMatrix().then(setMatrix),
      loadDataMeta().then(setMeta),
    ])
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  // --- Seasonal ---
  const seasonalCodes = useMemo(
    () => [...new Set(seasonal.map((d) => d.carrier))].sort(),
    [seasonal]
  );

  const activeSeasonalCodes = useMemo(() => {
    if (selectedCodes.length > 0) return selectedCodes;
    // Default: top 5 major carriers by name recognition
    const majors = ["AA", "DL", "UA", "WN", "B6"];
    return majors.filter((c) => seasonalCodes.includes(c));
  }, [selectedCodes, seasonalCodes]);

  const seasonalChart = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const row: Record<string, number | string> = { month, label: MONTHS[i] };
      for (const code of activeSeasonalCodes) {
        const match = seasonal.find((d) => d.carrier === code && d.month === month);
        if (match) row[code] = match.avg_on_time_pct;
      }
      return row;
    });
  }, [seasonal, activeSeasonalCodes]);

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // --- Delay causes ---
  const sortedCauses = useMemo(
    () => [...causes].sort((a, b) => b.controllable_delay_pct - a.controllable_delay_pct),
    [causes]
  );

  // --- Matrix ---
  // Major airports (the ~30 BTS-tracked ones) for chip display
  const MAJOR_AIRPORTS = [
    "ATL", "ORD", "DFW", "DEN", "LAX", "JFK", "SFO", "SEA", "LAS", "MCO",
    "EWR", "MSP", "DTW", "BOS", "PHL", "LGA", "FLL", "BWI", "IAD", "DCA",
    "SAN", "TPA", "PDX", "SLC", "IAH", "CLT", "PHX", "MDW", "MIA", "HNL",
  ];

  const matrixAirports = useMemo(
    () => [...new Set(matrix.map((d) => d.airport))].sort(),
    [matrix]
  );

  const majorAirportsInData = useMemo(
    () => MAJOR_AIRPORTS.filter((c) => matrixAirports.includes(c)),
    [matrixAirports]
  );

  const filteredMatrixAirports = useMemo(() => {
    if (!matrixSearch) return [];
    const q = matrixSearch.toLowerCase();
    return matrixAirports.filter((code) => {
      const match = matrix.find((d) => d.airport === code);
      const name = match?.airport_name || "";
      return code.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    }).slice(0, 20);
  }, [matrixAirports, matrixSearch, matrix]);

  const selectedAirport = matrixAirport || (majorAirportsInData.length > 0 ? majorAirportsInData[0] : "");

  const matrixForAirport = useMemo(
    () =>
      matrix
        .filter((d) => d.airport === selectedAirport)
        .sort((a, b) => b.on_time_pct - a.on_time_pct),
    [matrix, selectedAirport]
  );

  // Carrier-centric: all unique carriers in matrix
  const matrixCarriers = useMemo(
    () => [...new Set(matrix.map((d) => d.carrier))].sort(),
    [matrix]
  );

  const selectedCarrier = matrixCarrier || (matrixCarriers.length > 0 ? matrixCarriers[0] : "");

  const matrixForCarrier = useMemo(
    () =>
      matrix
        .filter((d) => d.carrier === selectedCarrier)
        .sort((a, b) => b.on_time_pct - a.on_time_pct),
    [matrix, selectedCarrier]
  );

  if (loading) return <div className="page"><p>Loading&hellip;</p></div>;
  if (error) return <div className="page"><p className="error">Failed to load data.</p></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Insights</h1>
        <p className="lede">Deeper analyses: seasonal patterns, delay causes, size vs reliability, and airport-carrier breakdowns.</p>
      </header>

      <div className="controls-row">
        <div className="segmented-control">
          {([
            ["seasonal", "Seasonal"],
            ["causes", "Delay causes"],
            ["scatter", "Size vs reliability"],
            ["matrix", "Airport \u00d7 carrier"],
          ] as [View, string][]).map(([v, label]) => (
            <button key={v} className={view === v ? "seg active" : "seg"} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Seasonal patterns ─── */}
      {view === "seasonal" && seasonal.length > 0 && (
        <section className="chart-section">
          <h2 className="section-title">Seasonal on-time patterns by carrier</h2>
          <p className="lede" style={{ marginTop: -8, marginBottom: 16 }}>
            Average on-time % by calendar month across all available years. Summer and holiday months typically degrade.
          </p>

          <div className="airport-picker">
            {seasonalCodes.map((code) => (
              <button
                key={code}
                className={`chip ${activeSeasonalCodes.includes(code) ? "active" : ""}`}
                onClick={() => toggleCode(code)}
              >
                {code}
              </button>
            ))}
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={seasonalChart} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="label" stroke="#9fb0d6" fontSize={12} />
                <YAxis domain={[55, 95]} stroke="#9fb0d6" fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "#141d3a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12 }}
                  formatter={(v: number, name: string) => {
                    const c = seasonal.find((d) => d.carrier === name);
                    return [`${v.toFixed(1)}%`, c ? `${name} (${c.carrier_name})` : name];
                  }}
                />
                {activeSeasonalCodes.map((code, i) => (
                  <Line key={code} type="monotone" dataKey={code} name={code} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <SourceNote period={`${meta?.transtats_range_label ?? "\u2026"} (averaged)`} table="TranStats: Airline Delay Cause Data" />
        </section>
      )}

      {/* ─── Delay causes ─── */}
      {view === "causes" && causes.length > 0 && (
        <section className="chart-section">
          <h2 className="section-title">Controllable vs uncontrollable delays</h2>
          <p className="lede" style={{ marginTop: -8, marginBottom: 16 }}>
            "Controllable" = carrier-caused + late aircraft. Weather, NAS, and security are largely outside carrier control.
          </p>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={Math.max(400, sortedCauses.length * 28)}>
              <BarChart
                data={sortedCauses}
                layout="vertical"
                margin={{ top: 10, right: 30, bottom: 10, left: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis type="number" domain={[0, 100]} stroke="#9fb0d6" fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                <YAxis type="category" dataKey="carrier" stroke="#9fb0d6" fontSize={11} width={36} />
                <Tooltip
                  contentStyle={{ background: "#141d3a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12 }}
                  formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                  labelFormatter={(carrier: string) => {
                    const match = sortedCauses.find((d) => d.carrier === carrier);
                    return match ? `${carrier} (${match.carrier_name})` : carrier;
                  }}
                />
                <Bar dataKey="carrier_delay_pct" name="Carrier" stackId="a" fill="#fca5a5" />
                <Bar dataKey="late_aircraft_delay_pct" name="Late aircraft" stackId="a" fill="#fdba74" />
                <Bar dataKey="weather_delay_pct" name="Weather" stackId="a" fill="#7dd3fc" />
                <Bar dataKey="nas_delay_pct" name="NAS" stackId="a" fill="#c4b5fd" />
                <Bar dataKey="security_delay_pct" name="Security" stackId="a" fill="#86efac" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container" style={{ padding: 0, overflow: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Carrier</th>
                  <th>Name</th>
                  <th className="num">Controllable</th>
                  <th className="num">Weather</th>
                  <th className="num">NAS</th>
                  <th className="num">Security</th>
                </tr>
              </thead>
              <tbody>
                {sortedCauses.map((d) => (
                  <tr key={d.carrier}>
                    <td style={{ fontWeight: 700, color: "var(--accent)" }}>{d.carrier}</td>
                    <td>{d.carrier_name}</td>
                    <td className="num" style={{ color: d.controllable_delay_pct > 70 ? "var(--red)" : "var(--text)" }}>
                      {d.controllable_delay_pct.toFixed(1)}%
                    </td>
                    <td className="num">{d.weather_delay_pct.toFixed(1)}%</td>
                    <td className="num">{d.nas_delay_pct.toFixed(1)}%</td>
                    <td className="num">{d.security_delay_pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SourceNote period={meta?.transtats_range_label ?? "\u2026"} table="TranStats: Airline Delay Cause Data" />
        </section>
      )}

      {/* ─── Size vs reliability scatter ─── */}
      {view === "scatter" && scatter.length > 0 && (
        <section className="chart-section">
          <h2 className="section-title">Size vs reliability (latest month)</h2>
          <p className="lede" style={{ marginTop: -8, marginBottom: 16 }}>
            Do smaller carriers look better because they fly easier routes? Each dot is one carrier.
          </p>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={420}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis
                  type="number"
                  dataKey="flights"
                  name="Flights"
                  stroke="#9fb0d6"
                  fontSize={12}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                  label={{ value: "Monthly flights", position: "bottom", offset: 0, fill: "#9fb0d6", fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="on_time_pct"
                  name="On-time %"
                  domain={[60, 95]}
                  stroke="#9fb0d6"
                  fontSize={12}
                  tickFormatter={(v: number) => `${v}%`}
                  label={{ value: "On-time %", angle: -90, position: "insideLeft", fill: "#9fb0d6", fontSize: 12 }}
                />
                <ZAxis range={[80, 300]} />
                <Tooltip
                  contentStyle={{ background: "#141d3a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12 }}
                  formatter={(v: number, name: string) => {
                    if (name === "Flights") return [v.toLocaleString(), name];
                    return [`${v.toFixed(1)}%`, name];
                  }}
                  labelFormatter={(_: unknown, payload: Array<{ payload?: CarrierSizeReliability }>) => {
                    const d = payload?.[0]?.payload;
                    return d ? `${d.carrier} (${d.carrier_name})` : "";
                  }}
                />
                <Scatter data={scatter}>
                  {scatter.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container" style={{ padding: 0, overflow: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Carrier</th>
                  <th>Name</th>
                  <th className="num">Flights</th>
                  <th className="num">On-time %</th>
                </tr>
              </thead>
              <tbody>
                {[...scatter].sort((a, b) => b.flights - a.flights).map((d) => (
                  <tr key={d.carrier}>
                    <td style={{ fontWeight: 700, color: "var(--accent)" }}>{d.carrier}</td>
                    <td>{d.carrier_name}</td>
                    <td className="num">{d.flights.toLocaleString()}</td>
                    <td className="num" style={{ color: "var(--green)" }}>{d.on_time_pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SourceNote period={meta?.report_month_short ?? "\u2026"} table="TranStats: Airline Delay Cause Data" />
        </section>
      )}

      {/* ─── Airport × carrier matrix ─── */}
      {view === "matrix" && matrix.length > 0 && (
        <section className="chart-section">
          <h2 className="section-title">Airport &times; carrier breakdown</h2>
          <p className="lede" style={{ marginTop: -8, marginBottom: 16 }}>
            {matrixMode === "by-airport"
              ? "Pick an airport to see which carriers are most reliable there."
              : "Pick a carrier to see where they perform best and worst."}
            {" "}Only pairs with 100+ flights shown.
          </p>

          <div className="controls-row">
            <div className="segmented-control">
              <button className={matrixMode === "by-airport" ? "seg active" : "seg"} onClick={() => setMatrixMode("by-airport")}>
                By airport
              </button>
              <button className={matrixMode === "by-carrier" ? "seg active" : "seg"} onClick={() => setMatrixMode("by-carrier")}>
                By carrier
              </button>
            </div>
          </div>

          {matrixMode === "by-airport" && (
            <>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search airports (code or city)..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                />
              </div>

              {matrixSearch && filteredMatrixAirports.length > 0 && (
                <div className="airport-picker" style={{ marginBottom: 12 }}>
                  {filteredMatrixAirports.map((code) => (
                    <button
                      key={code}
                      className={`chip ${selectedAirport === code ? "active" : ""}`}
                      onClick={() => { setMatrixAirport(code); setMatrixSearch(""); }}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}

              <div className="airport-picker">
                {majorAirportsInData.map((code) => (
                  <button
                    key={code}
                    className={`chip ${selectedAirport === code ? "active" : ""}`}
                    onClick={() => setMatrixAirport(code)}
                  >
                    {code}
                  </button>
                ))}
              </div>

              {matrixForAirport.length > 0 && (
                <>
                  <h2 className="section-title" style={{ marginTop: 16 }}>
                    Carriers at {selectedAirport}
                    {(() => { const m = matrix.find((d) => d.airport === selectedAirport); return m ? ` \u2014 ${m.airport_name}` : ""; })()}
                  </h2>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={Math.max(250, matrixForAirport.length * 32)}>
                      <BarChart data={matrixForAirport} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis type="number" domain={[50, 95]} stroke="#9fb0d6" fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                        <YAxis type="category" dataKey="carrier" stroke="#9fb0d6" fontSize={11} width={36} />
                        <Tooltip
                          contentStyle={{ background: "#141d3a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12 }}
                          formatter={(v: number) => [`${v.toFixed(1)}%`, "On-time"]}
                          labelFormatter={(carrier: string) => {
                            const match = matrixForAirport.find((d) => d.carrier === carrier);
                            return match ? `${carrier} (${match.carrier_name})` : carrier;
                          }}
                        />
                        <Bar dataKey="on_time_pct" fill="#7dd3fc" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-container" style={{ padding: 0, overflow: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>#</th><th>Carrier</th><th>Name</th><th className="num">Flights</th><th className="num">On-time %</th></tr>
                      </thead>
                      <tbody>
                        {matrixForAirport.map((d, i) => (
                          <tr key={d.carrier}>
                            <td>{i + 1}</td>
                            <td style={{ fontWeight: 700, color: "var(--accent)" }}>{d.carrier}</td>
                            <td>{d.carrier_name}</td>
                            <td className="num">{d.flights.toLocaleString()}</td>
                            <td className="num" style={{ color: "var(--green)" }}>{d.on_time_pct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {matrixMode === "by-carrier" && (
            <>
              <div className="airport-picker">
                {matrixCarriers.map((code) => (
                  <button
                    key={code}
                    className={`chip ${selectedCarrier === code ? "active" : ""}`}
                    onClick={() => setMatrixCarrier(code)}
                  >
                    {code}
                  </button>
                ))}
              </div>

              {matrixForCarrier.length > 0 && (
                <>
                  <h2 className="section-title" style={{ marginTop: 16 }}>
                    {selectedCarrier} performance by airport
                    {(() => { const m = matrix.find((d) => d.carrier === selectedCarrier); return m ? ` \u2014 ${m.carrier_name}` : ""; })()}
                  </h2>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={Math.max(300, matrixForCarrier.length * 26)}>
                      <BarChart data={matrixForCarrier} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis type="number" domain={[50, 95]} stroke="#9fb0d6" fontSize={12} tickFormatter={(v: number) => `${v}%`} />
                        <YAxis type="category" dataKey="airport" stroke="#9fb0d6" fontSize={11} width={42} />
                        <Tooltip
                          contentStyle={{ background: "#141d3a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12 }}
                          formatter={(v: number) => [`${v.toFixed(1)}%`, "On-time"]}
                          labelFormatter={(airport: string) => {
                            const match = matrixForCarrier.find((d) => d.airport === airport);
                            return match ? `${airport} \u2014 ${match.airport_name}` : airport;
                          }}
                        />
                        <Bar dataKey="on_time_pct" fill="#c4b5fd" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-container" style={{ padding: 0, overflow: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>#</th><th>Airport</th><th>Name</th><th className="num">Flights</th><th className="num">On-time %</th></tr>
                      </thead>
                      <tbody>
                        {matrixForCarrier.map((d, i) => (
                          <tr key={d.airport}>
                            <td>{i + 1}</td>
                            <td style={{ fontWeight: 700, color: "var(--accent)" }}>{d.airport}</td>
                            <td>{d.airport_name}</td>
                            <td className="num">{d.flights.toLocaleString()}</td>
                            <td className="num" style={{ color: "var(--green)" }}>{d.on_time_pct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          <SourceNote period={meta?.report_month_short ?? "\u2026"} table="TranStats: Airline Delay Cause Data" />
        </section>
      )}
    </div>
  );
}

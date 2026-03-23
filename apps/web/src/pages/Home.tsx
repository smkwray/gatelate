import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadAirlineYtd, loadAirportArrivalMonth, loadCarrierMonthly } from "../data";
import type { AirlineYtd, AirportSnapshot, CarrierMonthly } from "../types";

export default function Home() {
  const [ytd, setYtd] = useState<AirlineYtd[]>([]);
  const [topAirports, setTopAirports] = useState<AirportSnapshot[]>([]);
  const [carriers, setCarriers] = useState<CarrierMonthly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      loadAirlineYtd().then(setYtd),
      loadAirportArrivalMonth().then((d) => setTopAirports(d.slice(0, 5))),
      loadCarrierMonthly().then(setCarriers),
    ])
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const latest = ytd.length ? ytd[ytd.length - 1] : null;
  const prev = ytd.length > 1 ? ytd[ytd.length - 2] : null;

  // Latest month carrier stats
  const latestCarriers = (() => {
    if (!carriers.length) return [];
    const maxYear = Math.max(...carriers.map((d) => d.year));
    const maxMonth = Math.max(...carriers.filter((d) => d.year === maxYear).map((d) => d.month));
    return carriers
      .filter((d) => d.year === maxYear && d.month === maxMonth)
      .sort((a, b) => b.on_time_pct - a.on_time_pct);
  })();

  const topCarrier = latestCarriers[0];
  const bottomCarrier = latestCarriers[latestCarriers.length - 1];
  const biggestCarrier = latestCarriers.length
    ? [...latestCarriers].sort((a, b) => b.flights - a.flights)[0]
    : null;

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const carrierMonthLabel = topCarrier
    ? `${MONTHS[topCarrier.month - 1]} ${topCarrier.year}`
    : "";

  if (loading) return <div className="page"><p>Loading&hellip;</p></div>;
  if (error) return <div className="page"><p className="error">Failed to load data.</p></div>;

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Flight Reliability Explorer</p>
        <h1>How reliable is U.S. air travel?</h1>
        <p className="lede">
          Official BTS on-time performance data for airlines and major airports.
          Updated monthly. Not a live flight tracker.
        </p>
        <div className="hero-actions">
          <Link className="button" to="/airlines">Airline trends</Link>
          <Link className="button ghost" to="/airports">Airport rankings</Link>
          <Link className="button ghost" to="/carriers">Carrier explorer</Link>
        </div>
      </header>

      {latest && (
        <div className="grid" style={{ marginTop: 28 }}>
          <article className="card stat-card">
            <span className="stat-label">On-time arrivals ({latest.year} YTD)</span>
            <span className="stat-value">{latest.pct_on_time_arrivals}%</span>
            {prev && (
              <span className="stat-delta">
                {latest.pct_on_time_arrivals > prev.pct_on_time_arrivals ? "+" : ""}
                {(latest.pct_on_time_arrivals - prev.pct_on_time_arrivals).toFixed(2)} vs {prev.year}
              </span>
            )}
          </article>
          <article className="card stat-card">
            <span className="stat-label">Scheduled flights ({latest.year} YTD)</span>
            <span className="stat-value">{(latest.operations / 1e6).toFixed(1)}M</span>
          </article>
          {topCarrier && (
            <article className="card stat-card">
              <span className="stat-label">Best carrier ({carrierMonthLabel})</span>
              <span className="stat-value">{topCarrier.on_time_pct}%</span>
              <span className="stat-delta">{topCarrier.carrier} ({topCarrier.carrier_name})</span>
            </article>
          )}
          {biggestCarrier && (
            <article className="card stat-card">
              <span className="stat-label">Busiest carrier ({carrierMonthLabel})</span>
              <span className="stat-value">{(biggestCarrier.flights / 1e3).toFixed(0)}K</span>
              <span className="stat-delta">{biggestCarrier.carrier} &mdash; {biggestCarrier.on_time_pct}% on-time</span>
            </article>
          )}
        </div>
      )}

      <div className="grid two-col" style={{ marginTop: 28 }}>
        {topAirports.length > 0 && (
          <section>
            <h2 className="section-title">Top 5 airports ({carrierMonthLabel || "latest"})</h2>
            <div className="mini-leaderboard">
              {topAirports.map((a) => (
                <div key={a.airport_code} className="mini-lb-row">
                  <span className="lb-rank">#{a.rank}</span>
                  <span className="lb-code">{a.airport_code}</span>
                  <span className="lb-name">{a.airport_name}</span>
                  <span className="lb-pct">{a.on_time_pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <Link className="view-all-link" to="/airports">View all airports &rarr;</Link>
          </section>
        )}

        {latestCarriers.length > 0 && (
          <section>
            <h2 className="section-title">Top 5 carriers ({carrierMonthLabel || "latest"})</h2>
            <div className="mini-leaderboard">
              {latestCarriers.slice(0, 5).map((c, i) => (
                <div key={c.carrier} className="mini-lb-row">
                  <span className="lb-rank">#{i + 1}</span>
                  <span className="lb-code">{c.carrier}</span>
                  <span className="lb-name">{c.carrier_name}</span>
                  <span className="lb-pct">{c.on_time_pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <Link className="view-all-link" to="/carriers">View all carriers &rarr;</Link>
          </section>
        )}
      </div>

      {bottomCarrier && (
        <div className="grid" style={{ marginTop: 20 }}>
          <article className="card stat-card">
            <span className="stat-label">Cancelled ({latest?.year} YTD)</span>
            <span className="stat-value">{latest?.pct_cancelled}%</span>
          </article>
          <article className="card stat-card">
            <span className="stat-label">Diverted ({latest?.year} YTD)</span>
            <span className="stat-value">{latest?.pct_diverted}%</span>
          </article>
          <article className="card stat-card">
            <span className="stat-label">Worst carrier ({carrierMonthLabel})</span>
            <span className="stat-value" style={{ color: "var(--red)" }}>{bottomCarrier.on_time_pct}%</span>
            <span className="stat-delta" style={{ color: "var(--muted)" }}>{bottomCarrier.carrier} ({bottomCarrier.carrier_name})</span>
          </article>
          <article className="card stat-card">
            <span className="stat-label">Reporting carriers</span>
            <span className="stat-value">{latestCarriers.length}</span>
            <span className="stat-delta">
              <Link to="/insights" style={{ color: "var(--accent)" }}>Explore insights &rarr;</Link>
            </span>
          </article>
        </div>
      )}

      <footer className="home-footer">
        <p>
          Data sourced from the Bureau of Transportation Statistics (BTS) summary workbooks
          and TranStats delay cause data. This is a monthly-updating reliability explorer, not a live tracking tool.
        </p>
      </footer>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadDataMeta } from "../data";
import type { DataMeta } from "../types";

export default function Footer() {
  const [meta, setMeta] = useState<DataMeta | null>(null);

  useEffect(() => {
    loadDataMeta().then(setMeta).catch(() => {});
  }, []);

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-col">
          <span className="footer-brand">GateLate</span>
          <p>
            A monthly-updating flight reliability explorer.
            Not a live flight tracker.
          </p>
        </div>
        <div className="footer-col">
          <h4>Data</h4>
          <p>
            Source: Bureau of Transportation Statistics (BTS).
            Latest data covers through {meta?.report_month_label ?? "\u2026"}.
            BTS publishes updates ~2 months after the reporting period.
          </p>
        </div>
        <div className="footer-col">
          <h4>Pages</h4>
          <nav className="footer-nav">
            <Link to="/">Overview</Link>
            <Link to="/airlines">Airlines</Link>
            <Link to="/airports">Airports</Link>
            <Link to="/methodology">Methodology</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

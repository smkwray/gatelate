export default function Methodology() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Methodology</h1>
        <p className="lede">How this data is collected, what it covers, and what it doesn't.</p>
      </header>

      <section className="prose-section">
        <h2>Data source</h2>
        <p>
          All data comes from the <strong>Bureau of Transportation Statistics (BTS)</strong>,
          an agency of the U.S. Department of Transportation. BTS publishes official summary
          workbooks covering airline and major airport on-time performance.
        </p>

        <h2>What "on-time" means</h2>
        <p>
          A flight is considered <strong>on-time</strong> if it arrives at or departs from
          the gate within <strong>15 minutes</strong> of its scheduled time. This is the
          standard definition used by the DOT for reporting purposes.
        </p>

        <h2>Tables used</h2>
        <table className="data-table">
          <thead>
            <tr><th>Table</th><th>Description</th><th>Granularity</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Table 1A</td>
              <td>Year-to-date airline performance summary</td>
              <td>Annual, 1995 &ndash; present</td>
            </tr>
            <tr>
              <td>Table 2A</td>
              <td>Monthly airline ranking by on-time arrivals</td>
              <td>Monthly, 1995 &ndash; present</td>
            </tr>
            <tr>
              <td>Table 3</td>
              <td>Major airport arrival ranking (current month)</td>
              <td>Monthly snapshot</td>
            </tr>
            <tr>
              <td>Table 4</td>
              <td>Major airport arrival ranking (YTD + annual history)</td>
              <td>YTD snapshot + annual 2004 &ndash; 2024</td>
            </tr>
            <tr>
              <td>Table 5</td>
              <td>Major airport departure ranking (current month)</td>
              <td>Monthly snapshot</td>
            </tr>
            <tr>
              <td>Table 6</td>
              <td>Major airport departure ranking (YTD + annual history)</td>
              <td>YTD snapshot + annual 2004 &ndash; 2024</td>
            </tr>
          </tbody>
        </table>

        <h2>Update cadence</h2>
        <p>
          BTS typically publishes these workbooks approximately <strong>two months</strong> after
          the reporting period. For example, November 2025 data was published in late January 2026.
          This site reflects the latest available workbooks at the time of build.
        </p>

        <h2>What this is not</h2>
        <ul>
          <li>This is <strong>not</strong> a live flight tracker or real-time delay monitor.</li>
          <li>This does <strong>not</strong> cover individual routes or flight numbers.</li>
          <li>This does <strong>not</strong> include every U.S. airport &mdash; only the ~30 major airports tracked by BTS in their summary tables.</li>
          <li>This does <strong>not</strong> include international carriers unless they report to the DOT.</li>
        </ul>

        <h2>Coverage</h2>
        <p>
          "Reporting operating carriers" are domestic airlines required to report on-time data to the
          DOT. The number of reporting carriers has varied over the years (from 10 in 1995 to 17+ in
          recent years). Comparisons across years should account for this changing carrier set.
        </p>

        <h2>Caveats</h2>
        <ul>
          <li>The published percentages (on-time, late, cancelled, diverted) represent shares of all scheduled operations and sum to 100%. Cancelled and diverted flights are counted as separate categories, not excluded.</li>
          <li>Year-to-date figures for partial years (current year) are not directly comparable to full-year figures from prior years.</li>
          <li>Airport rankings may shift when new airports are added to or removed from the BTS reporting set.</li>
        </ul>
      </section>
    </div>
  );
}

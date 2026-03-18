export default function SourceNote({ period, table }: { period: string; table: string }) {
  return (
    <div className="source-note">
      <span>Source: Bureau of Transportation Statistics</span>
      <span>{table}</span>
      <span>Period: {period}</span>
    </div>
  );
}

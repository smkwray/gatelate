interface Props {
  min: number;
  max: number;
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
}

export default function YearRangeFilter({ min, max, from, to, onChange }: Props) {
  const years = [];
  for (let y = min; y <= max; y++) years.push(y);

  return (
    <div className="year-range-filter">
      <label>
        From
        <select
          value={from}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(v, Math.max(v, to));
          }}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </label>
      <label>
        To
        <select
          value={to}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(Math.min(from, v), v);
          }}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Overview" },
  { to: "/airlines", label: "Airlines" },
  { to: "/airports", label: "Airports" },
  { to: "/carriers", label: "Carriers" },
  { to: "/insights", label: "Insights" },
  { to: "/methodology", label: "Methodology" },
];

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <NavLink to="/">GateLate</NavLink>
      </div>
      <div className="nav-links">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            end={l.to === "/"}
          >
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

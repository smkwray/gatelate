import { HashRouter, Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Airlines from "./pages/Airlines";
import Airports from "./pages/Airports";
import Carriers from "./pages/Carriers";
import Insights from "./pages/Insights";
import Methodology from "./pages/Methodology";

export default function App() {
  return (
    <HashRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/airlines" element={<Airlines />} />
        <Route path="/airports" element={<Airports />} />
        <Route path="/carriers" element={<Carriers />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/methodology" element={<Methodology />} />
      </Routes>
      <Footer />
    </HashRouter>
  );
}

import type {
  AirlineYtd,
  AirlineMonthly,
  CarrierMonthly,
  CarrierSeasonal,
  CarrierDelayCauses,
  CarrierSizeReliability,
  AirportCarrierMatrix,
  AirportSnapshot,
  AirportAnnual,
  DataMeta,
} from "./types";

const BASE = import.meta.env.BASE_URL + "data/";

async function load<T>(file: string): Promise<T[]> {
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`);
  return res.json();
}

async function loadSingle<T>(file: string): Promise<T> {
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`);
  return res.json();
}

export const loadAirlineYtd = () => load<AirlineYtd>("airline_ytd_current.json");
export const loadAirlineMonthly = () => load<AirlineMonthly>("airline_monthly_history.json");
export const loadCarrierMonthly = () => load<CarrierMonthly>("carrier_monthly.json");
export const loadCarrierSeasonal = () => load<CarrierSeasonal>("carrier_seasonal.json");
export const loadCarrierDelayCauses = () => load<CarrierDelayCauses>("carrier_delay_causes.json");
export const loadCarrierSizeReliability = () => load<CarrierSizeReliability>("carrier_size_reliability.json");
export const loadAirportCarrierMatrix = () => load<AirportCarrierMatrix>("airport_carrier_matrix.json");
export const loadAirportArrivalMonth = () => load<AirportSnapshot>("airport_arrival_current_month.json");
export const loadAirportArrivalYtd = () => load<AirportSnapshot>("airport_arrival_ytd_current.json");
export const loadAirportArrivalAnnual = () => load<AirportAnnual>("airport_arrival_annual_history.json");
export const loadAirportDepartureMonth = () => load<AirportSnapshot>("airport_departure_current_month.json");
export const loadAirportDepartureYtd = () => load<AirportSnapshot>("airport_departure_ytd_current.json");
export const loadAirportDepartureAnnual = () => load<AirportAnnual>("airport_departure_annual_history.json");
export const loadDataMeta = () => loadSingle<DataMeta>("data_meta.json");

export interface AirlineYtd {
  year: number;
  operations: number;
  late_arrivals: number;
  late_departures: number;
  cancelled: number;
  diverted: number;
  pct_on_time_arrivals: number;
  pct_late_arrivals: number;
  pct_late_departures: number;
  pct_cancelled: number;
  pct_diverted: number;
}

export interface AirlineMonthly {
  rank: number;
  year: number;
  month: number;
  pct_on_time_arrivals: number;
  pct_late_arrivals: number;
  pct_cancelled: number;
  pct_diverted: number;
  pct_on_time_departures: number;
  scheduled_flights: number;
}

export interface AirportSnapshot {
  rank: number;
  airport_name: string;
  airport_code: string;
  on_time_pct: number;
  period: string;
  direction: string;
  period_type?: string;
}

export interface CarrierMonthly {
  carrier: string;
  carrier_name: string;
  year: number;
  month: number;
  flights: number;
  on_time_pct: number;
  late_pct: number;
  cancelled_pct: number;
  diverted_pct: number;
}

export interface CarrierSeasonal {
  carrier: string;
  carrier_name: string;
  month: number;
  avg_on_time_pct: number;
  sample_months: number;
}

export interface CarrierDelayCauses {
  carrier: string;
  carrier_name: string;
  total_delay_min: number;
  carrier_delay_pct: number;
  weather_delay_pct: number;
  nas_delay_pct: number;
  security_delay_pct: number;
  late_aircraft_delay_pct: number;
  controllable_delay_pct: number;
}

export interface CarrierSizeReliability {
  carrier: string;
  carrier_name: string;
  flights: number;
  on_time_pct: number;
}

export interface AirportCarrierMatrix {
  airport: string;
  airport_name: string;
  carrier: string;
  carrier_name: string;
  flights: number;
  on_time_pct: number;
}

export interface DataMeta {
  report_year: number;
  report_month: number;
  report_month_label: string;
  report_month_short: string;
  report_ytd_label: string;
  transtats_range_label: string;
  bts_airport_annual_start: number;
  generated_at: string;
}

export interface AirportAnnual {
  rank: number;
  airport_name: string;
  airport_code: string;
  on_time_pct: number;
  period: string;
  year: number;
  direction: string;
}

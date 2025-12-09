export interface StarmapParams {
  latitude: number;
  longitude: number;
  date: string; // DD.MM.YYYY
  time: string; // HH.MM.SS
  utcOffset: number; // +2, -5, etc.
  constellation?: boolean;
}

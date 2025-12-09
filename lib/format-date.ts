export function formatDateForDisplay(dateString: string): string {
  // Input: "01.01.2000" (DD.MM.YYYY)
  // Output: "01.01.2000" (blijft hetzelfde)
  return dateString;
}

export function formatTimeForDisplay(timeString: string): string {
  // Input: "12.00.00" (HH.MM.SS)
  // Output: "12:00" (HH:MM)
  const parts = timeString.split(".");
  return `${parts[0]}:${parts[1]}`;
}

export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lng).toFixed(
    2
  )}° ${lngDir}`;
}

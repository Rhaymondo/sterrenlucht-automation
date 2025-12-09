export interface Coordinates {
  latitude: number;
  longitude: number;
  place: string;
}

export async function geocodeLocation(
  location: string
): Promise<Coordinates | null> {
  try {
    const token = process.env.MAPBOX_ACCESS_TOKEN;

    if (!token) {
      console.error("MAPBOX_ACCESS_TOKEN not set");
      return null;
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      location
    )}.json?access_token=${token}&limit=1&language=nl`;

    const response = await fetch(url);
    const data = await response.json();

    const match = data.features?.[0];

    if (!match) {
      console.error("Geen locatie gevonden voor:", location);
      return null;
    }

    const [longitude, latitude] = match.center;

    return {
      latitude,
      longitude,
      place: match.place_name,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

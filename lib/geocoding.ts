export interface GeocodingResult {
  latitude: number;
  longitude: number;
  place: string; // volledig adres
  city: string; // alleen stad - NIEUW
}

export async function geocodeLocation(
  address: string
): Promise<GeocodingResult | null> {
  try {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (!token) {
      throw new Error("MAPBOX_ACCESS_TOKEN not set");
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&limit=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const match = data.features[0];

    // Zoek de stad in de context
    let city = "";
    if (match.context) {
      const placeContext = match.context.find((c: any) =>
        c.id.startsWith("place.")
      );
      if (placeContext) {
        city = placeContext.text;
      }
    }

    // Fallback
    if (!city) {
      city = match.text;
    }

    return {
      latitude: match.center[1],
      longitude: match.center[0],
      place: match.place_name,
      city, // NIEUW
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

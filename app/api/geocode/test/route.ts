import { geocodeLocation } from "@/lib/geocoding";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const location = request.nextUrl.searchParams.get("location") || "Amsterdam";

  const coords = await geocodeLocation(location);

  if (!coords) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json(coords);
}

import { formatCoordinates, formatTimeForDisplay } from "@/lib/format-date";
import { generatePosterPDF } from "@/lib/generate-pdf";
import { generateStarmap } from "@/lib/generate-starmap";
import { geocodeLocation } from "@/lib/geocoding";
import { parseShopifyOrder } from "@/lib/parse-order";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

function verifyShopifyWebhook(
  body: string,
  hmacHeader: string | null
): boolean {
  if (!hmacHeader) return false;

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("SHOPIFY_WEBHOOK_SECRET not set");
    return false;
  }

  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  return hash === hmacHeader;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const order = JSON.parse(body);

    console.log("📦 Order ontvangen:", order.name);

    // 1. Parse de order data
    const orderData = parseShopifyOrder(order);
    if (!orderData) {
      console.error("❌ Kon order niet parsen");
      return NextResponse.json(
        { success: false, error: "Could not parse order" },
        { status: 400 }
      );
    }
    console.log("✅ Order geparsed");

    // 2. Geocode de locatie
    console.log("🗺️  Geocoding:", orderData.location);
    const coords = await geocodeLocation(orderData.location);
    if (!coords) {
      console.error("❌ Kon locatie niet vinden");
      return NextResponse.json(
        { success: false, error: "Could not geocode location" },
        { status: 400 }
      );
    }
    console.log("✅ Coördinaten:", coords.latitude, coords.longitude);

    // 3. Genereer starmap SVG
    console.log("🌟 Genereer starmap...");
    const svg = await generateStarmap({
      latitude: coords.latitude,
      longitude: coords.longitude,
      date: orderData.date,
      time: orderData.time,
      utcOffset: 1, // TODO: bepaal dit dynamisch op basis van locatie/datum
      constellation: true,
    });
    console.log("✅ Starmap gegenereerd");

    // 4. Genereer PDF
    console.log("📄 Genereer PDF...");
    const pdf = await generatePosterPDF({
      svg,
      color: orderData.color,
      message: orderData.message,
      location: orderData.location,
      date: orderData.date,
      time: formatTimeForDisplay(orderData.time),
    });
    console.log("✅ PDF gegenereerd");

    // TODO: 5. Upload PDF naar storage (Vercel Blob)
    // TODO: 6. Stuur naar drukker

    console.log("🎉 Order succesvol verwerkt!");

    return NextResponse.json({
      success: true,
      message: "Order processed successfully",
      order: {
        id: orderData.orderId,
        name: orderData.orderName,
        location: coords.place,
        coordinates: formatCoordinates(coords.latitude, coords.longitude),
      },
      // Voor nu: PDF size als confirmatie
      pdfSize: `${(pdf.length / 1024).toFixed(2)} KB`,
    });
  } catch (error) {
    console.error("❌ Error processing order:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process order",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

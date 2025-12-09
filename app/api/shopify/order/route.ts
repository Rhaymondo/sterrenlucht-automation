import { formatCoordinates, formatTimeForDisplay } from "@/lib/format-date";
import { generatePosterPDF } from "@/lib/generate-pdf";
// import { generateStarmap } from "@/lib/generate-starmap"; // niet meer nodig
import { geocodeLocation } from "@/lib/geocoding";
import { parseShopifyOrder } from "@/lib/parse-order";
import { put } from "@vercel/blob";
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
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

    // tijdens dev kun je deze check eventueel uitzetten
    if (!verifyShopifyWebhook(body, hmacHeader)) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    const order = JSON.parse(body);

    console.log("📦 Order ontvangen:", order.name);
    console.log("🧾 RAW ORDER:", JSON.stringify(order, null, 2));

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

    // 3. Genereer starmap SVG via Python function op Vercel
    console.log("🌟 Genereer starmap (Python)...");
    const pythonStarmapUrl =
      process.env.PY_STARMAP_URL ??
      "https://sterrenlucht-automation.vercel.app/api/starmap";

    const resp = await fetch(pythonStarmapUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
        date: orderData.date,
        time: orderData.time,
        utcOffset: 1, // TODO: dynamisch op basis van locatie/datum
        constellation: true,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Python starmap function error: ${resp.status} ${text}`);
    }

    const svg = await resp.text();
    console.log("✅ Starmap gegenereerd (Python)");

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

    // 5. Upload naar Vercel Blob
    const fileName = `orders/${orderData.orderId}-${Date.now()}.pdf`;

    const blob = await put(fileName, pdf, {
      access: "public",
      contentType: "application/pdf",
    });

    console.log("📦 PDF opgeslagen in Blob:", blob.url);
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
      pdfSize: `${(pdf.length / 1024).toFixed(2)} KB`,
      pdfUrl: blob.url,
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

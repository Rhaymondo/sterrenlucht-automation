import { formatCoordinates, formatTimeForDisplay } from "@/lib/format-date";
import { generatePosterPDF } from "@/lib/generate-pdf";
import { digitalDeliveryHtml } from "@/lib/email/digital-delivery";
import { list, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface StripePayload {
  payment_intent_id:  string;
  customer_email:     string | null;
  shipping_address:   { name: string | null; line1: string | null; line2: string | null; city: string | null; postal_code: string | null; country: string | null } | null;
  format:             string;
  print_color:        string | null;
  has_frame:          boolean;
  frame_color:        string | null;
  has_gift_card:      boolean;
  location_label:     string | null;
  location_lat:       number | null;
  location_lng:       number | null;
  location_mapbox_id: string | null;
  date:               string | null;  // YYYY-MM-DD
  time:               string | null;  // HH:MM
  message:            string | null;
  gift_card_text:     string | null;
}

function mapColor(printColor: string | null): "Taupe" | "White" | "Black" {
  switch (printColor?.toLowerCase()) {
    case "white": return "White";
    case "black": return "Black";
    default:      return "Taupe";
  }
}

// YYYY-MM-DD → DD.MM.YYYY
function convertDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

// HH:MM → HH.MM.00
function convertTime(timeStr: string): string {
  return timeStr.replace(":", ".") + ".00";
}

function cityFromLabel(label: string | null): string {
  if (!label) return "";
  // Use just the first part before a comma if it looks like "Amsterdam, Nederland"
  return label.split(",")[0].trim();
}

export async function POST(request: NextRequest) {
  try {
    // Auth
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.POSTER_API_KEY) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload: StripePayload = await request.json();
    const { payment_intent_id } = payload;

    if (!payment_intent_id) {
      return NextResponse.json({ success: false, error: "payment_intent_id ontbreekt" }, { status: 400 });
    }

    console.log("📦 Stripe payload ontvangen:", payment_intent_id);

    const lockKey   = `locks/${payment_intent_id}.lock`;
    const pdfPrefix = `orders/${payment_intent_id}-`;

    // 1. Check if PDF already exists
    const existingFiles = await list({ prefix: pdfPrefix, limit: 1 });
    if (existingFiles.blobs.length > 0) {
      console.log("⏭️  PDF al gegenereerd voor", payment_intent_id);
      return NextResponse.json({ success: true, message: "Already processed", pdfUrl: existingFiles.blobs[0].url });
    }

    // 2. Check / claim lock
    const existingLock = await list({ prefix: lockKey, limit: 1 });
    if (existingLock.blobs.length > 0) {
      console.log("🔒 Wordt al verwerkt");
      return NextResponse.json({ success: true, message: "Being processed" });
    }
    await put(lockKey, JSON.stringify({ timestamp: Date.now() }), { access: "public" });
    console.log("✅ Lock geclaimd");

    // 3. Validate required fields
    if (payload.location_lat == null || payload.location_lng == null || !payload.date || !payload.time) {
      return NextResponse.json({ success: false, error: "Locatie of datum/tijd ontbreekt" }, { status: 400 });
    }

    const date  = convertDate(payload.date);
    const time  = convertTime(payload.time);
    const color = mapColor(payload.print_color);
    const city  = cityFromLabel(payload.location_label);

    console.log(`🗺️  Locatie: ${city} (${payload.location_lat}, ${payload.location_lng})`);
    console.log(`📅 Datum: ${date}, Tijd: ${time}, Kleur: ${color}`);

    // 4. Generate starmap SVG via Python
    console.log("🌟 Genereer starmap (Python)...");
    const pythonStarmapUrl = process.env.PY_STARMAP_URL ?? "https://api.sterrenlucht.nl/api/starmap";

    const resp = await fetch(pythonStarmapUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude:      payload.location_lat,
        longitude:     payload.location_lng,
        date,
        time,
        utcOffset:     1,
        constellation: true,
      }),
    });

    if (!resp.ok) {
      throw new Error(`Python starmap error: ${resp.status} ${await resp.text()}`);
    }
    const svg = await resp.text();
    console.log("✅ Starmap gegenereerd");

    // 5. Generate PDF
    console.log("📄 Genereer PDF...");
    const pdf = await generatePosterPDF({
      svg,
      color,
      message:    payload.message ?? "",
      location:   city,
      date,
      time:       formatTimeForDisplay(time),
      cropMarks:  payload.format !== "digital",
    });
    console.log("✅ PDF gegenereerd");

    // 6. Upload to Vercel Blob
    const fileName = `orders/${payment_intent_id}-${Date.now()}.pdf`;
    const blob = await put(fileName, pdf, { access: "public", contentType: "application/pdf" });
    console.log("📦 PDF opgeslagen:", blob.url);

    // 7. Send emails
    const isDigital = payload.format === "digital";

    try {
      if (isDigital && payload.customer_email) {
        // Send PDF directly to customer
        await resend.emails.send({
          from:    "Sterrenlucht <noreply@sterrenlucht.nl>",
          to:      payload.customer_email,
          subject: "Je digitale poster is klaar! ✨",
          html:    digitalDeliveryHtml({
            customerName:  payload.shipping_address?.name ?? null,
            pdfUrl:        blob.url,
            locationLabel: payload.location_label ?? city,
            date,
            time:          formatTimeForDisplay(time),
          }),
        });
        console.log("📧 Klant email verzonden");
      } else {
        // Notify admin for printed orders
        await resend.emails.send({
          from:    "Sterrenlucht <noreply@sterrenlucht.nl>",
          to:      process.env.NOTIFICATION_EMAIL!,
          subject: `✨ Poster klaar: ${payment_intent_id.slice(-8).toUpperCase()}`,
          html: `
            <h2>Nieuwe poster gegenereerd</h2>
            <p><strong>Order:</strong> ${payment_intent_id}</p>
            <p><strong>Klant:</strong> ${payload.customer_email ?? "–"}</p>
            <p><strong>Locatie:</strong> ${payload.location_label ?? city}</p>
            <p><strong>Coördinaten:</strong> ${formatCoordinates(payload.location_lat, payload.location_lng)}</p>
            <p><strong>Datum:</strong> ${date}</p>
            <p><strong>Tijd:</strong> ${formatTimeForDisplay(time)}</p>
            <p><strong>Boodschap:</strong> ${payload.message ?? "–"}</p>
            <p><strong>Kleur:</strong> ${color}</p>
            ${payload.shipping_address ? `
            <p><strong>Bezorgadres:</strong><br>
              ${payload.shipping_address.name ?? ""}<br>
              ${payload.shipping_address.line1 ?? ""}${payload.shipping_address.line2 ? ` ${payload.shipping_address.line2}` : ""}<br>
              ${payload.shipping_address.postal_code ?? ""} ${payload.shipping_address.city ?? ""}
            </p>` : ""}
            <p><strong>PDF grootte:</strong> ${(pdf.length / 1024).toFixed(2)} KB</p>
            <br>
            <a href="${blob.url}" style="background:#1a1714;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-family:sans-serif;">
              Download PDF
            </a>
          `,
        });
        console.log("📧 Admin email verzonden");
      }
    } catch (emailError) {
      console.error("⚠️ Email verzenden mislukt:", emailError);
    }

    console.log("🎉 Order succesvol verwerkt!");
    return NextResponse.json({
      success:     true,
      message:     "Order processed successfully",
      order:       { id: payment_intent_id, location: city, coordinates: formatCoordinates(payload.location_lat, payload.location_lng) },
      pdfSize:     `${(pdf.length / 1024).toFixed(2)} KB`,
      pdfUrl:      blob.url,
    });

  } catch (error) {
    console.error("❌ Error processing order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process order", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

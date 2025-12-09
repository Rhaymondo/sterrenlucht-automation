export interface OrderData {
  orderId: number;
  orderName: string;
  email: string;
  date: string; // DD.MM.YYYY
  time: string; // HH.MM.SS
  location: string;
  message: string;
  color: "Taupe" | "White" | "Black";
}

function parseColor(variantTitle: string): "Taupe" | "White" | "Black" {
  const title = variantTitle.toLowerCase();

  if (title.includes("taupe")) {
    return "Taupe";
  }
  if (title.includes("wit")) {
    return "White";
  }
  if (title.includes("zwart")) {
    return "Black";
  }

  // Default fallback
  console.warn("Geen kleur gevonden in variant, gebruik Taupe als default");
  return "Taupe";
}

export function parseShopifyOrder(order: any): OrderData | null {
  try {
    const posterItem = order.line_items?.find((item: any) =>
      (item.name || "").toLowerCase().includes("poster")
    );

    if (!posterItem) {
      console.error("Geen poster line item gevonden");
      return null;
    }

    const properties = posterItem.properties || [];
    const getProp = (needle: string) =>
      properties
        .find((p: any) =>
          (p.name || "").toLowerCase().includes(needle.toLowerCase())
        )
        ?.value?.trim() || "";

    // Jouw echte namen:
    // " Adres & Plaatsnaam"
    // " Datum & Tijd"
    // " Boodschap"
    const locationRaw = getProp("adres & plaatsnaam");
    const datetimeRaw = getProp("datum & tijd"); // bijv. "08-12-2025 12:00"
    const message = getProp("boodschap");

    if (!locationRaw || !datetimeRaw) {
      console.error("Locatie of datum/tijd ontbreekt", {
        locationRaw,
        datetimeRaw,
      });
      return null;
    }

    // datetime splitsen
    const [datePart, timePart] = datetimeRaw.split(" ");
    // 08-12-2025 -> 08.12.2025
    const date = datePart.replace(/-/g, ".");
    // 12:00 -> 12.00.00
    const time = timePart.replace(/:/g, ".") + ".00";

    // Parse color from variant title
    const variantTitle = posterItem.variant_title || "";
    const color = parseColor(variantTitle);

    return {
      orderId: order.id,
      orderName: order.name,
      email: order.email,
      date,
      time,
      location: locationRaw,
      message,
      color,
    };
  } catch (error) {
    console.error("Error parsing order:", error);
    return null;
  }
}

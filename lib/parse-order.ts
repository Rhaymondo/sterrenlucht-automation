export interface OrderData {
  orderId: number;
  orderName: string;
  email: string;
  date: string; // DD.MM.YYYY formaat voor starmap
  time: string; // HH.MM.SS formaat voor starmap
  location: string;
  message: string;
  color: "Taupe" | "White" | "Black";
}

export function parseShopifyOrder(order: any): OrderData | null {
  try {
    // Vind het poster line item
    const posterItem = order.line_items?.find(
      (item: any) =>
        item.name?.toLowerCase().includes("poster") ||
        item.name?.toLowerCase().includes("sterrenkaart")
    );

    if (!posterItem) {
      console.error("Geen poster gevonden in order");
      return null;
    }

    // Haal properties op
    const properties = posterItem.properties || [];
    const getProp = (name: string) =>
      properties.find((p: any) =>
        p.name?.toLowerCase().includes(name.toLowerCase())
      )?.value || "";

    const dateStr = getProp("datum");
    const timeStr = getProp("tijd");
    const location = getProp("locatie");
    const message = getProp("bericht");
    const color = posterItem.variant_title || "White";

    // Converteer datum van DD-MM-YYYY naar DD.MM.YYYY
    const date = dateStr.replace(/-/g, ".");

    // Converteer tijd van HH:MM naar HH.MM.SS
    const time = timeStr.replace(/:/g, ".") + ".00";

    return {
      orderId: order.id,
      orderName: order.name,
      email: order.email,
      date,
      time,
      location,
      message,
      color: color as "Taupe" | "White" | "Black",
    };
  } catch (error) {
    console.error("Error parsing order:", error);
    return null;
  }
}

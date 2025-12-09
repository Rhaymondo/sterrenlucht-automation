import { generatePosterPDF } from "@/lib/generate-pdf";
import { generateStarmap } from "@/lib/generate-starmap";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  try {
    const svg = await generateStarmap({
      latitude: 52.16,
      longitude: 4.49,
      date: "04.07.2025",
      time: "23.55.00",
      utcOffset: 2,
      constellation: true,
    });

    const pdfBuffer = await generatePosterPDF({
      svg,
      color: "Taupe",
      message: "de mooiste ster aan de hemel",
      location: "Roelofarendsveen",
      date: "04.07.2025",
      time: "23:55",
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="test-poster.pdf"',
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

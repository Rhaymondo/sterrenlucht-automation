import { generatePosterPDF } from "@/lib/generate-pdf";
import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

export async function GET() {
  try {
    // Lees een test SVG (of gebruik een placeholder)
    const svgPath = path.join(process.cwd(), "test-starmap.svg");
    let svg = "";

    if (fs.existsSync(svgPath)) {
      svg = fs.readFileSync(svgPath, "utf-8");
    } else {
      // Simpele placeholder SVG als je geen test-starmap.svg hebt
      svg = `<svg width="200mm" height="200mm" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#2d3b62"/>
        <circle cx="50%" cy="50%" r="2" fill="white"/>
        <circle cx="45%" cy="45%" r="1.5" fill="white"/>
        <circle cx="55%" cy="48%" r="1" fill="white"/>
        <circle cx="52%" cy="52%" r="1.2" fill="white"/>
        <circle cx="48%" cy="55%" r="0.8" fill="white"/>
        <text x="50%" y="95%" text-anchor="middle" fill="white" font-size="8">Test Starmap</text>
      </svg>`;
    }

    const pdf = await generatePosterPDF({
      svg,
      color: "Taupe",
      message: "Ik hou van jou",
      location: "Heemraadserf 2, 3991 KA Houten",
      date: "08.12.2025",
      time: "12:00",
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=test-poster.pdf",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

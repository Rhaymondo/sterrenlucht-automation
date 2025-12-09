import { execa } from "execa";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { z } from "zod";

const starmapSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  date: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/),
  time: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/),
  utcOffset: z.number().min(-12).max(14),
  constellation: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params = starmapSchema.parse(body);

    const starmapPath = path.join(process.cwd(), "external", "starmap");
    const scriptPath = path.join(starmapPath, "starmap.py");
    const outputPath = path.join(starmapPath, "starmap.svg");

    const coord = `${params.latitude},${params.longitude}`;
    const utc =
      params.utcOffset >= 0 ? `+${params.utcOffset}` : `${params.utcOffset}`;

    // Draai het Python script
    await execa(
      "python3",
      [
        scriptPath,
        "-coord",
        coord,
        "-time",
        params.time,
        "-date",
        params.date,
        "-utc",
        utc,
        "-constellation",
        params.constellation.toString(),
      ],
      {
        cwd: starmapPath,
      }
    );

    // Lees de gegenereerde SVG
    const svgContent = await fs.readFile(outputPath, "utf-8");

    // Stuur de SVG terug
    return new NextResponse(svgContent, {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid parameters", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error generating starmap:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate starmap",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

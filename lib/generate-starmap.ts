import { execa } from "execa";
import fs from "fs/promises";
import path from "path";

export interface StarmapOptions {
  latitude: number;
  longitude: number;
  date: string; // DD.MM.YYYY
  time: string; // HH.MM.SS
  utcOffset?: number;
  constellation?: boolean;
}

export async function generateStarmap(
  options: StarmapOptions
): Promise<string> {
  const starmapPath = path.join(process.cwd(), "external", "starmap");
  const scriptPath = path.join(starmapPath, "starmap.py");
  const outputPath = path.join(starmapPath, "starmap.svg");

  const coord = `${options.latitude},${options.longitude}`;
  const utc = options.utcOffset
    ? options.utcOffset >= 0
      ? `+${options.utcOffset}`
      : `${options.utcOffset}`
    : "+0";

  // Draai het Python script
  await execa(
    "python3",
    [
      scriptPath,
      "-coord",
      coord,
      "-time",
      options.time,
      "-date",
      options.date,
      "-utc",
      utc,
      "-constellation",
      String(options.constellation ?? true),
    ],
    {
      cwd: starmapPath,
    }
  );

  // Lees de gegenereerde SVG
  const svgContent = await fs.readFile(outputPath, "utf-8");

  return svgContent;
}

import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

export interface PosterOptions {
  svg: string;
  color: "Taupe" | "White" | "Black";
  message: string;
  location: string;
  date: string;
  time: string;
}

const COLORS = {
  Taupe: "#D4C5B9",
  White: "#FFFFFF",
  Black: "#1A1A1A",
};

const TEXT_COLORS = {
  Taupe: "#1A1A1A",
  White: "#1A1A1A",
  Black: "#FFFFFF",
};

export async function generatePosterPDF(
  options: PosterOptions
): Promise<Buffer> {
  const bleed = 3; // mm
  const trimWidth = 300; // mm
  const trimHeight = 400; // mm

  // page includes bleed on all sides
  const pageWidth = trimWidth + bleed * 2; // 306
  const pageHeight = trimHeight + bleed * 2; // 406

  // extra inner white border for Taupe variant
  const innerBorder = options.color === "Taupe" ? 10 : 0;

  // offset from page edge to the content box
  const offset = bleed + innerBorder; // Taupe: 6mm; others: 3mm

  const contentWidth = trimWidth - innerBorder * 2; // Taupe: 294; others: 300
  const contentHeight = trimHeight - innerBorder * 2; // Taupe: 394; others: 400

  const backgroundColor = COLORS[options.color];
  const textColor = TEXT_COLORS[options.color];

  const svgBase64 = Buffer.from(options.svg).toString("base64");

  // crop-mark stroke length and half for centering
  const cropLen = 5; // mm
  const cropHalf = cropLen / 2; // 2.5mm

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      @page { margin: 0; }
      html,body {
        width: ${pageWidth}mm;
        height: ${pageHeight}mm;
        background: white;
        font-family: 'Be Vietnam Pro', sans-serif;
      }
      /* ---------- Crop marks (centered on trim line = bleed) ---------- */
      .crop {
        position: absolute;
        background: #000;
        z-index: 9999;
      }

      .crop-h {
        width: ${cropLen}mm;
        height: 0.5pt;
      }
      .crop-v {
        width: 0.5pt;
        height: ${cropLen}mm;
      }

      /* top-left */
      .tl-h { top: ${bleed}mm; left: ${bleed - cropHalf}mm; }
      .tl-v { top: ${bleed - cropHalf}mm; left: ${bleed}mm; }

      /* top-right */
      .tr-h { top: ${bleed}mm; right: ${bleed - cropHalf}mm; }
      .tr-v { top: ${bleed - cropHalf}mm; right: ${bleed}mm; }

      /* bottom-left */
      .bl-h { bottom: ${bleed}mm; left: ${bleed - cropHalf}mm; }
      .bl-v { bottom: ${bleed - cropHalf}mm; left: ${bleed}mm; }

      /* bottom-right */
      .br-h { bottom: ${bleed}mm; right: ${bleed - cropHalf}mm; }
      .br-v { bottom: ${bleed - cropHalf}mm; right: ${bleed}mm; }

      /* ---------- Content box = trimmed area minus optional inner border ---------- */
      .content {
        position: absolute;
        top: ${offset}mm;
        left: ${offset}mm;
        width: ${contentWidth}mm;
        height: ${contentHeight}mm;
        background: ${backgroundColor};
        overflow: hidden;
      }

      /* Use relative positioning inside .content so vertical placement scales correctly */
      .content-inner {
        position: relative;
        width: 100%;
        height: 100%;
      }

      /* starmap positioned relative to content using percentages */
      .starmap {
        position: absolute;
        left: 50%;
        top: 12%;
        width: 66%;
        height: auto;
        aspect-ratio: 1 / 1;
        transform: translateX(-50%);
        border-radius: 50%;
        overflow: hidden;
      }
      .starmap img {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 130%;
        height: 130%;
        transform: translate(-50%, -50%);
      }

            .date {
        position: absolute;
        top: 86%;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        text-align: center;
        color: ${textColor};
        font-size: 18pt;
        font-weight: 300;
        letter-spacing: 0.49em;
        text-transform: uppercase;
      }

      .time {
        position: absolute;
        top: 90%;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        text-align: center;
        color: ${textColor};
        font-size: 18pt;
        font-weight: 300;
        letter-spacing: 0.49em;
        text-transform: uppercase;
      }

      .message {
        position: absolute;
        top: 70%;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        text-align: center;
        color: ${textColor};
        font-size: 30pt;
        font-weight: 400;
      }

      .location {
        position: absolute;
        top: 82%;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        text-align: center;
        color: ${textColor};
        font-size: 18pt;
        font-weight: 300;
        letter-spacing: 0.49em;
        text-transform: uppercase;
      }

      /* small helper: remove selection artifacts */
      ::selection { background: transparent; }
    </style>
  </head>
  <body>
    <!-- crop marks (trim line = bleed mm from page edge) -->
    <div class="crop crop-h tl-h"></div>
    <div class="crop crop-v tl-v"></div>

    <div class="crop crop-h tr-h"></div>
    <div class="crop crop-v tr-v"></div>

    <div class="crop crop-h bl-h"></div>
    <div class="crop crop-v bl-v"></div>

    <div class="crop crop-h br-h"></div>
    <div class="crop crop-v br-v"></div>

    <!-- main content -->
    <div class="content">
      <div class="content-inner">
        <div class="starmap">
          <img src="data:image/svg+xml;base64,${svgBase64}" alt="starmap"/>
        </div>

        <div class="message">
            ${options.message}
        </div>

        <div class="location">
          ${options.location}
        </div>

        <div class="date">
            ${options.date}
        </div>

        <div class="time">
            ${options.time}
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  const isLocal = process.env.NODE_ENV === "development";
  const browser = await puppeteer.launch({
    args: isLocal
      ? ["--no-sandbox", "--disable-setuid-sandbox"]
      : chromium.args,
    executablePath: isLocal
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : await chromium.executablePath(
          "https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar"
        ),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      width: `${pageWidth}mm`,
      height: `${pageHeight}mm`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

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
  const bleed = 3;
  const pageWidth = 300 + bleed * 2;
  const pageHeight = 400 + bleed * 2;

  const backgroundColor = COLORS[options.color];
  const textColor = TEXT_COLORS[options.color];

  const svgBase64 = Buffer.from(options.svg).toString("base64");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          size: ${pageWidth}mm ${pageHeight}mm;
          margin: 0;
        }
        
        body {
          width: ${pageWidth}mm;
          height: ${pageHeight}mm;
          background-color: ${backgroundColor};
          font-family: 'Be Vietnam Pro', sans-serif;
          position: relative;
          overflow: hidden;
        }
        
        .content {
          position: absolute;
          top: ${bleed}mm;
          left: ${bleed}mm;
          width: 300mm;
          height: 400mm;
        }
        
        .white-border {
          position: absolute;
          top: ${bleed + 12}mm;
          left: ${bleed + 12}mm;
          width: ${300 - 24}mm;
          height: ${400 - 24}mm;
          background-color: white;
        }
        
        .crop-mark {
          position: absolute;
          background-color: black;
        }
        
        .crop-mark.horizontal {
          width: 5mm;
          height: 0.5pt;
        }
        
        .crop-mark.vertical {
          width: 0.5pt;
          height: 5mm;
        }
        
        .crop-tl-h { top: ${bleed}mm; left: ${bleed - 7}mm; }
        .crop-tl-v { top: ${bleed - 7}mm; left: ${bleed}mm; }
        
        .crop-tr-h { top: ${bleed}mm; right: ${bleed - 7}mm; }
        .crop-tr-v { top: ${bleed - 7}mm; right: ${bleed}mm; }
        
        .crop-bl-h { bottom: ${bleed}mm; left: ${bleed - 7}mm; }
        .crop-bl-v { bottom: ${bleed - 7}mm; left: ${bleed}mm; }
        
        .crop-br-h { bottom: ${bleed}mm; right: ${bleed - 7}mm; }
        .crop-br-v { bottom: ${bleed - 7}mm; right: ${bleed}mm; }
        
        .starmap {
          position: absolute;
          left: ${bleed + 50}mm;
          top: ${bleed + 45.8}mm;
          width: 200mm;
          height: 200mm;
        }
        
        .starmap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .datetime {
          position: absolute;
          top: ${bleed + 260}mm;
          width: 300mm;
          text-align: center;
          color: ${textColor};
          font-size: 18pt;
          font-weight: 300;
        }
        
        .message {
          position: absolute;
          top: ${bleed + 306}mm;
          width: 300mm;
          text-align: center;
          color: ${textColor};
          font-size: 30pt;
          font-weight: 400;
        }
        
        .location {
          position: absolute;
          top: ${bleed + 335}mm;
          width: 300mm;
          text-align: center;
          color: ${textColor};
          font-size: 18pt;
          font-weight: 300;
          letter-spacing: 0.49em;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="crop-mark horizontal crop-tl-h"></div>
      <div class="crop-mark vertical crop-tl-v"></div>
      
      <div class="crop-mark horizontal crop-tr-h"></div>
      <div class="crop-mark vertical crop-tr-v"></div>
      
      <div class="crop-mark horizontal crop-bl-h"></div>
      <div class="crop-mark vertical crop-bl-v"></div>
      
      <div class="crop-mark horizontal crop-br-h"></div>
      <div class="crop-mark vertical crop-br-v"></div>
      
      <div class="content">
        ${options.color === "Taupe" ? '<div class="white-border"></div>' : ""}
        
        <div class="starmap">
          <img src="data:image/svg+xml;base64,${svgBase64}" alt="Starmap" />
        </div>
        
        <div class="datetime">
          ${options.date}<br>
          ${options.time}
        </div>
        
        <div class="message">
          ${options.message}
        </div>
        
        <div class="location">
          ${options.location.replace(/\s/g, "").replace(/,/g, "")}
        </div>
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(
      // Vercel hosts the Chromium binary voor chromium-min
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

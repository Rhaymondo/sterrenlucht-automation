const LOGO = `<img src="https://8seg8ryhgti0sudl.public.blob.vercel-storage.com/Assets/logo-sterrenlucht.png" alt="Sterrenlucht" width="134" height="19" style="display:block;" />`

interface DigitalDeliveryParams {
  customerName: string | null
  pdfUrl:       string
  locationLabel: string
  date:         string  // DD.MM.YYYY
  time:         string  // HH:MM
}

export function digitalDeliveryHtml(params: DigitalDeliveryParams): string {
  const { customerName, pdfUrl, locationLabel, date, time } = params
  const firstName = customerName?.split(" ")[0] ?? "daar"

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Je digitale poster is klaar!</title>
</head>
<body style="margin:0;padding:0;background-color:#f9f8f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9f8f6;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              ${LOGO}
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e5e0d8;border-radius:12px;padding:40px;">

              <p style="margin:0 0 6px;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#7c7974;">Je poster is klaar</p>
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#1a1714;letter-spacing:-.01em;">Hoi ${firstName}, hier is je poster!</h1>
              <p style="margin:0 0 32px;font-size:13px;color:#7c7974;line-height:1.6;">
                Je digitale sterrenkaart staat klaar. Klik op de knop hieronder om je poster te downloaden.
              </p>

              <!-- Details -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e5e0d8;">
                    <p style="margin:0;font-size:13px;font-weight:500;color:#1a1714;">${locationLabel}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#7c7974;">${date.replace(/\./g, " · ").replace(" · ", " ")} &middot; ${time}</p>
                  </td>
                </tr>
              </table>

              <!-- Download button -->
              <a href="${pdfUrl}" target="_blank" style="display:inline-block;background-color:#1a1714;color:#f9f8f6;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:8px;">
                Download poster
              </a>

              <p style="margin:32px 0 0;font-size:12px;color:#7c7974;line-height:1.6;">
                Werkt de knop niet? Kopieer dan deze link:<br>
                <a href="${pdfUrl}" style="color:#1a1714;word-break:break-all;">${pdfUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#7c7974;">
                Vragen? Mail naar <a href="mailto:info@sterrenlucht.nl" style="color:#1a1714;text-decoration:underline;">info@sterrenlucht.nl</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

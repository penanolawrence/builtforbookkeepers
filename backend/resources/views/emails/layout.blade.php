<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>@yield('title', 'Built for Bookkeepers')</title>
  <style>
    body,table,td,p,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    body{height:100%!important;margin:0;padding:0;width:100%!important}
    a{color:#E2568C}
  </style>
</head>
<body style="margin:0;padding:0;background:#F2EDE8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2EDE8;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">

          {{-- Top accent bar --}}
          <tr>
            <td style="background:linear-gradient(90deg,#E2568C,#C53C76);height:4px;font-size:1px;line-height:4px;">&nbsp;</td>
          </tr>

          {{-- Header --}}
          <tr>
            <td style="padding:22px 32px;border-bottom:1px solid #ECE4D8;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="{{ config('app.url') }}/images/logo-mark.svg" width="32" height="32" alt="Built for Bookkeepers" style="display:block;border:0;">
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:700;color:#2A2433;letter-spacing:-0.2px;">Built for Bookkeepers</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          {{-- Body --}}
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid #ECE4D8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.7;color:#2A2433;">
              @yield('body')
            </td>
          </tr>

          {{-- Footer --}}
          <tr>
            <td style="background:#FBF7F1;padding:16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="56" style="vertical-align:middle;">
                    <img src="{{ config('app.url') }}/images/sofia-mascot.svg" width="48" height="56" alt="Sofia, your AI bookkeeper" style="display:block;border:0;">
                  </td>
                  <td style="padding-left:16px;vertical-align:middle;">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;color:#2A2433;">Sofia, your AI bookkeeper</p>
                    <p style="margin:4px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#8A8295;">@yield('footer-sub', 'Here to keep your books clean.')</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>

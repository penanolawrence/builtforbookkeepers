@php
$pugSvg = '<svg viewBox="0 0 260 300" width="48" height="56" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="b" cx="50%" cy="35%" r="70%"><stop offset="0%" stop-color="#F4DCB8"/><stop offset="100%" stop-color="#ECCBA1"/></radialGradient><radialGradient id="h" cx="42%" cy="34%" r="75%"><stop offset="0%" stop-color="#F4DCB8"/><stop offset="100%" stop-color="#ECCBA1"/></radialGradient><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FFADD2" stop-opacity="0.9"/><stop offset="100%" stop-color="#FFADD2" stop-opacity="0"/></radialGradient></defs><ellipse cx="130" cy="288" rx="62" ry="11" fill="#000" opacity="0.13"/><path d="M34 69 Q35.5 76.5 43 78 Q35.5 79.5 34 87 Q32.5 79.5 25 78 Q32.5 76.5 34 69 Z" fill="#FFADD2"/><path d="M222 51 Q223.5 58.5 231 60 Q223.5 61.5 222 69 Q220.5 61.5 213 60 Q220.5 58.5 222 51 Z" fill="#FFADD2"/><ellipse cx="58" cy="104" rx="21" ry="46" fill="#3B3340" transform="rotate(-12 58 104)"/><ellipse cx="202" cy="104" rx="21" ry="46" fill="#3B3340" transform="rotate(12 202 104)"/><ellipse cx="130" cy="234" rx="64" ry="46" fill="url(#b)"/><ellipse cx="100" cy="264" rx="19" ry="13" fill="#ECCBA1"/><ellipse cx="160" cy="264" rx="19" ry="13" fill="#ECCBA1"/><path d="M92 264 v8 M100 265 v9 M108 264 v8" stroke="#D9B083" stroke-width="2" stroke-linecap="round"/><path d="M152 264 v8 M160 265 v9 M168 264 v8" stroke="#D9B083" stroke-width="2" stroke-linecap="round"/><path d="M74 196 Q130 220 186 196" fill="none" stroke="#E2568C" stroke-width="12" stroke-linecap="round"/><circle cx="130" cy="214" r="7" fill="#FFADD2" stroke="#fff" stroke-width="1.5"/><circle cx="130" cy="116" r="78" fill="url(#h)"/><path d="M104 70 Q130 60 156 70" fill="none" stroke="#D9B083" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/><path d="M110 82 Q130 73 150 82" fill="none" stroke="#D9B083" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/><ellipse cx="130" cy="152" rx="50" ry="42" fill="#3B3340"/><ellipse cx="99" cy="112" rx="21" ry="23" fill="#fff"/><ellipse cx="161" cy="112" rx="21" ry="23" fill="#fff"/><circle cx="99" cy="114" r="11.5" fill="#2A242F"/><circle cx="161" cy="114" r="11.5" fill="#2A242F"/><circle cx="94" cy="108" r="4" fill="#fff"/><circle cx="156" cy="108" r="4" fill="#fff"/><path d="M130 130 q14 4 11 15 q-3 8 -11 9 q-8 -1 -11 -9 q-3 -11 11 -15 Z" fill="#2A242F"/><path d="M130 155 v9" stroke="#2A242F" stroke-width="2.5" stroke-linecap="round"/><path d="M130 164 q-12 9 -22 3 M130 164 q12 9 22 3" fill="none" stroke="#2A242F" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="130" cy="178" rx="9" ry="12" fill="#F2748A"/><line x1="130" y1="170" x2="130" y2="184" stroke="#D85A72" stroke-width="1.6" opacity="0.6"/><path d="M64 96 Q130 34 196 96" fill="none" stroke="#E2568C" stroke-width="8" stroke-linecap="round"/><circle cx="130" cy="40" r="9" fill="url(#g)"/><circle cx="130" cy="40" r="4.5" fill="#E2568C"/><circle cx="62" cy="104" r="13" fill="#E2568C"/><circle cx="62" cy="104" r="6" fill="#FFADD2"/><path d="M60 116 Q50 156 96 158" fill="none" stroke="#E2568C" stroke-width="5" stroke-linecap="round"/><circle cx="98" cy="158" r="5" fill="#E2568C"/><path d="M206 181 Q207.5 188.5 215 190 Q207.5 191.5 206 199 Q204.5 191.5 197 190 Q204.5 188.5 206 181 Z" fill="#FFADD2"/><path d="M40 195 Q41.5 202.5 49 204 Q41.5 205.5 40 213 Q38.5 205.5 31 204 Q38.5 202.5 40 195 Z" fill="#FFADD2"/></svg>';
$pugSrc = 'data:image/svg+xml;base64,' . base64_encode($pugSvg);
@endphp
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
                    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="display:block;">
                      <defs>
                        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#E2568C"/>
                          <stop offset="100%" stop-color="#C53C76"/>
                        </linearGradient>
                      </defs>
                      <rect width="32" height="32" rx="7" fill="url(#logo-grad)"/>
                      <text x="16" y="22" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold" font-family="Arial,sans-serif">&#8369;</text>
                    </svg>
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
                    <img src="{{ $pugSrc }}" width="48" height="56" alt="Sofia, your AI bookkeeper" style="display:block;border:0;">
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

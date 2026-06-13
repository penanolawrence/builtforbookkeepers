@extends('emails.layout')

@section('title', "You're invited to Built for Bookkeepers")

@section('body')
<p style="margin:0 0 16px;">Hello,</p>
<p style="margin:0 0 24px;">You've been invited to <strong>Built for Bookkeepers</strong> — an AI-assisted bookkeeping system built for Philippine businesses.</p>
<p style="margin:0 0 24px;">Click the button below to set up your account:</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="border-radius:7px;background:#E2568C;">
      <a href="{{ $inviteLink }}" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:7px;">Set Up My Account</a>
    </td>
  </tr>
</table>
<p style="margin:24px 0 0;font-size:12px;color:#8A8295;">This link expires in 30 days. If you didn't expect this invitation, you can safely ignore this email.</p>
@endsection

@section('footer-sub', 'Helping you stay on top of your finances.')

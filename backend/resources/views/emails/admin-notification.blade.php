@extends('emails.layout')

@section('title', 'Admin Alert — Built for Bookkeepers')

@section('body')
<p style="margin:0 0 20px;">A new admin notification has been triggered:</p>
<div style="background:#FBE6EF;border-left:3px solid #E2568C;border-radius:4px;padding:16px 20px;margin:0 0 20px;">
  <p style="margin:0;color:#2A2433;">{{ $body }}</p>
</div>
@if(!empty($data))
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #ECE4D8;margin-top:4px;padding-top:16px;">
  @foreach($data as $key => $value)
  <tr>
    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#8A8295;padding:4px 0;width:140px;">{{ $key }}</td>
    <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:#2A2433;padding:4px 0;">{{ $value }}</td>
  </tr>
  @endforeach
</table>
@endif
@endsection

@section('footer-sub', 'This is an automated admin notification.')

<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    h2 { font-size: 13px; margin-bottom: 2px; }
    .meta { font-size: 11px; color: #666; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f0f0f0; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ccc; }
    td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; }
    .amount { text-align: right; }
    .total-row td { font-weight: bold; border-top: 2px solid #aaa; }
</style>
</head>
<body>
<h1>{{ $company->name }}</h1>
<h2>Expense Breakdown</h2>
<p class="meta">Period: {{ $start }} to {{ $end }}</p>

<table>
    <thead>
        <tr><th>Account</th><th class="amount">Amount (PHP)</th></tr>
    </thead>
    <tbody>
        @foreach ($expenses as $row)
        <tr><td>{{ $row['accountCode'] }} — {{ $row['accountName'] }}</td><td class="amount">{{ number_format($row['total'], 2) }}</td></tr>
        @endforeach
        <tr class="total-row"><td>Grand Total</td><td class="amount">{{ number_format($grandTotal, 2) }}</td></tr>
    </tbody>
</table>
</body>
</html>

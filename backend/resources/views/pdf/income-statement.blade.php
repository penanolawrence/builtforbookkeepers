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
    .net-row td { font-weight: bold; font-size: 13px; background: #f9f9f9; }
</style>
</head>
<body>
<h1>{{ $company->name }}</h1>
<h2>Income Statement</h2>
<p class="meta">Period: {{ $start }} to {{ $end }}</p>

<h2>Income</h2>
<table>
    <thead>
        <tr><th>Account</th><th class="amount">Amount (PHP)</th></tr>
    </thead>
    <tbody>
        @foreach ($income as $row)
        <tr><td>{{ $row['accountCode'] }} — {{ $row['accountName'] }}</td><td class="amount">{{ number_format($row['total'], 2) }}</td></tr>
        @endforeach
        <tr class="total-row"><td>Total Income</td><td class="amount">{{ number_format($totals['totalIncome'], 2) }}</td></tr>
    </tbody>
</table>

<h2>Expenses</h2>
<table>
    <thead>
        <tr><th>Account</th><th class="amount">Amount (PHP)</th></tr>
    </thead>
    <tbody>
        @foreach ($expenses as $row)
        <tr><td>{{ $row['accountCode'] }} — {{ $row['accountName'] }}</td><td class="amount">{{ number_format($row['total'], 2) }}</td></tr>
        @endforeach
        <tr class="total-row"><td>Total Expenses</td><td class="amount">{{ number_format($totals['totalExpenses'], 2) }}</td></tr>
    </tbody>
</table>

<table>
    <tbody>
        <tr class="net-row"><td>Net Income</td><td class="amount">{{ number_format($totals['netIncome'], 2) }}</td></tr>
    </tbody>
</table>
</body>
</html>

<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: Arial, sans-serif; font-size: 10px; color: #333; }
    h1 { font-size: 14px; margin-bottom: 4px; }
    h2 { font-size: 11px; margin-bottom: 2px; }
    .meta { font-size: 9px; color: #666; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; text-align: left; padding: 4px 5px; border-bottom: 2px solid #ccc; font-size: 9px; }
    td { padding: 3px 5px; border-bottom: 1px solid #e0e0e0; font-size: 9px; }
    .amount { text-align: right; }
    tfoot td { font-weight: bold; border-top: 2px solid #ccc; border-bottom: none; }
</style>
</head>
<body>
<h1>{{ $company->name }}</h1>
<h2>Alpha List of Payees — BIR Form 1604-E</h2>
<p class="meta">Period: {{ $start }} to {{ $end }}</p>

<table>
    <thead>
        <tr>
            <th>#</th>
            <th>TIN</th>
            <th>Payee Name</th>
            <th>Address</th>
            <th>ATC</th>
            <th>Nature of Income</th>
            <th class="amount">Gross Payment</th>
            <th class="amount">Rate (%)</th>
            <th class="amount">EWT Withheld</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($rows as $i => $row)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td>{{ $row['tin'] ?: '—' }}</td>
            <td>{{ $row['payeeName'] }}</td>
            <td>{{ $row['address'] ?: '—' }}</td>
            <td>{{ $row['atcCode'] }}</td>
            <td>{{ $row['natureOfIncome'] }}</td>
            <td class="amount">{{ number_format($row['grossPayment'], 2) }}</td>
            <td class="amount">{{ $row['rate'] }}</td>
            <td class="amount">{{ number_format($row['ewtAmount'], 2) }}</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr>
            <td colspan="6">Total</td>
            <td class="amount">{{ number_format(array_sum(array_column($rows, 'grossPayment')), 2) }}</td>
            <td></td>
            <td class="amount">{{ number_format(array_sum(array_column($rows, 'ewtAmount')), 2) }}</td>
        </tr>
    </tfoot>
</table>
</body>
</html>

<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    h2 { font-size: 13px; margin-bottom: 2px; }
    .meta { font-size: 11px; color: #666; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f0f0f0; text-align: left; padding: 5px 6px; border-bottom: 2px solid #ccc; font-size: 10px; }
    td { padding: 4px 6px; border-bottom: 1px solid #e8e8e8; }
    .amount { text-align: right; }
    .total-row td { font-weight: bold; border-top: 2px solid #aaa; }
</style>
</head>
<body>
<h1>{{ $company->name }}</h1>
<h2>Summary List of Purchases — Q{{ $quarter }} {{ $year }}</h2>
<p class="meta">
    @if($company->tin) TIN: {{ $company->tin }}<br> @endif
    @if($company->address) Address: {{ $company->address }} @endif
</p>

<table>
    <thead>
        <tr>
            <th>Date</th>
            <th>Invoice No.</th>
            <th>Supplier Name</th>
            <th>Supplier TIN</th>
            <th>Supplier Address</th>
            <th class="amount">Taxable Amount</th>
            <th class="amount">Input VAT (12%)</th>
            <th class="amount">Total</th>
        </tr>
    </thead>
    <tbody>
        @forelse($rows as $row)
        <tr>
            <td>{{ $row['date'] }}</td>
            <td>{{ $row['ref_number'] ?? '—' }}</td>
            <td>{{ $row['supplier_name'] ?? '—' }}</td>
            <td>{{ $row['supplier_tin'] ?? '—' }}</td>
            <td>{{ $row['supplier_address'] ?? '—' }}</td>
            <td class="amount">{{ number_format($row['taxable_amount'], 2) }}</td>
            <td class="amount">{{ number_format($row['input_vat'], 2) }}</td>
            <td class="amount">{{ number_format($row['total_amount'], 2) }}</td>
        </tr>
        @empty
        <tr><td colspan="8" style="text-align:center; color:#aaa; padding:16px;">No purchases recorded for this period.</td></tr>
        @endforelse
        <tr class="total-row">
            <td colspan="5">Total</td>
            <td class="amount">{{ number_format($totals['taxable_amount'], 2) }}</td>
            <td class="amount">{{ number_format($totals['input_vat'], 2) }}</td>
            <td class="amount">{{ number_format($totals['total_amount'], 2) }}</td>
        </tr>
    </tbody>
</table>
</body>
</html>

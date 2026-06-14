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
    th { background: #f0f0f0; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ccc; font-size: 11px; }
    td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; }
    .amount { text-align: right; }
    .total-row td { font-weight: bold; border-top: 2px solid #aaa; }
    .footer { font-size: 10px; color: #aaa; margin-top: 16px; }
</style>
</head>
<body>
<h1>{{ $company->name }}</h1>
<h2>Quarterly VAT Return — BIR Form 2550Q &nbsp;|&nbsp; Q{{ $quarter }} {{ $year }}</h2>
<p class="meta">
    @if($company->tin) TIN: {{ $company->tin }}<br> @endif
    @if($company->address) Address: {{ $company->address }} @endif
</p>

<table>
    <thead>
        <tr>
            <th>Month</th>
            <th class="amount">Taxable Sales</th>
            <th class="amount">Output VAT</th>
            <th class="amount">Taxable Purchases</th>
            <th class="amount">Input VAT</th>
            <th class="amount">Net VAT Payable</th>
        </tr>
    </thead>
    <tbody>
        @foreach($months as $m)
        <tr>
            <td>{{ $m['label'] }}</td>
            <td class="amount">{{ number_format($m['taxable_sales'], 2) }}</td>
            <td class="amount">{{ number_format($m['output_vat'], 2) }}</td>
            <td class="amount">{{ number_format($m['taxable_purchases'], 2) }}</td>
            <td class="amount">{{ number_format($m['input_vat'], 2) }}</td>
            <td class="amount">{{ number_format($m['net_vat_payable'], 2) }}</td>
        </tr>
        @endforeach
        <tr class="total-row">
            <td>Quarter Total</td>
            <td class="amount">{{ number_format($totals['taxable_sales'], 2) }}</td>
            <td class="amount">{{ number_format($totals['output_vat'], 2) }}</td>
            <td class="amount">{{ number_format($totals['taxable_purchases'], 2) }}</td>
            <td class="amount">{{ number_format($totals['input_vat'], 2) }}</td>
            <td class="amount">{{ number_format($totals['net_vat_payable'], 2) }}</td>
        </tr>
    </tbody>
</table>
</body>
</html>

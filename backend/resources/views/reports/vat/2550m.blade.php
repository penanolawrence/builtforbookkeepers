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
    .net-row td { font-weight: bold; font-size: 13px; background: #f9f9f9; border-top: 2px solid #aaa; }
</style>
</head>
<body>
<h1>{{ $company->name }}</h1>
<h2>Monthly VAT Return — BIR Form 2550M</h2>
<p class="meta">
    Period: {{ $period_label }}<br>
    @if($company->tin) TIN: {{ $company->tin }}<br> @endif
    @if($company->address) Address: {{ $company->address }} @endif
</p>

<table>
    <thead>
        <tr><th>Description</th><th class="amount">Amount (PHP)</th></tr>
    </thead>
    <tbody>
        <tr><td>Taxable Sales (Net of VAT)</td><td class="amount">{{ number_format($taxable_sales, 2) }}</td></tr>
        <tr><td>Output VAT Due (12%)</td><td class="amount">{{ number_format($output_vat, 2) }}</td></tr>
        <tr><td>Taxable Purchases (Net of VAT)</td><td class="amount">{{ number_format($taxable_purchases, 2) }}</td></tr>
        <tr><td>Input VAT Available</td><td class="amount">{{ number_format($input_vat, 2) }}</td></tr>
        <tr class="net-row">
            <td>Net VAT Payable / (Creditable)</td>
            <td class="amount">{{ number_format($net_vat_payable, 2) }}</td>
        </tr>
    </tbody>
</table>
</body>
</html>

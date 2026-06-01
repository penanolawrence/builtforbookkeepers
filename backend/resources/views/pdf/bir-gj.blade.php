<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333; }
    h1 { font-size: 15px; margin-bottom: 4px; }
    h2 { font-size: 12px; margin-bottom: 2px; }
    .meta { font-size: 10px; color: #666; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; text-align: left; padding: 5px 6px; border-bottom: 2px solid #ccc; font-size: 10px; }
    td { padding: 4px 6px; border-bottom: 1px solid #e0e0e0; }
    .amount { text-align: right; }
</style>
</head>
<body>
<h1>{{ $company->name }}</h1>
<h2>General Journal (GJ)</h2>
<p class="meta">Period: {{ $start }} to {{ $end }}</p>

<table>
    <thead>
        <tr>
            <th>Date</th>
            <th>Account Name</th>
            <th>Subtype</th>
            <th>Description</th>
            <th>Ref</th>
            <th class="amount">Debit</th>
            <th class="amount">Credit</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($rows as $row)
        <tr>
            <td>{{ $row['date'] }}</td>
            <td>{{ $row['accountName'] }}</td>
            <td>{{ $row['subtype'] ?? '' }}</td>
            <td>{{ $row['description'] }}</td>
            <td>{{ $row['ref'] }}</td>
            <td class="amount">{{ $row['debit'] !== null ? number_format($row['debit'], 2) : '' }}</td>
            <td class="amount">{{ $row['credit'] !== null ? number_format($row['credit'], 2) : '' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
</body>
</html>

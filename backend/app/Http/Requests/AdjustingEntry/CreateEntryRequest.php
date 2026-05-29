<?php

namespace App\Http\Requests\AdjustingEntry;

use Illuminate\Foundation\Http\FormRequest;

class CreateEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'companyId'           => ['required', 'uuid', 'exists:companies,id'],
            'date'                => ['required', 'date'],
            'memo'                => ['required', 'string', 'max:1000'],
            'type'                => ['required', 'in:Reclassification,Reversal,Other'],
            'lines'               => ['required', 'array', 'min:2'],
            'lines.*.accountId'   => ['required', 'uuid', 'exists:accounts,id'],
            'lines.*.debit'       => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit'      => ['nullable', 'numeric', 'min:0'],
        ];
    }
}

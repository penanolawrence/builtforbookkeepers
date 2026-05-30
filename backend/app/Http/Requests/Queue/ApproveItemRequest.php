<?php

namespace App\Http\Requests\Queue;

use Illuminate\Foundation\Http\FormRequest;

class ApproveItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fields'                    => ['nullable', 'array'],
            'fields.merchantName'       => ['nullable', 'string'],
            'fields.date'               => ['nullable', 'date'],
            'fields.declaredType'       => ['nullable', 'string', 'in:income,expense'],
            'fields.paymentMethod'      => ['nullable', 'string'],
            'lines'                     => ['nullable', 'array'],
            'lines.*.id'                => ['nullable', 'string'],
            'lines.*.type'              => ['nullable', 'string', 'in:income,expense'],
            'lines.*.accountId'         => ['nullable', 'string'],
            'lines.*.accountCode'       => ['nullable', 'string'],
            'lines.*.category'          => ['nullable', 'string'],
            'lines.*.amount'            => ['nullable', 'numeric'],
            'lines.*.description'       => ['nullable', 'string'],
            'lines.*.date'              => ['nullable', 'date'],
            'removedLineIds'            => ['nullable', 'array'],
            'removedLineIds.*'          => ['nullable', 'string'],
        ];
    }
}

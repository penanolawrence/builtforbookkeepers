<?php

namespace App\Http\Requests\Document;

use Illuminate\Foundation\Http\FormRequest;

class ManualEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'entries'                   => ['required', 'array', 'min:1', 'max:50'],
            'entries.*.declared_type'   => ['required', 'in:income,expense'],
            'entries.*.date'            => ['required', 'date', 'before_or_equal:today'],
            'entries.*.amount'          => ['required', 'numeric', 'min:0.01'],
            'entries.*.payment_method'  => ['required', 'in:Cash,GCash,Maya,Bank'],
            'entries.*.note'            => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'entries.required'                  => 'At least one entry is required.',
            'entries.*.declared_type.required'  => 'Each entry must have a type (income or expense).',
            'entries.*.date.required'           => 'Each entry must have a date.',
            'entries.*.amount.min'              => 'Each entry amount must be greater than zero.',
            'entries.*.payment_method.in'       => 'Payment method must be Cash, GCash, Maya, or Bank.',
        ];
    }
}

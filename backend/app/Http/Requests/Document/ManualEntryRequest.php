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
            'declared_type'           => ['required', 'in:income,expense'],
            'date'                    => ['required', 'date', 'before_or_equal:today'],
            'payment_method'          => ['required', 'in:Cash,GCash,Maya,Bank'],
            'lines'                   => ['required', 'array', 'min:1', 'max:50'],
            'lines.*.description'     => ['required', 'string', 'max:500'],
            'lines.*.amount'          => ['required', 'numeric', 'min:0.01'],
            'client_id'               => ['nullable', 'string', 'exists:companies,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'declared_type.required'       => 'Transaction type (income or expense) is required.',
            'declared_type.in'             => 'Type must be income or expense.',
            'date.required'                => 'Date is required.',
            'date.before_or_equal'         => 'Date cannot be in the future.',
            'payment_method.required'      => 'Payment method is required.',
            'payment_method.in'            => 'Payment method must be Cash, GCash, Maya, or Bank.',
            'lines.required'               => 'At least one line is required.',
            'lines.min'                    => 'At least one line is required.',
            'lines.*.description.required' => 'Each line must have a description.',
            'lines.*.amount.min'           => 'Each line amount must be greater than zero.',
        ];
    }
}

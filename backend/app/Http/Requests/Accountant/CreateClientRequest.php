<?php

namespace App\Http\Requests\Accountant;

use Illuminate\Foundation\Http\FormRequest;

class CreateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'businessName'  => ['required', 'string', 'max:255'],
            'mobile'        => ['required', 'string', 'max:20'],
            'planType'      => ['required', 'in:starter,growth,premium'],
            'birType'       => ['required', 'in:vat,non_vat'],
            'tin'           => ['nullable', 'string', 'max:20'],
            'email'         => ['nullable', 'email', 'max:255'],
            'contactPerson' => ['nullable', 'string', 'max:255'],
        ];
    }
}

<?php

namespace App\Http\Requests\AdjustingEntry;

use Illuminate\Foundation\Http\FormRequest;

class RejectEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:10'],
        ];
    }
}

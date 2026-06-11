<?php

namespace App\Http\Requests\Document;

use Illuminate\Foundation\Http\FormRequest;

class UploadDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file'          => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
            'declared_type' => ['required', 'string', 'in:income,expense'],
            'note'          => ['nullable', 'string', 'max:1000'],
            'client_id'     => ['nullable', 'string', 'exists:companies,id'],
        ];
    }
}

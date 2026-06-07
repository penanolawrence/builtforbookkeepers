<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('ocr_results');

        DB::table('documents')
            ->where('internal_status', 'OCR_COMPLETE')
            ->update(['internal_status' => 'READY']);

        DB::table('documents')
            ->where('internal_status', 'OCR_FAILED')
            ->update(['internal_status' => 'READ_FAILED']);
    }

    public function down(): void
    {
        Schema::create('ocr_results', function (Blueprint $table) {
            $table->id();
            $table->uuid('document_id')->unique();
            $table->jsonb('extracted_data')->nullable();
            $table->decimal('confidence', 5, 4)->nullable();
            $table->string('engine')->default('vision');
            $table->timestamps();
        });

        DB::table('documents')
            ->where('internal_status', 'READY')
            ->update(['internal_status' => 'OCR_COMPLETE']);

        DB::table('documents')
            ->where('internal_status', 'READ_FAILED')
            ->update(['internal_status' => 'OCR_FAILED']);
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->foreignUuid('uploaded_by')->references('id')->on('users');
            $table->string('original_filename');
            $table->string('storage_path');
            $table->string('file_hash', 64)->nullable();
            $table->enum('status', ['processing', 'parked', 'posted', 'failed'])->default('processing');
            $table->enum('flag', ['GREEN', 'YELLOW', 'RED'])->nullable();
            $table->text('anomaly_reason')->nullable();
            $table->string('document_type')->nullable();
            $table->date('document_date')->nullable();
            $table->string('ref_number')->nullable();
            $table->decimal('amount', 15, 2)->nullable();
            $table->timestamps();

            $table->index('company_id');
            $table->index('status');
            $table->index('flag');
            $table->index('file_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};

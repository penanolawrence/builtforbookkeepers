<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_id')
                  ->references('id')->on('documents')
                  ->cascadeOnDelete();
            $table->foreignUuid('account_id')
                  ->nullable()
                  ->references('id')->on('accounts')
                  ->nullOnDelete();
            $table->string('account_code')->nullable();
            $table->enum('type', ['income', 'expense']);
            $table->string('category')->nullable();
            $table->decimal('amount', 15, 2);
            $table->string('description')->nullable();
            $table->timestamps();

            $table->index('document_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_lines');
    }
};

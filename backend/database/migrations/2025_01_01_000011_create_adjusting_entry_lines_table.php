<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('adjusting_entry_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('adjusting_entry_id')->references('id')->on('adjusting_entries')->cascadeOnDelete();
            $table->foreignUuid('account_id')->references('id')->on('accounts');
            $table->decimal('debit', 15, 2)->nullable();
            $table->decimal('credit', 15, 2)->nullable();
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('adjusting_entry_lines');
    }
};

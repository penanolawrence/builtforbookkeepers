<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 100);
            $table->unsignedSmallInteger('code_prefix');
            $table->enum('normal_balance', ['debit', 'credit']);
            $table->unsignedTinyInteger('sort_order');
            $table->timestamps();

            $table->unique('name');
            $table->unique('code_prefix');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_types');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chart_of_account_subtypes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('chart_of_account_id')
                  ->references('id')->on('chart_of_accounts')
                  ->cascadeOnDelete();
            $table->string('code', 10);
            $table->string('name', 150);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order');
            $table->timestamps();

            $table->unique('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chart_of_account_subtypes');
    }
};

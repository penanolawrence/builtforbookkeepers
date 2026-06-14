<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->string('tin')->nullable();
            $table->string('address')->nullable();
            $table->timestamps();

            $table->index('company_id');
            $table->index('tin');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchants');
    }
};

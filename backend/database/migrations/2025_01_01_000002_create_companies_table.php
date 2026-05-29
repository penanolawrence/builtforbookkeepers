<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('mobile')->nullable();
            $table->string('email')->nullable();
            $table->string('tin')->nullable();
            $table->string('contact_person')->nullable();
            $table->enum('bir_type', ['vat', 'non_vat']);
            $table->enum('plan', ['starter', 'growth', 'premium']);
            $table->foreignUuid('accountant_id')
                  ->nullable()
                  ->references('id')
                  ->on('users')
                  ->nullOnDelete();
            $table->timestamps();
        });

        // Add the deferred FK from users.company_id → companies now that companies exists
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('company_id')->references('id')->on('companies')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
        });
        Schema::dropIfExists('companies');
    }
};

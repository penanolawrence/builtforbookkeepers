<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accountant_assignment_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->foreignUuid('accountant_id')->nullable()->references('id')->on('users')->nullOnDelete();
            $table->foreignUuid('assigned_by')->references('id')->on('users');
            $table->timestamp('assigned_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accountant_assignment_logs');
    }
};

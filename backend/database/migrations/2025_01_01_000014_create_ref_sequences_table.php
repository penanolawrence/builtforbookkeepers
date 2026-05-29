<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ref_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->string('prefix', 20);
            $table->unsignedBigInteger('last_seq')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'prefix']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ref_sequences');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->foreignUuid('document_id')->nullable()->references('id')->on('documents')->nullOnDelete();
            // adjusting_entry_id FK added after adjusting_entries table is created (migration 0010)
            $table->uuid('adjusting_entry_id')->nullable();
            $table->string('ref_number')->nullable();
            $table->date('entry_date');
            $table->string('description')->nullable();
            $table->enum('status', ['draft', 'posted'])->default('draft');
            $table->foreignUuid('posted_by')->references('id')->on('users');
            $table->timestamp('posted_at');
            $table->timestamps();
        });

        DB::statement('ALTER TABLE journal_entries ADD CONSTRAINT chk_journal_source CHECK (document_id IS NOT NULL OR adjusting_entry_id IS NOT NULL)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS chk_journal_source');
        Schema::dropIfExists('journal_entries');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journal_entry_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('journal_entry_id')->references('id')->on('journal_entries')->cascadeOnDelete();
            $table->foreignUuid('account_id')->references('id')->on('accounts');
            $table->decimal('debit', 15, 2)->nullable();
            $table->decimal('credit', 15, 2)->nullable();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE journal_entry_lines ADD CONSTRAINT chk_debit_or_credit CHECK ((debit IS NOT NULL)::int + (credit IS NOT NULL)::int = 1)');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE journal_entry_lines DROP CONSTRAINT IF EXISTS chk_debit_or_credit');
        }
        Schema::dropIfExists('journal_entry_lines');
    }
};

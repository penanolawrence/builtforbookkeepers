<?php
// backend/database/migrations/2026_06_13_000002_add_period_closing_id_to_journal_entries.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->foreignUuid('period_closing_id')
                ->nullable()
                ->references('id')->on('period_closings')
                ->nullOnDelete()
                ->after('adjusting_entry_id');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS chk_journal_source');
            DB::statement('ALTER TABLE journal_entries ADD CONSTRAINT chk_journal_source CHECK (
                document_id IS NOT NULL OR
                adjusting_entry_id IS NOT NULL OR
                period_closing_id IS NOT NULL
            )');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS chk_journal_source');
            DB::statement('ALTER TABLE journal_entries ADD CONSTRAINT chk_journal_source CHECK (
                document_id IS NOT NULL OR adjusting_entry_id IS NOT NULL
            )');
        }

        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropForeign(['period_closing_id']);
            $table->dropColumn('period_closing_id');
        });
    }
};

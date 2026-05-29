<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('adjusting_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->uuid('parent_entry_id')->nullable();
            $table->string('ref_number')->nullable();
            $table->date('entry_date');
            $table->string('description')->nullable();
            $table->enum('status', ['draft', 'posted'])->default('draft');
            $table->foreignUuid('created_by')->references('id')->on('users');
            $table->timestamps();
        });

        // Self-referential FK must be added after the table (and its PK) is fully created
        DB::statement('ALTER TABLE adjusting_entries ADD CONSTRAINT adjusting_entries_parent_entry_id_foreign FOREIGN KEY (parent_entry_id) REFERENCES adjusting_entries (id) ON DELETE SET NULL');

        // Add the deferred FK from journal_entries.adjusting_entry_id now that adjusting_entries exists
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->foreign('adjusting_entry_id')->references('id')->on('adjusting_entries')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropForeign(['adjusting_entry_id']);
        });
        DB::statement('ALTER TABLE adjusting_entries DROP CONSTRAINT IF EXISTS adjusting_entries_parent_entry_id_foreign');
        Schema::dropIfExists('adjusting_entries');
    }
};

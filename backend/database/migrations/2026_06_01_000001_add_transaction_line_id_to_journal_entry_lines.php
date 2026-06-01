<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entry_lines', function (Blueprint $table) {
            $table->foreignUuid('transaction_line_id')
                  ->nullable()
                  ->after('account_id')
                  ->references('id')->on('transaction_lines')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('journal_entry_lines', function (Blueprint $table) {
            $table->dropForeign(['transaction_line_id']);
            $table->dropColumn('transaction_line_id');
        });
    }
};

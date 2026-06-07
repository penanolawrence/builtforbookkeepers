<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Drop the old FK (subtype_id → subtypes)
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->dropForeign(['subtype_id']);
        });

        // 2. Nullify existing values — old subtypes UUIDs don't exist in chart_of_account_subtypes
        DB::table('transaction_lines')->update(['subtype_id' => null]);

        // 3. Add new FK (subtype_id → chart_of_account_subtypes)
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->foreign('subtype_id')
                  ->references('id')->on('chart_of_account_subtypes')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->dropForeign(['subtype_id']);
        });

        DB::table('transaction_lines')->update(['subtype_id' => null]);

        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->foreign('subtype_id')
                  ->references('id')->on('subtypes')
                  ->nullOnDelete();
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('adjusting_entry_lines', function (Blueprint $table) {
            $table->dropForeign(['subtype_id']);
        });

        DB::table('adjusting_entry_lines')->update(['subtype_id' => null]);

        Schema::table('adjusting_entry_lines', function (Blueprint $table) {
            $table->foreign('subtype_id')
                  ->references('id')->on('chart_of_account_subtypes')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('adjusting_entry_lines', function (Blueprint $table) {
            $table->dropForeign(['subtype_id']);
        });

        DB::table('adjusting_entry_lines')->update(['subtype_id' => null]);

        Schema::table('adjusting_entry_lines', function (Blueprint $table) {
            $table->foreign('subtype_id')
                  ->references('id')->on('subtypes')
                  ->nullOnDelete();
        });
    }
};

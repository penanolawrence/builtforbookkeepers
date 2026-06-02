<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('adjusting_entry_lines', function (Blueprint $table) {
            $table->foreignUuid('subtype_id')
                  ->nullable()
                  ->after('account_id')
                  ->references('id')->on('subtypes')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('adjusting_entry_lines', function (Blueprint $table) {
            $table->dropForeign(['subtype_id']);
            $table->dropColumn('subtype_id');
        });
    }
};

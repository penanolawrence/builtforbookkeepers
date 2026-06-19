<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chart_of_account_subtypes', function (Blueprint $table) {
            $table->unique(['name', 'chart_of_account_id'], 'cas_name_coa_unique');
        });
    }

    public function down(): void
    {
        Schema::table('chart_of_account_subtypes', function (Blueprint $table) {
            $table->dropUnique('cas_name_coa_unique');
        });
    }
};

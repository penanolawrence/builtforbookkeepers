<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add chart_of_account_id FK (nullable — VAT accounts have no CoA entry)
        Schema::table('accounts', function (Blueprint $table) {
            $table->foreignUuid('chart_of_account_id')
                  ->nullable()
                  ->after('company_id')
                  ->references('id')->on('chart_of_accounts')
                  ->nullOnDelete();
        });

        // 2. Expand type ENUM — PostgreSQL stores this as a CHECK constraint
        DB::statement("ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check");
        DB::statement("ALTER TABLE accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('income','expense','cash','vat','equity'))");
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropForeign(['chart_of_account_id']);
            $table->dropColumn('chart_of_account_id');
        });

        DB::statement("ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check");
        DB::statement("ALTER TABLE accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('income','expense','cash','vat'))");
    }
};

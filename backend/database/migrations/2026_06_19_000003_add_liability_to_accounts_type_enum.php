<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check");
            DB::statement("ALTER TABLE accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('income','expense','cash','vat','equity','liability'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check");
            DB::statement("ALTER TABLE accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('income','expense','cash','vat','equity'))");
        }
    }
};

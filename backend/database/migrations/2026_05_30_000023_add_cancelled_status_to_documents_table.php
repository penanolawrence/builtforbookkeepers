<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check");
            DB::statement("ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status IN ('processing','parked','posted','failed','returned','rejected','approved','cancelled'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check");
            DB::statement("ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status IN ('processing','parked','posted','failed','returned','rejected','approved'))");
        }
    }
};

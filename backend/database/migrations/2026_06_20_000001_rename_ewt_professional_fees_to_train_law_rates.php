<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('chart_of_accounts')
            ->where('code', '2210')
            ->where('name', 'EWT Payable — Professional Fees (10%/15%)')
            ->update(['name' => 'EWT Payable — Professional Fees (5%/10%)']);
    }

    public function down(): void
    {
        DB::table('chart_of_accounts')
            ->where('code', '2210')
            ->where('name', 'EWT Payable — Professional Fees (5%/10%)')
            ->update(['name' => 'EWT Payable — Professional Fees (10%/15%)']);
    }
};

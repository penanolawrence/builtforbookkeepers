<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chart_of_account_subtypes', function (Blueprint $table) {
            $table->uuid('chart_of_account_id')->nullable()->change();
            $table->string('code', 10)->nullable()->change();
            $table->unsignedSmallInteger('sort_order')->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('chart_of_account_subtypes', function (Blueprint $table) {
            $table->uuid('chart_of_account_id')->nullable(false)->change();
            $table->string('code', 10)->nullable(false)->change();
            $table->unsignedSmallInteger('sort_order')->change();
        });
    }
};

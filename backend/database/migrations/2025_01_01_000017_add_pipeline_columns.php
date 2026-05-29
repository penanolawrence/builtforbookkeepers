<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('internal_status')->default('PENDING')->after('status');
            $table->string('merchant_name')->nullable()->after('internal_status');
            $table->decimal('vat_amount', 15, 2)->nullable()->after('amount');
            $table->string('payment_method')->nullable()->after('vat_amount');
            $table->string('category')->nullable()->after('payment_method');
            $table->foreignUuid('account_id')->nullable()->references('id')->on('accounts')->nullOnDelete()->after('category');
            $table->boolean('is_no_receipt')->default(false)->after('account_id');
            $table->boolean('is_ocr_failed')->default(false)->after('is_no_receipt');
        });

        Schema::table('journal_entries', function (Blueprint $table) {
            $table->boolean('is_past_period')->default(false)->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn([
                'internal_status', 'merchant_name', 'vat_amount',
                'payment_method', 'category', 'account_id',
                'is_no_receipt', 'is_ocr_failed',
            ]);
        });

        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropColumn('is_past_period');
        });
    }
};

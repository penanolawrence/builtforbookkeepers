<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Extend documents.status to include returned, rejected, approved
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check");
            DB::statement("ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status IN ('processing','parked','posted','failed','returned','rejected','approved'))");
        }

        Schema::table('documents', function (Blueprint $table) {
            $table->string('file_type')->nullable()->after('storage_path');
            $table->text('return_note')->nullable()->after('is_ocr_failed');
            $table->foreignUuid('returned_by')->nullable()->references('id')->on('users')->nullOnDelete()->after('return_note');
            $table->timestamp('returned_at')->nullable()->after('returned_by');
            $table->timestamp('expires_at')->nullable()->after('returned_at');
            $table->text('rejection_reason')->nullable()->after('expires_at');
            $table->foreignUuid('rejected_by')->nullable()->references('id')->on('users')->nullOnDelete()->after('rejection_reason');
            $table->timestamp('rejected_at')->nullable()->after('rejected_by');
            $table->foreignUuid('approved_by')->nullable()->references('id')->on('users')->nullOnDelete()->after('rejected_at');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
        });

        // Extend adjusting_entries.status to include pending, approved, rejected
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE adjusting_entries DROP CONSTRAINT IF EXISTS adjusting_entries_status_check");
            DB::statement("ALTER TABLE adjusting_entries ADD CONSTRAINT adjusting_entries_status_check CHECK (status IN ('draft','posted','pending','approved','rejected'))");
        }

        Schema::table('adjusting_entries', function (Blueprint $table) {
            $table->string('type')->nullable()->after('description');
            $table->timestamp('submitted_at')->nullable()->after('type');
            $table->foreignUuid('approved_by')->nullable()->references('id')->on('users')->nullOnDelete()->after('submitted_at');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->foreignUuid('rejected_by')->nullable()->references('id')->on('users')->nullOnDelete()->after('approved_at');
            $table->text('rejection_reason')->nullable()->after('rejected_by');
            $table->timestamp('rejected_at')->nullable()->after('rejection_reason');
        });

        // Add Phase 4 payment columns
        Schema::table('payments', function (Blueprint $table) {
            $table->date('date_received')->nullable()->after('amount');
            $table->string('reference_number')->nullable()->after('date_received');
            $table->foreignUuid('recorded_by')->nullable()->references('id')->on('users')->nullOnDelete()->after('reference_number');
        });

        // Add message to notifications
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('message')->nullable()->after('type');
        });

        // Add previous/new columns to accountant_assignment_logs
        Schema::table('accountant_assignment_logs', function (Blueprint $table) {
            $table->foreignUuid('previous_accountant_id')->nullable()->references('id')->on('users')->nullOnDelete()->after('company_id');
            $table->foreignUuid('new_accountant_id')->nullable()->references('id')->on('users')->nullOnDelete()->after('previous_accountant_id');
            $table->foreignUuid('changed_by')->nullable()->references('id')->on('users')->nullOnDelete()->after('new_accountant_id');
            $table->timestamp('changed_at')->nullable()->after('changed_by');
        });
    }

    public function down(): void
    {
        Schema::table('accountant_assignment_logs', function (Blueprint $table) {
            $table->dropForeign(['previous_accountant_id']);
            $table->dropForeign(['new_accountant_id']);
            $table->dropForeign(['changed_by']);
            $table->dropColumn(['previous_accountant_id', 'new_accountant_id', 'changed_by', 'changed_at']);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn('message');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['recorded_by']);
            $table->dropColumn(['date_received', 'reference_number', 'recorded_by']);
        });

        Schema::table('adjusting_entries', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropForeign(['rejected_by']);
            $table->dropColumn(['type', 'submitted_at', 'approved_by', 'approved_at', 'rejected_by', 'rejection_reason', 'rejected_at']);
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['returned_by']);
            $table->dropForeign(['rejected_by']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['file_type', 'return_note', 'returned_by', 'returned_at', 'expires_at', 'rejection_reason', 'rejected_by', 'rejected_at', 'approved_by', 'approved_at']);
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check");
            DB::statement("ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status IN ('processing','parked','posted','failed'))");

            DB::statement("ALTER TABLE adjusting_entries DROP CONSTRAINT IF EXISTS adjusting_entries_status_check");
            DB::statement("ALTER TABLE adjusting_entries ADD CONSTRAINT adjusting_entries_status_check CHECK (status IN ('draft','posted'))");
        }
    }
};

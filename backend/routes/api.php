<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AdjustingEntryController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BIRController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\QueueController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SubtypeController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\Admin;
use App\Http\Controllers\Accountant;
use Illuminate\Support\Facades\Route;

// Public routes — no auth required
Route::post('/auth/login',         [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/auth/setup',         [AuthController::class, 'setupPassword']);
Route::get('/auth/validate-token', [AuthController::class, 'validateToken']);
Route::post('/leads',              [LeadController::class, 'store'])->middleware('throttle:10,1');

// Authenticated — all roles
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/auth/logout',   [AuthController::class, 'logout']);
    Route::get('/auth/me',        [AuthController::class, 'me']);
    Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);

    Route::get('/accounts', [AccountController::class, 'index']);

    Route::get('/notifications',            [NotificationController::class, 'index']);
    Route::get('/notifications/count',      [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/mark-read', [NotificationController::class, 'markRead']);

    // Document signed URL — available to all authenticated users (client, accountant, admin)
    Route::get('/documents/{id}/image', [DocumentController::class, 'getSignedUrl']);

    // Document upload — available to clients, accountants, and admins
    Route::post('/documents', [DocumentController::class, 'upload'])->middleware(['throttle:30,1', 'client.active']);

    // Manual entry — available to clients, accountants, and admins
    Route::post('/documents/manual', [DocumentController::class, 'manualEntry'])->middleware(['throttle:30,1', 'client.active']);

    // Client routes
    Route::middleware(['role:client', 'client.active'])->group(function () {
        Route::get('/documents',                [DocumentController::class, 'index']);
        Route::get('/documents/{id}',           [DocumentController::class, 'show']);
        Route::get('/documents/{id}/status',    [DocumentController::class, 'getStatus']);
        Route::post('/documents/{id}/reupload', [DocumentController::class, 'reupload']);
        Route::post('/documents/{id}/cancel',   [DocumentController::class, 'cancel']);
    });

    // Reports and BIR books — all authenticated roles; client.active blocks suspended/inactive clients
    Route::middleware('client.active')->group(function () {
        Route::get('/reports/income-statement',      [ReportController::class, 'incomeStatement']);
        Route::get('/reports/expense-breakdown',     [ReportController::class, 'expenseBreakdown']);
        Route::get('/reports/income-statement/pdf',  [ReportController::class, 'exportPDF'])->defaults('type', 'income-statement');
        Route::get('/reports/expense-breakdown/pdf', [ReportController::class, 'exportPDF'])->defaults('type', 'expense-breakdown');
        Route::get('/bir/{book}',     [BIRController::class, 'getBook']);
        Route::get('/bir/{book}/pdf', [BIRController::class, 'exportPDF']);
    });

    // Accountant-only routes
    Route::middleware('role:accountant')->group(function () {
        Route::get('/accountant/clients',                [Accountant\ClientController::class, 'index']);
        Route::get('/accountant/clients/{id}',           [Accountant\ClientController::class, 'show']);
        Route::get('/accountant/clients/{id}/documents', [Accountant\ClientController::class, 'getDocuments']);
    });

    // Accountant + Admin shared routes
    Route::middleware('role:accountant,admin')->group(function () {
        Route::get('/queue',                [QueueController::class, 'index']);
        Route::get('/queue/{id}',           [QueueController::class, 'show']);
        Route::post('/queue/{id}/approve',  [QueueController::class, 'approve']);
        Route::post('/queue/{id}/return',   [QueueController::class, 'return']);
        Route::post('/queue/{id}/reject',   [QueueController::class, 'reject']);
        Route::post('/queue/batch-approve', [QueueController::class, 'batchApprove']);

        Route::get('/adjusting-entries',      [AdjustingEntryController::class, 'index']);
        Route::get('/adjusting-entries/{id}', [AdjustingEntryController::class, 'show']);
        Route::post('/adjusting-entries',               [AdjustingEntryController::class, 'create']);
        Route::patch('/adjusting-entries/{id}',         [AdjustingEntryController::class, 'update']);
        Route::post('/adjusting-entries/{id}/submit',   [AdjustingEntryController::class, 'submit']);
        Route::delete('/adjusting-entries/{id}',        [AdjustingEntryController::class, 'delete']);
        Route::post('/adjusting-entries/{id}/resubmit', [AdjustingEntryController::class, 'resubmit']);

        Route::get('/documents/client/{clientId}', [DocumentController::class, 'clientDocuments']);

        Route::get('/subtypes',  [SubtypeController::class, 'index']);
        Route::post('/subtypes', [SubtypeController::class, 'store']);

        // Chart of accounts + reset access — accountants access only their assigned clients
        Route::get('/admin/clients/{id}/accounts',      [Admin\ChartOfAccountsController::class, 'index']);
        Route::put('/admin/clients/{id}/accounts',      [Admin\ChartOfAccountsController::class, 'update']);
        Route::post('/admin/clients/{id}/reset-access', [Admin\ClientController::class, 'resetAccess']);
    });

    // Admin routes
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/dashboard', [Admin\DashboardController::class, 'index']);

        Route::get('/admin/clients',                        [Admin\ClientController::class, 'index']);
        Route::post('/admin/clients',                       [Admin\ClientController::class, 'store']);
        Route::get('/admin/clients/{id}',                   [Admin\ClientController::class, 'show']);
        Route::patch('/admin/clients/{id}',                 [Admin\ClientController::class, 'update']);
        Route::patch('/admin/clients/{id}/plan',            [Admin\ClientController::class, 'updatePlan']);
        Route::post('/admin/clients/{id}/suspend',          [Admin\ClientController::class, 'suspend']);
        Route::post('/admin/clients/{id}/reactivate',       [Admin\ClientController::class, 'reactivate']);
        Route::post('/admin/clients/{id}/deactivate',       [Admin\ClientController::class, 'deactivate']);
        Route::post('/admin/clients/{id}/mark-overdue',     [Admin\ClientController::class, 'markOverdue']);
        Route::post('/admin/clients/{id}/reassign',         [Admin\ClientController::class, 'reassignAccountant']);
        Route::get('/admin/clients/{id}/documents',         [Admin\ClientController::class, 'getDocuments']);

        Route::get('/admin/accountants',                       [Admin\AccountantController::class, 'index']);
        Route::post('/admin/accountants',                      [Admin\AccountantController::class, 'store']);
        Route::get('/admin/accountants/{id}',                  [Admin\AccountantController::class, 'show']);
        Route::post('/admin/accountants/{id}/reset-password',  [Admin\AccountantController::class, 'resetPassword']);
        Route::post('/admin/accountants/{id}/deactivate',      [Admin\AccountantController::class, 'deactivate']);
        Route::put('/admin/accountants/{id}',                  [Admin\AccountantController::class, 'update']);

        Route::get('/admin/billing',            [Admin\BillingController::class, 'index']);
        Route::get('/admin/billing/{clientId}', [Admin\BillingController::class, 'clientPayments']);
        Route::post('/admin/billing/{clientId}',[Admin\BillingController::class, 'receivePayment']);

        Route::post('/adjusting-entries/{id}/approve', [AdjustingEntryController::class, 'approve']);
        Route::post('/adjusting-entries/{id}/reject',  [AdjustingEntryController::class, 'rejectEntry']);
    });

}); // end auth:sanctum

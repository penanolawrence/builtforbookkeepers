<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Subtype;
use App\Models\TransactionLine;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Users ────────────────────────────────────────────────────

        $admin = User::where('role', 'admin')->firstOrFail();

        $accountant = User::firstOrCreate(
            ['email' => 'maria@sofiabooks.ph'],
            [
                'name'       => 'Maria Santos',
                'password'   => Hash::make('Accountant@2026!'),
                'role'       => 'accountant',
                'status'     => 'active',
                'mobile'     => '09990001111',
                'company_id' => null,
            ]
        );

        // ── 2. Company ──────────────────────────────────────────────────

        $company = Company::firstOrCreate(
            ['name' => 'ABC Trading Corp.'],
            [
                'mobile'         => '09990002222',
                'email'          => 'abc@trading.ph',
                'tin'            => '123-456-789-000',
                'contact_person' => 'Juan dela Cruz',
                'bir_type'       => 'vat',
                'plan'           => 'growth',
                'accountant_id'  => $accountant->id,
            ]
        );

        $client = User::firstOrCreate(
            ['email' => 'client@abctrading.ph'],
            [
                'name'       => 'ABC Trading Corp.',
                'password'   => Hash::make('Client@2026!'),
                'role'       => 'client',
                'status'     => 'active',
                'mobile'     => '09990002222',
                'username'   => 'abctrading',
                'company_id' => $company->id,
            ]
        );

        $this->command->info("Company:    {$company->name} (VAT, {$company->plan})");
        $this->command->info("Accountant: {$accountant->email} / Accountant@2026!");
        $this->command->info("Client:     {$client->email} / Client@2026!");

        // ── 3. Chart of accounts ────────────────────────────────────────

        $coa = [
            // Cash / payment accounts (system-managed)
            ['code' => '1001', 'name' => 'Cash on Hand',           'type' => 'cash',    'is_system_managed' => true],
            ['code' => '1002', 'name' => 'GCash',                  'type' => 'cash',    'is_system_managed' => true],
            ['code' => '1003', 'name' => 'Maya',                   'type' => 'cash',    'is_system_managed' => true],
            ['code' => '1004', 'name' => 'Bank',                   'type' => 'cash',    'is_system_managed' => true],
            // VAT accounts (system-managed)
            ['code' => '1101', 'name' => 'Input VAT',              'type' => 'vat',     'is_system_managed' => true],
            ['code' => '2101', 'name' => 'Output VAT',             'type' => 'vat',     'is_system_managed' => true],
            // Income
            ['code' => '4001', 'name' => 'Sales Revenue',          'type' => 'income',  'is_system_managed' => false],
            ['code' => '4002', 'name' => 'Service Revenue',        'type' => 'income',  'is_system_managed' => false],
            ['code' => '4003', 'name' => 'Other Income',           'type' => 'income',  'is_system_managed' => false],
            // Expense
            ['code' => '5001', 'name' => 'Utilities Expense',      'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5002', 'name' => 'Supplies Expense',       'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5003', 'name' => 'Rent Expense',           'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5004', 'name' => 'Transportation Expense', 'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5005', 'name' => 'Meals and Entertainment','type' => 'expense', 'is_system_managed' => false],
            ['code' => '5006', 'name' => 'Communication Expense',  'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5007', 'name' => 'Taxes and Licenses',     'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5008', 'name' => 'Other Expense',          'type' => 'expense', 'is_system_managed' => false],
        ];

        $accounts = [];
        foreach ($coa as $row) {
            $account = Account::firstOrCreate(
                ['company_id' => $company->id, 'code' => $row['code']],
                [
                    'name'              => $row['name'],
                    'type'              => $row['type'],
                    'is_system_managed' => $row['is_system_managed'],
                    'is_active'         => true,
                ]
            );
            $accounts[$row['code']] = $account;
        }

        $this->command->info('Chart of accounts: ' . count($accounts) . ' accounts seeded.');

        // ── 3b. Subtypes ────────────────────────────────────────────────
        $this->call(SubtypeSeeder::class);
        $subtypeUtilities  = Subtype::where('name', 'Utilities Expense')->firstOrFail();
        $subtypeSalesRev   = Subtype::where('name', 'Sales Revenue')->firstOrFail();

        // ── 4. PARKED document ──────────────────────────────────────────
        // Meralco electricity bill — awaiting accountant review

        if (!Document::where('ref_number', 'OR-2026-0041')->where('company_id', $company->id)->exists()) {
            $parkedDoc = Document::create([
                'company_id'        => $company->id,
                'uploaded_by'       => $client->id,
                'original_filename' => 'meralco-may2026.jpg',
                'storage_path'      => 'documents/demo/meralco-may2026.jpg',
                'file_type'         => 'jpg',
                'file_hash'         => hash('sha256', 'demo-meralco-parked'),
                'document_type'     => 'expense',
                'status'            => 'parked',
                'internal_status'   => 'PARKED',
                'flag'              => 'GREEN',
                'anomaly_reason'    => [],
                'ref_number'        => 'OR-2026-0041',
                'merchant_name'     => 'Meralco',
                'document_date'     => '2026-05-15',
                'amount'            => 3200.00,
                'vat_amount'        => round(3200 * 12 / 112, 2),   // 342.86
                'payment_method'    => 'Bank',
                'category'          => 'Utilities Expense',
                'account_id'        => $accounts['5001']->id,
                'is_no_receipt'     => false,
                'is_ocr_failed'     => false,
            ]);

            $this->command->info("PARKED doc:   {$parkedDoc->ref_number} — Meralco PHP 3,200.00 (flag: GREEN)");

            TransactionLine::create([
                'document_id'  => $parkedDoc->id,
                'account_id'   => $accounts['5001']->id,
                'account_code' => '5001',
                'type'         => 'expense',
                'subtype_id'   => $subtypeUtilities->id,
                'amount'       => 3200.00,
                'description'  => 'Meralco electricity bill',
                'date'         => $parkedDoc->document_date,
            ]);

            // parked docs have no journal entry yet; no JEL link needed

        } else {
            $this->command->warn('PARKED doc already exists — skipped.');
        }

        // ── 5. APPROVED document + journal entry ────────────────────────
        // Cash sale via GCash — already posted to the ledger

        if (!Document::where('ref_number', 'OR-2026-0088')->where('company_id', $company->id)->exists()) {

            // VAT breakdown for PHP 12,000 gross income (VAT-inclusive)
            $gross      = 12000.00;
            $vatAmount  = round($gross * 12 / 112, 2);   // 1,285.71
            $netRevenue = round($gross - $vatAmount, 2);  // 10,714.29

            $approvedDoc = Document::create([
                'company_id'        => $company->id,
                'uploaded_by'       => $client->id,
                'original_filename' => 'gcash-screenshot-may20.jpg',
                'storage_path'      => 'documents/demo/gcash-screenshot-may20.jpg',
                'file_type'         => 'jpg',
                'file_hash'         => hash('sha256', 'demo-gcash-approved'),
                'document_type'     => 'income',
                'status'            => 'approved',
                'internal_status'   => 'PARKED',
                'flag'              => 'GREEN',
                'anomaly_reason'    => [],
                'ref_number'        => 'OR-2026-0088',
                'merchant_name'     => 'ABC Customer #44',
                'document_date'     => '2026-05-20',
                'amount'            => $gross,
                'vat_amount'        => $vatAmount,
                'payment_method'    => 'GCash',
                'category'          => 'Sales Revenue',
                'account_id'        => $accounts['4001']->id,
                'is_no_receipt'     => false,
                'is_ocr_failed'     => false,
                'approved_by'       => $admin->id,
                'approved_at'       => now(),
            ]);

            // Journal entry
            // DEBIT  GCash (1002)            12,000.00
            // CREDIT Sales Revenue (4001)    10,714.29
            // CREDIT Output VAT (2101)        1,285.71

            $journalEntry = JournalEntry::create([
                'company_id'  => $company->id,
                'document_id' => $approvedDoc->id,
                'ref_number'  => $approvedDoc->ref_number,
                'entry_date'  => $approvedDoc->document_date,
                'description' => "GCash sale — {$approvedDoc->merchant_name}",
                'status'      => 'posted',
                'posted_by'   => $admin->id,
                'posted_at'   => now(),
            ]);

            JournalEntryLine::create([
                'journal_entry_id' => $journalEntry->id,
                'account_id'       => $accounts['1002']->id,  // GCash
                'debit'            => $gross,
                'credit'           => null,
                'description'      => 'GCash receipt',
            ]);

            JournalEntryLine::create([
                'journal_entry_id' => $journalEntry->id,
                'account_id'       => $accounts['4001']->id,  // Sales Revenue
                'debit'            => null,
                'credit'           => $netRevenue,
                'description'      => 'Net sales revenue',
            ]);

            JournalEntryLine::create([
                'journal_entry_id' => $journalEntry->id,
                'account_id'       => $accounts['2101']->id,  // Output VAT
                'debit'            => null,
                'credit'           => $vatAmount,
                'description'      => 'Output VAT 12%',
            ]);

            $incomeLine = TransactionLine::create([
                'document_id'  => $approvedDoc->id,
                'account_id'   => $accounts['4001']->id,
                'account_code' => '4001',
                'type'         => 'income',
                'subtype_id'   => $subtypeSalesRev->id,
                'amount'       => $netRevenue,
                'description'  => "GCash sale — {$approvedDoc->merchant_name}",
                'date'         => $approvedDoc->document_date,
            ]);

            // Link the revenue JEL to the transaction line so GL report can resolve subtype
            JournalEntryLine::where('journal_entry_id', $journalEntry->id)
                ->where('account_id', $accounts['4001']->id)
                ->update(['transaction_line_id' => $incomeLine->id]);

            $this->command->info("APPROVED doc: {$approvedDoc->ref_number} — GCash sale PHP {$gross}");
            $this->command->info("  Journal:    {$journalEntry->id}");
            $this->command->info("    DEBIT  GCash            PHP " . number_format($gross, 2));
            $this->command->info("    CREDIT Sales Revenue    PHP " . number_format($netRevenue, 2));
            $this->command->info("    CREDIT Output VAT       PHP " . number_format($vatAmount, 2));

        } else {
            $this->command->warn('APPROVED doc already exists — skipped.');
        }
    }
}

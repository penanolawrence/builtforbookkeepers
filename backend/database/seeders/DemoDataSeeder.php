<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\User;
use App\Services\Accounting\ChartOfAccountsService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Users ────────────────────────────────────────────────────

        User::where('role', 'admin')->firstOrFail();

        $accountant = User::firstOrCreate(
            ['email' => 'maria@builtforbookkeepers.ph'],
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
                'industry_type'  => 'retail',
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

        // ── 3. Chart of accounts (from global template) ─────────────────

        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->command->info('Chart of accounts seeded from global CoA template.');
    }
}

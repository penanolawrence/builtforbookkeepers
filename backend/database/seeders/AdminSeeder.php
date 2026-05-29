<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name'       => 'Admin',
            'email'      => 'admin@sofiabooks.ph',
            'password'   => 'Admin@2026!',
            'role'       => 'admin',
            'status'     => 'active',
            'company_id' => null,
        ]);

        $this->command->info('Admin user created: admin@sofiabooks.ph / Admin@2026!');
        $this->command->warn('Change this password immediately after first login.');
    }
}

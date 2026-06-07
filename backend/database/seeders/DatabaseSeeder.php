<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(AdminSeeder::class);
        $this->call(AccountTypeSeeder::class);
        $this->call(ChartOfAccountSeeder::class);
        $this->call(ChartOfAccountSubtypeSeeder::class);
        $this->call(SubtypeSeeder::class);
        $this->call(DemoDataSeeder::class);
    }
}

<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class AccountFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id'        => Company::factory(),
            'code'              => $this->faker->unique()->numerify('####'),
            'name'              => $this->faker->words(2, true),
            'type'              => $this->faker->randomElement(['income', 'expense']),
            'is_system_managed' => false,
            'is_active'         => true,
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\AccountType;
use Illuminate\Database\Eloquent\Factories\Factory;

class ChartOfAccountFactory extends Factory
{
    public function definition(): array
    {
        return [
            'account_type_id' => AccountType::factory(),
            'code'            => $this->faker->unique()->numerify('####'),
            'name'            => $this->faker->unique()->words(3, true),
            'is_active'       => true,
            'sort_order'      => $this->faker->numberBetween(1, 99),
        ];
    }
}

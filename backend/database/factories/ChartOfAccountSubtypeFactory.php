<?php

namespace Database\Factories;

use App\Models\ChartOfAccount;
use Illuminate\Database\Eloquent\Factories\Factory;

class ChartOfAccountSubtypeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'chart_of_account_id' => ChartOfAccount::factory(),
            'code'                => $this->faker->unique()->bothify('####-##'),
            'name'                => $this->faker->unique()->words(2, true),
            'is_active'           => true,
            'sort_order'          => $this->faker->numberBetween(1, 99),
        ];
    }
}

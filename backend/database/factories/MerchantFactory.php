<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class MerchantFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'name'       => $this->faker->company,
            'tin'        => $this->faker->numerify('###-###-###-###'),
            'address'    => $this->faker->address,
        ];
    }
}

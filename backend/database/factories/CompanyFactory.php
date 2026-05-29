<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class CompanyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'          => $this->faker->company,
            'mobile'        => '09' . $this->faker->numerify('#########'),
            'bir_type'      => 'non_vat',
            'plan'          => 'starter',
            'accountant_id' => null,
        ];
    }
}

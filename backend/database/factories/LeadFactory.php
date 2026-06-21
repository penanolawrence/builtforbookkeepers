<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class LeadFactory extends Factory
{
    public function definition(): array
    {
        return [
            'contact' => $this->faker->safeEmail(),
            'message' => $this->faker->sentence(),
            'is_read' => false,
        ];
    }
}

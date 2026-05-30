<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class SubtypeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->words(2, true),
        ];
    }
}

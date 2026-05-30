<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add subtype_id column
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->foreignUuid('subtype_id')
                  ->nullable()
                  ->after('type')
                  ->references('id')->on('subtypes')
                  ->nullOnDelete();
        });

        // 2. Seed subtypes from existing distinct category values
        $categories = DB::table('transaction_lines')
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->pluck('category');

        $subtypeMap = [];
        foreach ($categories as $name) {
            $name = trim($name);
            if (!$name) continue;
            $existing = DB::table('subtypes')->where('name', $name)->first();
            if ($existing) {
                $subtypeMap[$name] = $existing->id;
            } else {
                $id = (string) Str::uuid();
                DB::table('subtypes')->insert([
                    'id'         => $id,
                    'name'       => $name,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $subtypeMap[$name] = $id;
            }
        }

        // 3. Back-fill subtype_id on existing lines
        foreach ($subtypeMap as $name => $subtypeId) {
            DB::table('transaction_lines')
                ->where('category', $name)
                ->update(['subtype_id' => $subtypeId]);
        }

        // 4. Drop category column
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }

    public function down(): void
    {
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->string('category')->nullable()->after('type');
        });

        DB::statement("
            UPDATE transaction_lines tl
            SET category = s.name
            FROM subtypes s
            WHERE tl.subtype_id = s.id
        ");

        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->dropForeign(['subtype_id']);
            $table->dropColumn('subtype_id');
        });
    }
};

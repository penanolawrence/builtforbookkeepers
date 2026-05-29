<?php

namespace App\Services\Auth;

use App\Models\InviteToken;
use App\Models\User;
use Illuminate\Support\Str;

class InviteTokenService
{
    public function generate(User $user): string
    {
        // Invalidate any existing unused tokens for this user
        $user->inviteTokens()
             ->whereNull('used_at')
             ->update(['used_at' => now()]);

        $rawToken = Str::random(64);

        InviteToken::create([
            'user_id'    => $user->id,
            'token'      => hash('sha256', $rawToken),
            'role'       => $user->role,
            'expires_at' => now()->addDays(30),
            'used_at'    => null,
        ]);

        return $rawToken;
    }

    public function validate(string $rawToken): ?InviteToken
    {
        $hashed = hash('sha256', $rawToken);

        return InviteToken::where('token', $hashed)
                          ->valid()
                          ->first();
    }

    public function consume(InviteToken $token): void
    {
        $token->used_at = now();
        $token->save();
    }
}

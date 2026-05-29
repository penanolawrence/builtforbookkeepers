<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
*/

Broadcast::channel('private-client.{companyId}', function (User $user, $companyId) {
    return $user->role === 'client' && (string) $user->company_id === $companyId;
});

Broadcast::channel('private-accountant.{accountantId}', function (User $user, $accountantId) {
    return ($user->role === 'accountant' || $user->role === 'admin')
           && (string) $user->id === $accountantId;
});

Broadcast::channel('private-admin.1', function (User $user) {
    return $user->role === 'admin';
});

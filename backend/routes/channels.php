<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
*/

Broadcast::channel('client.{companyId}', function (User $user, $companyId) {
    return $user->role === 'client' && (string) $user->company_id === $companyId;
});

Broadcast::channel('accountant.{accountantId}', function (User $user, $accountantId) {
    return ($user->role === 'accountant' || $user->role === 'admin')
           && (string) $user->id === $accountantId;
});

Broadcast::channel('admin.1', function (User $user) {
    return $user->role === 'admin';
});

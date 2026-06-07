<?php

namespace App\Services\Notification;

use App\Events\NotificationCreated;
use App\Mail\AdminNotificationMail;
use App\Models\Company;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    public function notifyAccountant(User $acc, string $type, string $msg): void
    {
        $notification = Notification::create([
            'user_id' => $acc->id,
            'type'    => $type,
            'message' => $msg,
            'data'    => [],
            'read_at' => null,
        ]);

        rescue(fn () => event(new NotificationCreated(
            channel:   "accountant.{$acc->id}",
            id:        $notification->id,
            type:      $type,
            message:   $msg,
            data:      [],
            createdAt: $notification->created_at->toISOString(),
        )));
    }

    public function notifyAdmin(string $type, string $msg, array $data = []): void
    {
        $admin = User::where('role', 'admin')->first();
        if (!$admin) {
            return;
        }

        $notification = Notification::create([
            'user_id' => $admin->id,
            'type'    => $type,
            'message' => $msg,
            'data'    => $data,
            'read_at' => null,
        ]);

        if ($admin->email) {
            Mail::to($admin->email)->send(new AdminNotificationMail($msg, $data));
        }

        rescue(fn () => event(new NotificationCreated(
            channel:   'admin.1',
            id:        $notification->id,
            type:      $type,
            message:   $msg,
            data:      $data,
            createdAt: $notification->created_at->toISOString(),
        )));
    }

    public function sendClientMorningSms(Company $co): void
    {
        $user = $co->users()->where('role', 'client')->first();
        if (!$user) {
            return;
        }

        $notification = Notification::create([
            'user_id' => $user->id,
            'type'    => 'morning_batch',
            'message' => 'You have pending documents. Please follow up with your accountant.',
            'data'    => ['companyId' => $co->id],
            'read_at' => null,
        ]);

        rescue(fn () => event(new NotificationCreated(
            channel:   "client.{$co->id}",
            id:        $notification->id,
            type:      'morning_batch',
            message:   'You have pending documents. Please follow up with your accountant.',
            data:      ['companyId' => $co->id],
            createdAt: $notification->created_at->toISOString(),
        )));

        // TODO: Phase 4f — integrate Semaphore PH SMS gateway here
        // $sms = new \App\Services\SMS\SemaphoreService();
        // $sms->send($user->mobile, $message);
    }
}

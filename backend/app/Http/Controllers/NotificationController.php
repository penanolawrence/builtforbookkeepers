<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(): JsonResponse
    {
        $notifications = Notification::where('user_id', auth()->id())
            ->latest()
            ->limit(10)
            ->get();

        return response()->json($notifications->map(fn ($n) => [
            'id'        => $n->id,
            'type'      => $n->type,
            'message'   => $n->message,
            'data'      => $n->data,
            'readAt'    => $n->read_at?->toIso8601String(),
            'createdAt' => $n->created_at?->toIso8601String(),
        ]));
    }

    public function unreadCount(): JsonResponse
    {
        $count = Notification::where('user_id', auth()->id())
            ->whereNull('read_at')
            ->count();

        return response()->json(['count' => $count]);
    }

    public function markRead(Request $request): JsonResponse
    {
        if ($request->boolean('all')) {
            Notification::where('user_id', auth()->id())->update(['read_at' => now()]);
        } else {
            Notification::where('user_id', auth()->id())
                ->whereIn('id', $request->ids ?? [])
                ->update(['read_at' => now()]);
        }

        return response()->json(['message' => 'Marked as read.']);
    }
}

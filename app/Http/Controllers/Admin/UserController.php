<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', 'in:user,technician,admin'],
        ]);

        $query = User::query();

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%')
                    ->orWhere('phone', 'like', '%' . $search . '%');
            });
        }

        if (!empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        $users = $query
            ->orderByRaw("CASE role WHEN 'admin' THEN 1 WHEN 'technician' THEN 2 ELSE 3 END")
            ->orderBy('name')
            ->get()
            ->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                    'email_verified' => $user->hasVerifiedEmail(),
                    'created_at' => $user->created_at?->format('M d, Y'),
                ];
            })
            ->values();

        return Inertia::render('Admin/Users', [
            'users' => $users,
            'currentUserId' => auth()->id(),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'role' => $filters['role'] ?? '',
            ],
            'summary' => [
                'total' => User::count(),
                'customers' => User::where('role', 'user')->count(),
                'technicians' => User::where('role', 'technician')->count(),
                'admins' => User::where('role', 'admin')->count(),
            ],
        ]);
    }

    public function updateRole(Request $request, User $user)
    {
        $validated = $request->validate([
            'role' => ['required', 'in:user,technician,admin'],
        ]);

        if ($user->id === auth()->id()) {
            return back()->withErrors([
                'role' => 'You cannot change your own admin role.',
            ]);
        }

        $oldRole = $user->role;
        $newRole = $validated['role'];

        if ($oldRole === $newRole) {
            return back()->with('success', 'User role is already set to ' . $newRole . '.');
        }

        if ($oldRole === 'technician' && $newRole !== 'technician') {
            $activeAssignments = $user->technicianInquiries()
                ->whereNotIn('status', ['completed', 'cancelled'])
                ->count();

            if ($activeAssignments > 0) {
                return back()->withErrors([
                    'role' => 'This technician still has active inquiries assigned. Reassign those inquiries before changing their role.',
                ]);
            }
        }

        $user->update([
            'role' => $newRole,
        ]);

        return back()->with('success', 'User role updated successfully.');
    }
}

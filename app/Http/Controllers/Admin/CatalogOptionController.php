<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CatalogOption;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CatalogOptionController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'field' => ['required', Rule::in(['category', 'warranty', 'badge'])],
            'value' => ['required', 'string', 'max:120'],
        ]);

        $value = trim($validated['value']);

        if ($value === '') {
            return back()->withErrors(['value' => 'Enter a non-empty option value.']);
        }

        CatalogOption::query()->firstOrCreate([
            'field' => $validated['field'],
            'value' => $value,
        ]);

        return back()->with('success', ucfirst($validated['field']) . ' option added.');
    }

    public function destroy(Request $request)
    {
        $validated = $request->validate([
            'field' => ['required', Rule::in(['category', 'warranty', 'badge'])],
            'value' => ['required', 'string', 'max:120'],
        ]);

        $deleted = CatalogOption::query()
            ->where('field', $validated['field'])
            ->where('value', trim($validated['value']))
            ->delete();

        if ($deleted === 0) {
            return back()->with('success', 'That option was already removed.');
        }

        return back()->with('success', ucfirst($validated['field']) . ' option removed from the dropdown. Existing catalog items are unchanged.');
    }
}

<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatbotController extends Controller
{
    public function reply(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:8'],
            'messages.*.role' => ['required', 'in:user,assistant'],
            'messages.*.content' => ['required', 'string', 'max:1500'],
        ]);

        $apiKey = config('services.gemini.key');

        if (!$apiKey) {
            Log::warning('SecureView chatbot request blocked: Gemini API key is not configured.');

            return response()->json([
                'message' => 'The AI assistant is not configured yet. Please contact Netmax Trading or send an inquiry through the Services page.',
            ], 503);
        }

        $contents = collect($validated['messages'])->map(function (array $message) {
            return [
                'role' => $message['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $message['content']]],
            ];
        })->values()->all();

        $systemInstruction = <<<'PROMPT'
You are SecureView Assistant for Netmax Trading, a Philippine CCTV and IT services business.
Be friendly, concise, professional, and clear. Help visitors understand the website, CCTV products/packages, installation, site inspection, maintenance, repair, consultation, booking, checkout, and service inquiries.
Known website guidance:
- Visitors can browse Products and Packages and read their listed details.
- To request Installation, Site Inspection, Maintenance, Repair, Consultation, or Other, open Services or Make an Inquiry and complete the inquiry form.
- Customers can choose an available date and time slot, but it is a preference until the team confirms it.
- Product/package checkout and cart features require a signed-in, verified account.
- The company has operated across Luzon, Visayas, and Mindanao, but service availability must be confirmed for the specific location.
- For an unlisted service, choose Other and explain the request.
Do not invent prices, stock, exact coverage, availability, warranties, technical specifications, or booking confirmations. You do not have live access to inventory, customer orders, or booking schedules. If information depends on a specific product or location, direct the visitor to the relevant catalog page or to make an inquiry at /inquiry. You may direct them to /products, /packages, /services, /about, and /inquiry.
Never ask for passwords, payment details, or sensitive personal information. Do not claim to create, confirm, cancel, or change bookings or purchases. If unsure, say so and guide the visitor to the Services page or inquiry form.
PROMPT;

        try {
            $model = config('services.gemini.model', 'gemini-2.5-flash');
            $response = Http::acceptJson()
                ->withHeaders(['x-goog-api-key' => $apiKey])
                ->timeout(25)
                ->post(
                    'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent',
                    [
                        'systemInstruction' => [
                            'parts' => [['text' => $systemInstruction]],
                        ],
                        'contents' => $contents,
                        'generationConfig' => [
                            'temperature' => 0.35,
                            'maxOutputTokens' => 400,
                        ],
                    ]
                );

            if (!$response->successful()) {
                $googleErrorCode = $response->json('error.status');
                $googleErrorMessage = $response->json('error.message', 'No error message provided');
                Log::warning('SecureView Gemini API request failed.', [
                    'http_status' => $response->status(),
                    'error_code' => $googleErrorCode,
                    'error_message' => $googleErrorMessage,
                    'model' => $model,
                ]);

                if ($response->status() === 429) {
                    return response()->json([
                        'message' => 'Our AI assistant has reached its current usage limit. Please try again later or send us an inquiry through the Services page.',
                    ], 429);
                }

                if (in_array($response->status(), [401, 403], true)) {
                    return response()->json([
                        'message' => 'Our AI assistant is having a configuration issue. Please contact Netmax Trading or send us an inquiry through the Services page.',
                    ], 503);
                }

                if ($response->status() === 400 || $response->status() === 404) {
                    return response()->json([
                        'message' => 'Our AI assistant is temporarily misconfigured. Please try again later or send us an inquiry through the Services page.',
                    ], 502);
                }

                return response()->json([
                    'message' => 'Sorry, the assistant is temporarily unavailable. Please try again shortly or send us an inquiry.',
                ], 502);
            }

            $answer = $response->json('candidates.0.content.parts.0.text');

            if (!is_string($answer) || trim($answer) === '') {
                Log::warning('SecureView Gemini API returned no text candidate.', [
                    'model' => $model,
                    'finish_reason' => $response->json('candidates.0.finishReason'),
                    'prompt_feedback' => $response->json('promptFeedback.blockReason'),
                ]);

                return response()->json([
                    'message' => 'I could not form an answer just now. Please try asking another way or send us an inquiry.',
                ], 502);
            }

            return response()->json(['message' => trim($answer)]);
        } catch (\Throwable $exception) {
            report($exception);

            Log::warning('SecureView chatbot could not reach Gemini API.', [
                'exception' => get_class($exception),
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Sorry, the assistant could not connect right now. Please try again later or use the Services page to contact us.',
            ], 503);
        }
    }
}

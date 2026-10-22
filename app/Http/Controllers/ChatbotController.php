<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
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

        // Answer frequent website FAQs locally so customers do not wait on an external AI request.
        $latestUserMessage = collect($validated['messages'])
            ->reverse()
            ->first(fn (array $message) => $message['role'] === 'user');
        $quickReply = $this->quickReply($latestUserMessage['content'] ?? '');

        if ($quickReply !== null) {
            return response()->json(['message' => $quickReply]);
        }

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
You are SecureView Assistant for Netmax Trading, a Philippine CCTV and IT services business. Be helpful, polite, and direct. Answer in 1–3 short sentences unless the customer needs more detail. Avoid long introductions and repeated information.
Website guidance:
- Customers can browse products at /products and packages at /packages.
- For installation, site inspection, maintenance, repair, consultation, or another service, use /services or submit an inquiry at /inquiry.
- A selected date and time is only a preference until the team confirms the booking.
- Checkout and cart require a signed-in, email-verified account.
- The company has operated across Luzon, Visayas, and Mindanao; availability for a specific address must be confirmed.
- For an unlisted service, choose Other and explain the request.
Do not invent prices, stock, coverage, availability, warranty terms, technical specifications, or booking status. You do not have live access to inventory, orders, or schedules. Guide product-specific or location-specific questions to the relevant page or an inquiry. Never request passwords, payment details, or sensitive personal information. Do not claim to create, confirm, cancel, or change an order or booking.
PROMPT;

        try {
            $model = config('services.gemini.model', 'gemini-2.5-flash');
            $generationConfig = ['maxOutputTokens' => 240];

            if (str_starts_with($model, 'gemini-3.')) {
                // Gemini 3 supports thinking levels; low keeps a customer FAQ response fast.
                $generationConfig['thinkingConfig'] = ['thinkingLevel' => 'low'];
            } else {
                $generationConfig['temperature'] = 0.35;
            }

            $response = Http::acceptJson()
                ->withHeaders(['x-goog-api-key' => $apiKey])
                ->connectTimeout(5)
                ->timeout(25)
                ->post(
                    'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent',
                    [
                        'systemInstruction' => [
                            'parts' => [['text' => $systemInstruction]],
                        ],
                        'contents' => $contents,
                        'generationConfig' => $generationConfig,
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
        } catch (ConnectionException $exception) {
            Log::warning('SecureView chatbot timed out or could not connect to Gemini.', [
                'model' => $model,
                'exception' => get_class($exception),
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'The AI assistant took too long to connect or respond. Please try again shortly. If this keeps happening, check your internet connection and Google AI API availability.',
            ], 504);
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
    /**
     * Return a fast, trusted response for common SecureView website questions.
     * Return null for anything that needs a model-generated answer.
     */
    private function quickReply(string $message): ?string
    {
        $text = mb_strtolower(trim($message));
        $text = preg_replace('/[^\\pL\\pN]+/u', ' ', $text) ?? $text;
        $text = trim($text);

        if (preg_match('/^(hi|hello|hey|good morning|good afternoon|good evening|kumusta)$/u', $text)) {
            return "Hi! I’m SecureView Assistant. I can help you find CCTV products and packages or explain how to request a service.";
        }

        if (preg_match('/\\b(what services do you offer|what service do you offer|what can secureview do|what can netmax do|what do you do)\\b/u', $text)) {
            return "We can help with CCTV installation, site inspection, maintenance, repair, consultation, and other CCTV/IT requests. Start on the Services page (/services) or send details through the inquiry form (/inquiry).";
        }

        if (preg_match('/\\b(choose|select|pick)\\b.*\\b(date|time|schedule|slot)\\b/u', $text)
            || preg_match('/\\b(date|time|schedule|slot)\\b.*\\b(choose|select|pick)\\b/u', $text)
            || preg_match('/\\b(available|availability)\\b.*\\b(date|time|schedule|slot)\\b/u', $text)
            || preg_match('/\\b(what are the|which are the|show me the)\\b.*\\b(time slots|available slots)\\b/u', $text)) {
            return "You can choose an available preferred date and time when submitting a service request, but the schedule is not confirmed until our team approves it. Visit the Services page (/services) to get started.";
        }

        if ((preg_match('/\\b(book|booking|schedule|arrange|request)\\b/u', $text)
                && preg_match('/\\b(installation|install|technician|service|appointment|inquiry)\\b/u', $text))
            || preg_match('/\\bhow (do|can) i\\b.*\\b(book|schedule|request)\\b/u', $text)) {
            return "To request an installation or another service, open the Services page (/services) and submit the inquiry form (/inquiry). You can choose a preferred time slot; our team will confirm the appointment.";
        }

        if (preg_match('/\\b(included|inclusions|contains|contain|comes with)\\b/u', $text)
            && preg_match('/\\b(package|packages)\\b/u', $text)) {
            return "Open the Packages page (/packages) to compare package details and see the items included in each package.";
        }

        if (preg_match('/\\b(products?|packages?|catalog|catalogue)\\b/u', $text)
            && preg_match('/\\b(what|where|view|browse|see|find|details|list|offer|available|buy|purchase)\\b/u', $text)) {
            return "You can browse CCTV products on the Products page (/products) and bundled offers on the Packages page (/packages). Product pages show the details currently listed by SecureView.";
        }

        if (preg_match('/\\b(service area|service areas|do you serve|cover(?:age)?|coverage area|near me)\\b/u', $text)) {
            return "SecureView has operated across Luzon, Visayas, and Mindanao, but availability depends on the specific location and job. Please send your address and requested service through the inquiry form (/inquiry) so the team can confirm coverage.";
        }

        if (preg_match('/\\b(verify|verification|unverified|confirm my email|email confirmation|email verification)\\b/u', $text)) {
            return "Please open the verification email sent to your registered email address and follow its link. If you cannot find it, check your spam folder or use the resend verification option on the login page.";
        }

        if (preg_match('/\\b(checkout|shopping cart|cart|buy online|purchase online)\\b/u', $text)) {
            return "To add items to your cart or check out, sign in with an account that has a verified email. You can browse Products (/products) and Packages (/packages) before signing in.";
        }

        return null;
    }
}

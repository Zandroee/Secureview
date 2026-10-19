import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "../../css/chatbot.css";

const welcomeMessage = {
    role: "assistant",
    content: "Hi! I’m SecureView Assistant. Ask me about our CCTV products, services, or how to make an inquiry.",
};

const suggestedQuestions = [
    "What services do you offer?",
    "How do I book an installation?",
    "Can I choose my schedule?",
];

// Gemini may return escaped Markdown (for example, \\*\\*bold\\*\\*) or
// literal \\n sequences. Normalize those before displaying the answer.
function normalizeAssistantText(content = "") {
    return String(content)
        .replace(/\\\\r\\\\n/g, "\n")
        .replace(/\\\\n/g, "\n")
        .replace(/\\\\r/g, "\n")
        .replace(/\\\\t/g, " ")
        .replace(/\\\\([\\\\*_`])/g, "$1")
        .trim();
}

function renderAssistantContent(content) {
    const normalized = normalizeAssistantText(content);
    const lines = normalized.split("\n");

    return lines.map((line, lineIndex) => {
        // Render internal routes as friendly links instead of exposing raw paths.
        const tokens = line.split(/(\\*\\*.*?\\*\\*|\\/(?:services|inquiry|products|packages|about)\\b)/gi);

        return (
            <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                {tokens.map((token, tokenIndex) => {
                    const routeLabels = {
                        "/services": "Services page",
                        "/inquiry": "inquiry form",
                        "/products": "Products page",
                        "/packages": "Packages page",
                        "/about": "About page",
                    };

                    if (routeLabels[token]) {
                        return (
                            <a key={tokenIndex} href={token}>
                                {routeLabels[token]}
                            </a>
                        );
                    }

                    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
                        return <strong key={tokenIndex}>{token.slice(2, -2)}</strong>;
                    }

                    return <span key={tokenIndex}>{token}</span>;
                })}
            </span>
        );
    });
}

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([welcomeMessage]);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState("");
    const messageListRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const sendMessage = async (text = input) => {
        const content = text.trim();
        if (!content || isSending) return;

        const userMessage = { role: "user", content };
        const history = [...messages.slice(1), userMessage].slice(-8);
        while (history.length > 0 && history[0].role !== "user") history.shift();
        setMessages((previous) => [...previous, userMessage]);
        setInput("");
        setError("");
        setIsSending(true);

        try {
            const response = await axios.post("/chatbot/message", {
                messages: history,
            });
            setMessages((previous) => [
                ...previous,
                { role: "assistant", content: response.data.message },
            ]);
        } catch (requestError) {
            const message =
                requestError.response?.data?.message ||
                "I’m having trouble responding right now. Please try again in a moment.";
            setError(message);
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    return (
        <div className="secureview-chatbot">
            {isOpen && (
                <section className="sv-chat-panel" aria-label="SecureView AI chat">
                    <header className="sv-chat-header">
                        <div className="sv-chat-avatar" aria-hidden="true">
                            <i className="bi bi-chat-dots-fill" />
                        </div>
                        <div className="sv-chat-heading">
                            <strong>SecureView Assistant</strong>
                            <span><span className="sv-chat-status-dot" /> Online help</span>
                        </div>
                        <button
                            type="button"
                            className="sv-chat-close"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close chat"
                        >
                            <i className="bi bi-x-lg" />
                        </button>
                    </header>

                    <div className="sv-chat-messages" ref={messageListRef} aria-live="polite">
                        {messages.map((message, index) => (
                            <div
                                className={`sv-chat-row ${message.role === "user" ? "sv-chat-row-user" : ""}`}
                                key={`${index}-${message.role}`}
                            >
                                <div className={`sv-chat-bubble ${message.role === "user" ? "sv-chat-bubble-user" : ""}`}>
                                    {message.role === "assistant"
                                        ? renderAssistantContent(message.content)
                                        : message.content}
                                </div>
                            </div>
                        ))}
                        {isSending && (
                            <div className="sv-chat-row">
                                <div className="sv-chat-bubble sv-chat-typing">Thinking…</div>
                            </div>
                        )}
                        {messages.length === 1 && (
                            <div className="sv-chat-suggestions">
                                <span>Try asking</span>
                                {suggestedQuestions.map((question) => (
                                    <button
                                        type="button"
                                        key={question}
                                        disabled={isSending}
                                        onClick={() => sendMessage(question)}
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        )}
                        {error && <p className="sv-chat-error" role="alert">{error}</p>}
                    </div>

                    <form
                        className="sv-chat-form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            sendMessage();
                        }}
                    >
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="Ask a question…"
                            maxLength={1500}
                            aria-label="Your message"
                            disabled={isSending}
                        />
                        <button type="submit" disabled={isSending || !input.trim()} aria-label="Send message">
                            <i className="bi bi-send-fill" />
                        </button>
                    </form>
                    <p className="sv-chat-privacy">AI answers may be inaccurate. Don’t share passwords or payment details.</p>
                </section>
            )}

            <button
                type="button"
                className="sv-chat-launcher"
                onClick={() => setIsOpen((open) => !open)}
                aria-label={isOpen ? "Close SecureView chat" : "Chat with SecureView"}
                aria-expanded={isOpen}
            >
                <i className={isOpen ? "bi bi-x-lg" : "bi bi-chat-dots-fill"} />
                {!isOpen && <span>Ask us</span>}
            </button>
        </div>
    );
}

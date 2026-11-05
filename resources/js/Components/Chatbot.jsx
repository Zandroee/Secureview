import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import "../../css/chatbot.css";

const welcomeMessage = {
    role: "assistant",
    content: "Hi! I’m the Netmax Trading Assistant. Ask me about our CCTV products, packages, or services.",
};

const suggestedQuestions = [
    "What services do you offer?",
    "How do I book an installation?",
    "Can I choose my schedule?",
];

function normalizeAssistantText(content = "") {
    return String(content)
        .replace(/\\r\\n/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\n")
        .replace(/\\t/g, " ")
        .replace(/\\([\\*_])/g, "$1")
        .trim();
}

function renderAssistantContent(content) {
    const normalized = normalizeAssistantText(content);
    const lines = normalized.split("\n");

    return lines.map((line, lineIndex) => {
        const tokens = line.split(/(\*\*.*?\*\*|\/(?:services|inquiry|products|packages|about)\b)/gi);
        return (
            <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                {tokens.map((token, tokenIndex) => {
                    const routeLabels = {
                        "/services": "Services page",
                        "/inquiry": "service request form",
                        "/products": "Products page",
                        "/packages": "Packages page",
                        "/about": "About page",
                    };

                    if (routeLabels[token]) {
                        return <a key={tokenIndex} href={token}>{routeLabels[token]}</a>;
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

function requestsHumanSupport(content = "") {
    return /\b(talk|speak|chat|connect|transfer|refer)\b.{0,45}\b(person|human|agent|admin|staff|representative|someone|support|customer service|real person)\b|\b(real person|human agent|live agent|talk to someone|speak to someone|customer service representative)\b/i.test(content);
}

function supportMessagesToChat(messages = []) {
    return messages.map((message) => ({
        role: message.role || (message.sender_type === "customer" ? "user" : message.sender_type === "admin" ? "admin" : "assistant"),
        content: message.content || message.body || "",
        senderName: message.sender_name || message.senderName || "",
        id: message.id,
        createdAt: message.created_at,
    }));
}

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([welcomeMessage]);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState("");
    const [handoffSuggested, setHandoffSuggested] = useState(false);
    const [isStartingHandoff, setIsStartingHandoff] = useState(false);
    const [supportConversation, setSupportConversation] = useState(null);
    const messageListRef = useRef(null);
    const inputRef = useRef(null);
    const launcherRef = useRef(null);

    const applySupportResponse = useCallback((data) => {
        if (!data?.conversation) {
            setSupportConversation(null);
            return;
        }

        setSupportConversation(data.conversation);
        setMessages([welcomeMessage, ...supportMessagesToChat(data.messages)]);
        setHandoffSuggested(false);
        setError("");
    }, []);

    const refreshSupportConversation = useCallback(async (conversationId = null) => {
        try {
            const response = conversationId
                ? await axios.get(`/chatbot/conversations/${conversationId}`)
                : await axios.get("/chatbot/conversation");

            if (response.data?.conversation) {
                applySupportResponse(response.data);
            } else if (!conversationId) {
                setSupportConversation(null);
            }
        } catch (requestError) {
            if (requestError.response?.status === 404) {
                setSupportConversation(null);
            }
        }
    }, [applySupportResponse]);

    useEffect(() => {
        const openChat = () => setIsOpen(true);
        window.addEventListener("netmax:open-chat", openChat);
        return () => window.removeEventListener("netmax:open-chat", openChat);
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;

        inputRef.current?.focus();
        refreshSupportConversation();

        const handleKeyDown = (event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            setIsOpen(false);
            window.requestAnimationFrame(() => launcherRef.current?.focus());
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, refreshSupportConversation]);

    useEffect(() => {
        if (!isOpen || !supportConversation?.id) return undefined;

        const timer = window.setInterval(() => {
            refreshSupportConversation(supportConversation.id);
        }, 4000);

        return () => window.clearInterval(timer);
    }, [isOpen, supportConversation?.id, refreshSupportConversation]);

    useEffect(() => {
        if (isOpen && messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const beginHumanSupport = async (transcript = messages.slice(1), reason = "Customer requested a team member.") => {
        if (isStartingHandoff || supportConversation) return;

        const context = transcript.length
            ? transcript.slice(-12).map((message) => ({
                role: message.role === "user" ? "user" : "assistant",
                content: String(message.content || "").slice(0, 1500),
            }))
            : [{ role: "user", content: "I would like to speak with a member of the team." }];

        setIsStartingHandoff(true);
        setIsSending(true);
        setError("");
        setHandoffSuggested(false);

        try {
            const response = await axios.post("/chatbot/handoff", {
                messages: context,
                reason,
            });
            applySupportResponse(response.data);
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                "We could not connect you to the team right now. Please try again."
            );
        } finally {
            setIsStartingHandoff(false);
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    const sendMessage = async (text = input) => {
        const content = text.trim();
        if (!content || isSending) return;

        const userMessage = { role: "user", content };
        setInput("");
        setError("");

        if (supportConversation) {
            if (supportConversation.status === "closed") {
                setError("This conversation is closed. Start a new conversation to contact the team.");
                return;
            }

            setMessages((previous) => [...previous, userMessage]);
            setIsSending(true);
            try {
                await axios.post(
                    `/chatbot/conversations/${supportConversation.id}/messages`,
                    { content }
                );
                await refreshSupportConversation(supportConversation.id);
            } catch (requestError) {
                setError(requestError.response?.data?.message || "Your message could not be sent. Please try again.");
            } finally {
                setIsSending(false);
                inputRef.current?.focus();
            }
            return;
        }

        const transcript = [...messages.slice(1), userMessage].slice(-12);
        setMessages((previous) => [...previous, userMessage]);

        if (requestsHumanSupport(content)) {
            await beginHumanSupport(transcript, "Customer explicitly requested to speak with a person.");
            return;
        }

        const history = [...messages.slice(1), userMessage].slice(-6);
        while (history.length > 0 && history[0].role !== "user") history.shift();

        setIsSending(true);
        setHandoffSuggested(false);

        try {
            const response = await axios.post("/chatbot/message", { messages: history });
            setMessages((previous) => [
                ...previous,
                { role: "assistant", content: response.data.message },
            ]);
            setHandoffSuggested(Boolean(response.data.handoff_suggested));
        } catch (requestError) {
            const message =
                requestError.response?.data?.message ||
                "I’m having trouble responding right now. You can ask our team for help below.";
            setMessages((previous) => [...previous, { role: "assistant", content: message }]);
            setHandoffSuggested(
                requestError.response?.data?.handoff_suggested !== false
            );
            setError("");
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    const statusLabel = !supportConversation
        ? "AI assistant"
        : supportConversation.status === "waiting"
            ? "Waiting for a team member"
            : supportConversation.status === "closed"
                ? "Conversation closed"
                : supportConversation.assigned_admin_name
                    ? `Chatting with ${supportConversation.assigned_admin_name}`
                    : "Netmax Trading support";

    const startNewConversation = () => {
        setSupportConversation(null);
        setMessages([welcomeMessage]);
        setHandoffSuggested(false);
        setError("");
    };

    return (
        <div className="secureview-chatbot">
            {isOpen && (
                <section
                    id="netmax-chat-panel"
                    className="sv-chat-panel"
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby="netmax-chat-title"
                >
                    <header className="sv-chat-header">
                        <div className="sv-chat-avatar" aria-hidden="true">
                            <i className="bi bi-headset" />
                        </div>
                        <div className="sv-chat-heading">
                            <strong id="netmax-chat-title">
                                {supportConversation ? "Netmax Trading Support" : "Netmax Trading Assistant"}
                            </strong>
                            <span>
                                <span className={"sv-chat-status-dot " + (supportConversation?.status === "waiting" ? "sv-chat-status-waiting" : "")} />
                                {statusLabel}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="sv-chat-close"
                            onClick={() => {
                                setIsOpen(false);
                                window.requestAnimationFrame(() => launcherRef.current?.focus());
                            }}
                            aria-label="Close chat"
                        >
                            <i className="bi bi-x-lg" />
                        </button>
                    </header>

                    <div className="sv-chat-messages" ref={messageListRef} aria-live="polite">
                        {messages.map((message, index) => (
                            <div
                                className={
                                    "sv-chat-row " +
                                    (message.role === "user" ? "sv-chat-row-user " : "") +
                                    (message.role === "admin" ? "sv-chat-row-admin" : "")
                                }
                                key={message.id || `${index}-${message.role}`}
                            >
                                <div className={
                                    "sv-chat-bubble " +
                                    (message.role === "user" ? "sv-chat-bubble-user " : "") +
                                    (message.role === "admin" ? "sv-chat-bubble-admin" : "")
                                }>
                                    {message.role === "admin" && message.senderName && (
                                        <strong className="sv-chat-sender-name">{message.senderName}</strong>
                                    )}
                                    {message.role === "assistant"
                                        ? renderAssistantContent(message.content)
                                        : message.content}
                                </div>
                            </div>
                        ))}

                        {isSending && (
                            <div className="sv-chat-row">
                                <div className="sv-chat-bubble sv-chat-typing">
                                    {supportConversation ? "Sending…" : isStartingHandoff ? "Connecting you with our team…" : "Thinking…"}
                                </div>
                            </div>
                        )}

                        {messages.length === 1 && !supportConversation && (
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

                        {!supportConversation && (
                            <div className="sv-chat-handoff-card">
                                <div>
                                    <strong>{handoffSuggested ? "Need a more specific answer?" : "Prefer to talk to our team?"}</strong>
                                    <span>
                                        {handoffSuggested
                                            ? "A Netmax Trading team member can help with questions the assistant cannot fully resolve."
                                            : "Request a real person at any time. Our admin team will continue the conversation here."}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="sv-chat-handoff-button"
                                    onClick={() => beginHumanSupport(messages.slice(1), "Customer requested a live conversation with the team.")}
                                    disabled={isSending || isStartingHandoff}
                                >
                                    <i className="bi bi-person-lines-fill me-2" />
                                    {isStartingHandoff ? "Connecting…" : "Talk to our team"}
                                </button>
                            </div>
                        )}

                        {supportConversation?.status === "waiting" && (
                            <div className="sv-chat-support-notice" role="status">
                                <i className="bi bi-clock-history me-2" />
                                Your message is in the support queue. A team member will reply here.
                            </div>
                        )}

                        {supportConversation?.status === "closed" && (
                            <div className="sv-chat-support-notice" role="status">
                                This conversation has been closed by the support team.
                                <button type="button" onClick={startNewConversation}>Start a new conversation</button>
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
                            placeholder={supportConversation ? "Message Netmax Trading support…" : "Ask a question…"}
                            maxLength={1500}
                            aria-label="Your message"
                            disabled={isSending || supportConversation?.status === "closed"}
                        />
                        <button type="submit" disabled={isSending || !input.trim() || supportConversation?.status === "closed"} aria-label="Send message">
                            <i className="bi bi-send-fill" />
                        </button>
                    </form>
                    <p className="sv-chat-privacy">
                        Please don’t share passwords, card details, or other sensitive information.
                    </p>
                </section>
            )}

            <button
                type="button"
                ref={launcherRef}
                className="sv-chat-launcher"
                onClick={() => setIsOpen((open) => !open)}
                aria-label={isOpen ? "Close Netmax Trading chat" : "Chat with Netmax Trading"}
                aria-expanded={isOpen}
                aria-controls="netmax-chat-panel"
            >
                <i className={isOpen ? "bi bi-x-lg" : "bi bi-chat-dots-fill"} />
                {!isOpen && <span>Chat with us</span>}
            </button>
        </div>
    );
}

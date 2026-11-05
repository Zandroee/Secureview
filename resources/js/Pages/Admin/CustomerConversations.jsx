import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Sidebar from "../../Components/Admin/Sidebar";

function formatTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function statusLabel(status) {
    return status === "waiting" ? "Waiting for admin"
        : status === "active" ? "In conversation"
            : "Closed";
}

export default function CustomerConversations({ conversations: initialConversations = [] }) {
    const [conversations, setConversations] = useState(initialConversations);
    const [selectedId, setSelectedId] = useState(initialConversations[0]?.id ?? null);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("open");
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState("");
    const messagesRef = useRef(null);
    const replyRef = useRef(null);

    const refreshList = useCallback(async () => {
        try {
            const response = await axios.get("/admin/customer-conversations/list");
            setConversations(response.data.conversations || []);
        } catch {
            // Keep the last inbox snapshot visible during a temporary network issue.
        }
    }, []);

    const loadConversation = useCallback(async (id, showLoading = false) => {
        if (!id) return;
        if (showLoading) setIsLoading(true);
        try {
            const response = await axios.get(`/admin/customer-conversations/${id}`);
            setSelectedConversation(response.data.conversation);
            setMessages(response.data.messages || []);
            setError("");
            refreshList();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to load this conversation.");
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [refreshList]);

    useEffect(() => {
        refreshList();
        const timer = window.setInterval(refreshList, 6000);
        return () => window.clearInterval(timer);
    }, [refreshList]);

    useEffect(() => {
        if (!selectedId) {
            setSelectedConversation(null);
            setMessages([]);
            return undefined;
        }

        loadConversation(selectedId, true);
        const timer = window.setInterval(() => loadConversation(selectedId), 5000);
        return () => window.clearInterval(timer);
    }, [selectedId, loadConversation]);

    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages]);

    const filteredConversations = useMemo(() => {
        const query = search.trim().toLowerCase();
        return conversations.filter((conversation) => {
            const matchesStatus = statusFilter === "all"
                || (statusFilter === "open" && conversation.status !== "closed")
                || conversation.status === statusFilter;
            const matchesSearch = !query || [
                conversation.customer_name,
                conversation.customer_email,
                conversation.subject,
                conversation.last_message,
            ].filter(Boolean).join(" ").toLowerCase().includes(query);
            return matchesStatus && matchesSearch;
        });
    }, [conversations, search, statusFilter]);

    const waitingCount = conversations.filter((item) => item.status === "waiting").length;
    const unreadCount = conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);

    const sendReply = async (event) => {
        event.preventDefault();
        const content = reply.trim();
        if (!content || !selectedId || isSending || selectedConversation?.status === "closed") return;

        setIsSending(true);
        setError("");
        try {
            const response = await axios.post(
                `/admin/customer-conversations/${selectedId}/messages`,
                { content }
            );
            setSelectedConversation(response.data.conversation);
            setMessages(response.data.messages || []);
            setReply("");
            refreshList();
            replyRef.current?.focus();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Your reply could not be sent. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    const updateStatus = async (status) => {
        if (!selectedId) return;
        setError("");
        try {
            const response = await axios.patch(
                `/admin/customer-conversations/${selectedId}/status`,
                { status }
            );
            setSelectedConversation(response.data.conversation);
            setMessages(response.data.messages || []);
            refreshList();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "The conversation status could not be updated.");
        }
    };

    return (
        <div className="container-fluid px-0" style={{ fontFamily: "Outfit, sans-serif" }}>
            <div className="row g-0">
                <aside className="col-12 col-xl-2">
                    <Sidebar active="customer-conversations" />
                </aside>

                <main className="col-12 col-xl-10 p-3 p-lg-4" style={{ background: "var(--bs-tertiary-bg)", minHeight: "100vh" }}>
                    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
                        <div>
                            <div className="small text-primary fw-bold text-uppercase mb-1">Customer support</div>
                            <h1 className="h3 fw-bold mb-1">Customer Conversations</h1>
                            <p className="text-muted mb-0">Step in when a visitor requests a person or needs help beyond the assistant.</p>
                        </div>
                        <button type="button" className="btn btn-outline-primary" onClick={refreshList}>
                            <i className="bi bi-arrow-clockwise me-2" />Refresh inbox
                        </button>
                    </div>

                    <div className="row g-3 mb-3">
                        <div className="col-6 col-lg-3">
                            <div className="card border-0 shadow-sm h-100"><div className="card-body">
                                <div className="small text-muted">Waiting for admin</div>
                                <div className="h3 fw-bold mb-0 text-warning">{waitingCount}</div>
                            </div></div>
                        </div>
                        <div className="col-6 col-lg-3">
                            <div className="card border-0 shadow-sm h-100"><div className="card-body">
                                <div className="small text-muted">Unread customer messages</div>
                                <div className="h3 fw-bold mb-0 text-primary">{unreadCount}</div>
                            </div></div>
                        </div>
                    </div>

                    {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

                    <div className="row g-3 align-items-stretch">
                        <section className="col-12 col-lg-4">
                            <div className="card border-0 shadow-sm h-100" style={{ minHeight: "620px" }}>
                                <div className="card-header bg-body border-bottom p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <strong>Inbox</strong>
                                        <span className="badge text-bg-primary">{filteredConversations.length}</span>
                                    </div>
                                    <input
                                        type="search"
                                        className="form-control form-control-sm mb-2"
                                        placeholder="Search customer or message"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        aria-label="Search conversations"
                                    />
                                    <select className="form-select form-select-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter conversations by status">
                                        <option value="open">Open conversations</option>
                                        <option value="waiting">Waiting for admin</option>
                                        <option value="active">In conversation</option>
                                        <option value="closed">Closed</option>
                                        <option value="all">All conversations</option>
                                    </select>
                                </div>

                                <div className="list-group list-group-flush overflow-auto" style={{ maxHeight: "670px" }}>
                                    {filteredConversations.length ? filteredConversations.map((conversation) => (
                                        <button
                                            type="button"
                                            key={conversation.id}
                                            className={"list-group-item list-group-item-action text-start border-0 border-bottom p-3 " + (selectedId === conversation.id ? "active" : "")}
                                            onClick={() => setSelectedId(conversation.id)}
                                        >
                                            <div className="d-flex justify-content-between align-items-start gap-2">
                                                <strong className="text-truncate">{conversation.customer_name}</strong>
                                                {Number(conversation.unread_count) > 0 && (
                                                    <span className={"badge rounded-pill " + (selectedId === conversation.id ? "text-bg-light text-primary" : "text-bg-primary")}>{conversation.unread_count}</span>
                                                )}
                                            </div>
                                            <div className={"small text-truncate mt-1 " + (selectedId === conversation.id ? "text-white-50" : "text-muted")}>
                                                {conversation.last_message || conversation.subject || "Conversation started"}
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center gap-2 mt-2">
                                                <span className={"small " + (selectedId === conversation.id ? "text-white-50" : "text-muted")}>{statusLabel(conversation.status)}</span>
                                                <span className={"small text-nowrap " + (selectedId === conversation.id ? "text-white-50" : "text-muted")}>{formatTime(conversation.last_message_at)}</span>
                                            </div>
                                        </button>
                                    )) : (
                                        <div className="text-center text-muted small py-5 px-3">
                                            No conversations match this view.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="col-12 col-lg-8">
                            <div className="card border-0 shadow-sm h-100" style={{ minHeight: "620px" }}>
                                {selectedConversation ? (
                                    <>
                                        <div className="card-header bg-body p-3 border-bottom">
                                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                                                <div className="min-w-0">
                                                    <h2 className="h5 fw-bold mb-1 text-truncate">{selectedConversation.customer_name}</h2>
                                                    <div className="small text-muted">
                                                        {selectedConversation.customer_email || "Guest visitor"} · {selectedConversation.subject || "Website chat support"}
                                                    </div>
                                                </div>
                                                <div className="d-flex flex-wrap align-items-center gap-2">
                                                    <span className={"badge " + (selectedConversation.status === "waiting" ? "text-bg-warning" : selectedConversation.status === "active" ? "text-bg-success" : "text-bg-secondary")}>
                                                        {statusLabel(selectedConversation.status)}
                                                    </span>
                                                    {selectedConversation.status !== "closed" ? (
                                                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => updateStatus("closed")}>Close conversation</button>
                                                    ) : (
                                                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => updateStatus("active")}>Reopen conversation</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-grow-1 overflow-auto p-3 p-md-4" ref={messagesRef} style={{ height: "470px", background: "var(--bs-tertiary-bg)" }}>
                                            {isLoading && !messages.length ? (
                                                <div className="text-center text-muted py-5"><span className="spinner-border spinner-border-sm me-2" />Loading conversation…</div>
                                            ) : messages.map((message) => (
                                                <div key={message.id} className={"d-flex mb-3 " + (message.sender_type === "admin" ? "justify-content-end" : "justify-content-start")}>
                                                    <div style={{ maxWidth: "min(82%, 620px)" }}>
                                                        <div className={"small fw-semibold mb-1 " + (message.sender_type === "admin" ? "text-end text-primary" : "text-muted")}>
                                                            {message.sender_name}
                                                        </div>
                                                        <div className={"rounded-3 px-3 py-2 " + (message.sender_type === "admin" ? "bg-primary text-white" : "bg-body border")} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.5 }}>
                                                            {message.body}
                                                        </div>
                                                        <div className="small text-muted mt-1">{formatTime(message.created_at)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {selectedConversation.status === "waiting" && (
                                                <div className="small text-warning-emphasis text-center py-2">This customer is waiting for a team member to reply.</div>
                                            )}
                                        </div>

                                        <form className="card-footer bg-body p-3" onSubmit={sendReply}>
                                            <div className="d-flex gap-2 align-items-end">
                                                <textarea
                                                    ref={replyRef}
                                                    className="form-control"
                                                    rows={2}
                                                    maxLength={1500}
                                                    placeholder={selectedConversation.status === "closed" ? "Reopen the conversation to reply." : "Write a reply to the customer…"}
                                                    value={reply}
                                                    onChange={(event) => setReply(event.target.value)}
                                                    disabled={selectedConversation.status === "closed" || isSending}
                                                />
                                                <button type="submit" className="btn btn-primary fw-bold align-self-stretch" disabled={!reply.trim() || isSending || selectedConversation.status === "closed"}>
                                                    {isSending ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-send-fill me-2" />Send</>}
                                                </button>
                                            </div>
                                            <div className="small text-muted mt-2">Replies appear in the visitor’s chat widget while the page is open. Keep customer details and payment information private.</div>
                                        </form>
                                    </>
                                ) : (
                                    <div className="d-flex flex-column align-items-center justify-content-center text-center p-5 h-100">
                                        <i className="bi bi-chat-square-text display-4 text-primary mb-3" />
                                        <h2 className="h5 fw-bold">Select a conversation</h2>
                                        <p className="text-muted mb-0">Customer chat requests will appear in the inbox on the left.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}

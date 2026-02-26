import { useEffect, useState, useRef } from "react";
import { adminMockService } from "../../services/adminMockService";
import { Send, MessageSquareOff, Clock, CheckCircle } from "lucide-react";
import "./adminPages.css";

export default function AdminSupport() {
    const [tickets, setTickets] = useState([]);
    const [activeTicketId, setActiveTicketId] = useState(null);
    const [replyText, setReplyText] = useState("");
    const messagesEndRef = useRef(null);

    useEffect(() => {
        setTickets(adminMockService.getTickets());
    }, []);

    const activeTicket = tickets.find((t) => t.id === activeTicketId);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [activeTicket?.messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!replyText.trim() || !activeTicketId) return;

        const newMessage = {
            sender: "admin",
            text: replyText.trim(),
            timestamp: new Date().toISOString(),
        };

        const updatedTickets = adminMockService.addTicketMessage(activeTicketId, newMessage);
        setTickets(updatedTickets);
        setReplyText("");
    };

    const toggleStatus = () => {
        if (!activeTicket) return;
        const newStatus = activeTicket.status === "Open" ? "Resolved" : "Open";
        const updatedTickets = adminMockService.updateTicketStatus(activeTicketId, newStatus);
        setTickets(updatedTickets);
    };

    const getStatusIcon = (status) => {
        if (status === "Resolved") return <CheckCircle size={14} color="#10b981" />;
        return <Clock size={14} color="#f59e0b" />;
    };

    return (
        <div className="admin-page" style={{ paddingBottom: 0 }}>
            <div className="admin-page-header" style={{ marginBottom: "16px" }}>
                <h2>Support Help Desk</h2>
                <p className="muted">Respond to user inquiries and technical issues.</p>
            </div>

            <div className="admin-support-layout">
                {/* Left Pane: Ticket List */}
                <div className="admin-support-list">
                    <div className="admin-support-list-header">
                        Active Tickets ({tickets.length})
                    </div>
                    <div className="admin-support-tickets">
                        {tickets.map((t) => (
                            <div
                                key={t.id}
                                className={`admin-ticket-item ${t.id === activeTicketId ? "active" : ""}`}
                                onClick={() => setActiveTicketId(t.id)}
                            >
                                <div className="admin-ticket-title">{t.subject}</div>
                                <div className="admin-ticket-meta">
                                    <span>{t.userName}</span>
                                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        {getStatusIcon(t.status)} {t.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {tickets.length === 0 && (
                            <div style={{ padding: "24px", textAlign: "center", color: "#999" }}>
                                No active tickets.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane: Chat Window */}
                {activeTicket ? (
                    <div className="admin-support-chat">
                        <div className="admin-chat-header">
                            <div>
                                <strong style={{ display: "block", fontSize: "15px" }}>{activeTicket.userName}</strong>
                                <span className="muted">{activeTicket.subject}</span>
                            </div>
                            <button
                                className={`admin-btn ${activeTicket.status === "Open" ? "admin-btn-outline" : "admin-btn-ghost"}`}
                                style={{ padding: "6px 12px", fontSize: "13px" }}
                                onClick={toggleStatus}
                            >
                                Mark as {activeTicket.status === "Open" ? "Resolved" : "Open"}
                            </button>
                        </div>

                        <div className="admin-chat-messages">
                            {activeTicket.messages.map((msg, i) => (
                                <div key={i} className={`admin-msg ${msg.sender}`}>
                                    <div className="admin-msg-text">{msg.text}</div>
                                    <div className="admin-msg-time">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className="admin-chat-input" onSubmit={handleSend}>
                            <input
                                type="text"
                                placeholder="Type your reply to the user..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                disabled={activeTicket.status === "Resolved"}
                            />
                            <button
                                type="submit"
                                className="admin-chat-send"
                                disabled={!replyText.trim() || activeTicket.status === "Resolved"}
                                style={{ opacity: (!replyText.trim() || activeTicket.status === "Resolved") ? 0.5 : 1 }}
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="admin-support-chat admin-chat-empty">
                        <MessageSquareOff size={48} opacity={0.3} />
                        <p>Select a ticket to view the conversation</p>
                    </div>
                )}
            </div>
        </div>
    );
}

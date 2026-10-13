import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import AdminPagination from "../../Components/Admin/AdminPagination";
import { Link, router } from "@inertiajs/react";
import { useState } from "react";

function paymentClass(status) {
    if (status === "paid") {
        return "bg-success-subtle text-success";
    }

    if (status === "failed") {
        return "bg-danger-subtle text-danger";
    }

    return "bg-warning-subtle text-warning-emphasis";
}

function orderClass(status) {
    if (status === "completed" || status === "delivered") {
        return "bg-success-subtle text-success";
    }

    if (status === "cancelled" || status === "payment_failed") {
        return "bg-danger-subtle text-danger";
    }

    if (status === "awaiting_payment") {
        return "bg-warning-subtle text-warning-emphasis";
    }

    return "bg-primary-subtle text-primary";
}

function paymentLabel(method) {
    if (method === "gcash") return "GCash";
    if (method === "card") return "Card";
    if (method === "maya") return "Maya";
    return "Cash";
}

function statusLabel(status) {
    return status.replace(/_/g, " ");
}

export default function AdminTransactions({
    transactions = [],
    summary = {},
    filters = {},
}) {
    const transactionRows = transactions.data ?? (Array.isArray(transactions) ? transactions : []);
    const [search, setSearch] = useState(filters.search ?? "");
    const [paymentStatus, setPaymentStatus] = useState(
        filters.payment_status ?? ""
    );
    const [paymentMethod, setPaymentMethod] = useState(
        filters.payment_method ?? ""
    );
    const [viewingTransaction, setViewingTransaction] = useState(null);

    const applyFilters = (event) => {
        event.preventDefault();

        router.get(
            "/admin/transactions",
            {
                search,
                payment_status: paymentStatus,
                payment_method: paymentMethod,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const clearFilters = () => {
        setSearch("");
        setPaymentStatus("");
        setPaymentMethod("");

        router.get(
            "/admin/transactions",
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    return (
        <div>
            <Navbar />

            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="transactions" />
                    </aside>

                    <main
                        className="col-md-9 col-lg-10 p-3 p-md-4"
                        style={{
                            backgroundColor: "#f5f6f8",
                            minHeight: "75vh",
                            fontFamily: "Outfit, sans-serif",
                        }}
                    >
                        <div className="mb-4">
                            <div className="small text-primary fw-bold">
                                SECUREVIEW ADMIN
                            </div>

                            <h1 className="fw-bold mb-1">
                                TRANSACTION LOGS
                            </h1>

                            <div className="small text-muted">
                                Review payment and order transaction records.
                            </div>
                        </div>

                        <div className="row g-3 mb-3">
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        TOTAL TRANSACTIONS
                                    </div>

                                    <div className="h4 fw-bold mb-0">
                                        {summary.total ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        PAID
                                    </div>

                                    <div className="h4 fw-bold text-success mb-0">
                                        {summary.paid ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        PENDING
                                    </div>

                                    <div className="h4 fw-bold text-warning-emphasis mb-0">
                                        {summary.pending ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        PAID AMOUNT
                                    </div>

                                    <div className="h4 fw-bold text-primary mb-0">
                                        ₱{Number(
                                            summary.paid_amount ?? 0
                                        ).toLocaleString()}
                                    </div>

                                    {summary.failed > 0 && (
                                        <div className="small text-danger mt-1">
                                            {summary.failed} failed
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div
                            className="bg-white border rounded-3 p-3 mb-3"
                            style={{
                                boxShadow:
                                    "0 3px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <form
                                className="row g-2 align-items-end"
                                onSubmit={applyFilters}
                            >
                                <div className="col-lg-6">
                                    <label className="form-label small fw-semibold mb-1">
                                        SEARCH
                                    </label>

                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Order number, customer, email, or payment ID"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                    />
                                </div>

                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">
                                        PAYMENT
                                    </label>

                                    <select
                                        className="form-select"
                                        value={paymentStatus}
                                        onChange={(event) =>
                                            setPaymentStatus(
                                                event.target.value
                                            )
                                        }
                                    >
                                        <option value="">All payment</option>
                                        <option value="pending">
                                            Pending
                                        </option>
                                        <option value="paid">Paid</option>
                                        <option value="failed">
                                            Failed
                                        </option>
                                    </select>
                                </div>

                                <div className="col-sm-6 col-lg-2">
                                    <label className="form-label small fw-semibold mb-1">
                                        METHOD
                                    </label>

                                    <select
                                        className="form-select"
                                        value={paymentMethod}
                                        onChange={(event) =>
                                            setPaymentMethod(event.target.value)
                                        }
                                    >
                                        <option value="">All methods</option>
                                        <option value="cash">Cash</option>
                                        <option value="gcash">GCash</option>
                                        <option value="card">Card</option>
                                        <option value="maya">Maya</option>
                                    </select>
                                </div>

                                <div className="col-6 col-lg-1 d-grid">
                                    <button
                                        type="submit"
                                        className="btn btn-primary fw-bold"
                                    >
                                        FILTER
                                    </button>
                                </div>

                                <div className="col-6 col-lg-1 d-grid">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary fw-bold"
                                        onClick={clearFilters}
                                    >
                                        CLEAR
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div
                            className="bg-white border rounded-3"
                            style={{
                                boxShadow:
                                    "0 3px 12px rgba(0,0,0,0.05)",
                            }}
                        >
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">
                                                TRANSACTION
                                            </th>
                                            <th>CUSTOMER</th>
                                            <th>AMOUNT</th>
                                            <th>METHOD</th>
                                            <th>PAYMENT</th>
                                            <th>DATE</th>
                                            <th className="text-end pe-3">
                                                ACTION
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {transactionRows.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="7"
                                                    className="text-center text-muted py-5"
                                                >
                                                    No transaction records found.
                                                </td>
                                            </tr>
                                        ) : (
                                            transactionRows.map((transaction) => (
                                                <tr key={transaction.id}>
                                                    <td className="ps-3">
                                                        <div className="fw-semibold">
                                                            {transaction.transaction_id ||
                                                                "Cash Transaction"}
                                                        </div>

                                                        <div className="small text-muted">
                                                            {transaction.order_number}
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold">
                                                            {transaction.customer_name}
                                                        </div>

                                                        <div className="small text-muted text-break">
                                                            {transaction.customer_email}
                                                        </div>
                                                    </td>

                                                    <td className="fw-semibold text-primary">
                                                        ₱{Number(
                                                            transaction.amount
                                                        ).toLocaleString()}
                                                    </td>

                                                    <td>
                                                        {paymentLabel(
                                                            transaction.payment_method
                                                        )}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={
                                                                "badge rounded-pill text-capitalize px-2 py-1 " +
                                                                paymentClass(
                                                                    transaction.payment_status
                                                                )
                                                            }
                                                        >
                                                            {statusLabel(
                                                                transaction.payment_status
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="small">
                                                            {transaction.created_at
                                                                ?.split(" ")
                                                                .slice(0, 3)
                                                                .join(" ")}
                                                        </div>

                                                        <div className="small text-muted">
                                                            {transaction.created_at
                                                                ?.split(" ")
                                                                .slice(-2)
                                                                .join(" ")}
                                                        </div>
                                                    </td>

                                                    <td className="text-end pe-3">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-primary btn-sm fw-bold"
                                                            onClick={() =>
                                                                setViewingTransaction(
                                                                    transaction
                                                                )
                                                            }
                                                        >
                                                            VIEW
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <AdminPagination pagination={transactions} label="transactions" insideCard />
                        </div>
                    </main>
                </div>
            </div>

            {viewingTransaction && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                    style={{
                        backgroundColor: "rgba(0,0,0,0.42)",
                        zIndex: 2000,
                        padding: "1rem",
                    }}
                    onClick={() => setViewingTransaction(null)}
                >
                    <div
                        className="bg-white rounded-4 border p-3"
                        style={{
                            width: "100%",
                            maxWidth: "560px",
                            boxShadow: "0 15px 50px rgba(0,0,0,0.2)",
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <div className="small text-primary fw-bold">
                                    {viewingTransaction.order_number}
                                </div>

                                <h4
                                    className="fw-bold mb-0"
                                    style={{
                                        fontFamily: "Outfit, sans-serif",
                                    }}
                                >
                                    TRANSACTION DETAILS
                                </h4>
                            </div>

                            <button
                                type="button"
                                className="btn btn-link btn-sm text-primary text-decoration-none"
                                onClick={() =>
                                    setViewingTransaction(null)
                                }
                            >
                                Back
                            </button>
                        </div>

                        <div className="border rounded-3 p-3 mb-3">
                            <div className="small text-muted">
                                TRANSACTION ID
                            </div>

                            <div className="fw-semibold text-break">
                                {viewingTransaction.transaction_id ||
                                    "Cash Transaction"}
                            </div>

                            {viewingTransaction.checkout_session_id && (
                                <>
                                    <div className="small text-muted mt-3">
                                        CHECKOUT SESSION
                                    </div>

                                    <div className="small text-break">
                                        {
                                            viewingTransaction.checkout_session_id
                                        }
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="border rounded-3 p-3 mb-3">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <div className="small text-muted">
                                        CUSTOMER
                                    </div>

                                    <div className="fw-semibold">
                                        {viewingTransaction.customer_name}
                                    </div>

                                    <div className="small text-muted text-break">
                                        {viewingTransaction.customer_email}
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <div className="small text-muted">
                                        ORDER STATUS
                                    </div>

                                    <span
                                        className={
                                            "badge rounded-pill text-capitalize px-2 py-1 " +
                                            orderClass(
                                                viewingTransaction.order_status
                                            )
                                        }
                                    >
                                        {statusLabel(
                                            viewingTransaction.order_status
                                        )}
                                    </span>
                                </div>

                                <div className="col-md-6">
                                    <div className="small text-muted">
                                        PAYMENT METHOD
                                    </div>

                                    <div className="fw-semibold">
                                        {paymentLabel(
                                            viewingTransaction.payment_method
                                        )}
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <div className="small text-muted">
                                        PAYMENT STATUS
                                    </div>

                                    <span
                                        className={
                                            "badge rounded-pill text-capitalize px-2 py-1 " +
                                            paymentClass(
                                                viewingTransaction.payment_status
                                            )
                                        }
                                    >
                                        {statusLabel(
                                            viewingTransaction.payment_status
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-3 p-3">
                            <div className="d-flex justify-content-between">
                                <span className="small text-muted">
                                    AMOUNT
                                </span>

                                <span className="fw-bold text-primary">
                                    ₱{Number(
                                        viewingTransaction.amount
                                    ).toLocaleString()}
                                </span>
                            </div>

                            <div className="small text-muted mt-3">
                                CREATED: {viewingTransaction.created_at}
                            </div>

                            {viewingTransaction.paid_at && (
                                <div className="small text-muted mt-1">
                                    PAID: {viewingTransaction.paid_at}
                                </div>
                            )}
                        </div>

                        <div className="d-flex justify-content-end mt-3">
                            <button
                                type="button"
                                className="btn btn-outline-primary fw-bold"
                                onClick={() => setViewingTransaction(null)}
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

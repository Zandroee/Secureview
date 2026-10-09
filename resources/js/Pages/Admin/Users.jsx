import Navbar from "../../Components/navbar";
import Footer from "../../Components/footer";
import Sidebar from "../../Components/Admin/Sidebar";
import { router } from "@inertiajs/react";
import { useState } from "react";

function roleClass(role) {
    if (role === "admin") {
        return "bg-primary-subtle text-primary";
    }

    if (role === "technician") {
        return "bg-info-subtle text-info-emphasis";
    }

    return "bg-light text-dark";
}

function roleLabel(role) {
    if (role === "technician") {
        return "Technician";
    }

    if (role === "admin") {
        return "Admin";
    }

    return "Customer";
}

export default function AdminUsers({
    users = [],
    currentUserId = null,
    summary = {},
    filters = {},
}) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [role, setRole] = useState(filters.role ?? "");
    const [roleValues, setRoleValues] = useState(
        () =>
            Object.fromEntries(
                users.map((user) => [user.id, user.role])
            )
    );
    const [savingId, setSavingId] = useState(null);

    const applyFilters = (event) => {
        event.preventDefault();

        router.get(
            "/admin/users",
            {
                search,
                role,
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
        setRole("");

        router.get(
            "/admin/users",
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const updateRole = (user) => {
        setSavingId(user.id);

        router.patch(
            "/admin/users/" + user.id + "/role",
            {
                role: roleValues[user.id] ?? user.role,
            },
            {
                preserveScroll: true,
                onFinish: () => setSavingId(null),
            }
        );
    };

    return (
        <div>
            <Navbar />

            <div className="container-fluid">
                <div className="row">
                    <aside className="col-md-3 col-lg-2 px-0">
                        <Sidebar active="users" />
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
                                USER MANAGEMENT
                            </h1>

                            <div className="small text-muted">
                                Manage customer, technician, and admin roles.
                            </div>
                        </div>

                        <div className="row g-3 mb-3">
                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        TOTAL USERS
                                    </div>

                                    <div className="h4 fw-bold mb-0">
                                        {summary.total ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        CUSTOMERS
                                    </div>

                                    <div className="h4 fw-bold mb-0">
                                        {summary.customers ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        TECHNICIANS
                                    </div>

                                    <div className="h4 fw-bold text-info-emphasis mb-0">
                                        {summary.technicians ?? 0}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-xl-3">
                                <div className="bg-white border rounded-3 p-3 h-100">
                                    <div className="small text-muted">
                                        ADMINS
                                    </div>

                                    <div className="h4 fw-bold text-primary mb-0">
                                        {summary.admins ?? 0}
                                    </div>
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
                                        placeholder="Name, email, or phone"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                    />
                                </div>

                                <div className="col-sm-6 col-lg-3">
                                    <label className="form-label small fw-semibold mb-1">
                                        ROLE
                                    </label>

                                    <select
                                        className="form-select"
                                        value={role}
                                        onChange={(event) =>
                                            setRole(event.target.value)
                                        }
                                    >
                                        <option value="">All roles</option>
                                        <option value="user">
                                            Customer
                                        </option>
                                        <option value="technician">
                                            Technician
                                        </option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div className="col-sm-3 col-lg-1 d-grid">
                                    <button
                                        type="submit"
                                        className="btn btn-primary fw-bold"
                                    >
                                        FILTER
                                    </button>
                                </div>

                                <div className="col-sm-9 col-lg-2 d-grid">
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
                                            <th className="ps-3">USER</th>
                                            <th>PHONE</th>
                                            <th>ROLE</th>
                                            <th>EMAIL</th>
                                            <th>JOINED</th>
                                            <th className="text-end pe-3">
                                                ACTION
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="6"
                                                    className="text-center text-muted py-5"
                                                >
                                                    No users found.
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map((user) => {
                                                const isCurrentUser =
                                                    user.id === currentUserId;
                                                const value =
                                                    roleValues[user.id] ??
                                                    user.role;

                                                return (
                                                    <tr key={user.id}>
                                                        <td className="ps-3">
                                                            <div className="fw-semibold">
                                                                {user.name}
                                                                {isCurrentUser && (
                                                                    <span className="badge bg-light text-dark ms-2">
                                                                        You
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="small text-muted">
                                                                User #{user.id}
                                                            </div>
                                                        </td>

                                                        <td>
                                                            {user.phone || "—"}
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={
                                                                    "badge rounded-pill px-3 py-2 " +
                                                                    roleClass(
                                                                        user.role
                                                                    )
                                                                }
                                                            >
                                                                {roleLabel(
                                                                    user.role
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <div className="text-break">
                                                                {user.email}
                                                            </div>

                                                            <div
                                                                className={
                                                                    "small " +
                                                                    (user.email_verified
                                                                        ? "text-success"
                                                                        : "text-warning-emphasis")
                                                                }
                                                            >
                                                                {user.email_verified
                                                                    ? "Verified"
                                                                    : "Not verified"}
                                                            </div>
                                                        </td>

                                                        <td>{user.created_at}</td>

                                                        <td className="text-end pe-3">
                                                            {isCurrentUser ? (
                                                                <span className="small text-muted">
                                                                    Current admin
                                                                </span>
                                                            ) : (
                                                                <div className="d-flex justify-content-end gap-2">
                                                                    <select
                                                                        className="form-select form-select-sm"
                                                                        style={{
                                                                            width: "145px",
                                                                        }}
                                                                        value={value}
                                                                        onChange={(event) =>
                                                                            setRoleValues(
                                                                                (previous) => ({
                                                                                    ...previous,
                                                                                    [user.id]:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                })
                                                                            )
                                                                        }
                                                                    >
                                                                        <option value="user">
                                                                            Customer
                                                                        </option>
                                                                        <option value="technician">
                                                                            Technician
                                                                        </option>
                                                                        <option value="admin">
                                                                            Admin
                                                                        </option>
                                                                    </select>

                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-primary btn-sm fw-bold"
                                                                        onClick={() =>
                                                                            updateRole(
                                                                                user
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            savingId ===
                                                                            user.id
                                                                        }
                                                                    >
                                                                        {savingId ===
                                                                        user.id
                                                                            ? "SAVING..."
                                                                            : "SAVE"}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            <Footer />
        </div>
    );
}

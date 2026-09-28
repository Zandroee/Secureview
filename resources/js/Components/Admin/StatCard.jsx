export default function StatCard({
    title,
    value,
    growth
}){

    return(
        <div className="card border rounded-3 h-100">
            <div className="card-body p-4">
                <small className="text-muted fw-semibold">
                    {title}
                </small>

                <h3 className="fw-bold mt-2 mb-2">
                    {value}
                </h3>

                <small className={growth >= 0 ? "text-success" :"text-danger"}>
                    {growth >= 0 ? "+" : ""}
                    {growth}% since last week
                </small>
            </div>

        </div>
    );
}
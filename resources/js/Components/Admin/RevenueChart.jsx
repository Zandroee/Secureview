export default function RevenueChart({
    title
}){

    return(
        <div className="card border rounded-3 mt-4">
            <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">

                    <h5 className="fw-bold mb-0">
                        {title}
                    </h5>

                    <small className="text-muted">
                        This Year
                    </small>
                </div>

                <div
                    className="bg-light rounded-3 d-flex justify-content-center align-items-center"
                    style={{
                        height:"300px"
                    }}
                >
                    Revenue Chart
                </div>
            </div>
        </div>
    );
}
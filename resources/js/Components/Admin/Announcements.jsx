export default function Announcements({
    title,
    announcements
}){

    return(
        <div className="card shadow-sm h-100">

            <div className="card-body">

                <h5 className="fw-bold mb-3">
                    {title}
                </h5>

                <div className="d-flex flex-column gap-3">
                    {
                        announcements.map((announcement,index)=>(

                            <div
                                key={index}
                                className="border-bottom pb-3"
                            >

                                <h6 className="fw-bold">
                                    {announcement.title}
                                </h6>

                                <p className="mb-1">
                                    {announcement.message}
                                </p>

                                <small className="text-muted">
                                    {announcement.date}
                                </small>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    );
}
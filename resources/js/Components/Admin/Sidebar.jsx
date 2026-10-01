export default function Sidebar(){

    const menuItems = [
        "Dashboard",
        "Products",
        "Packages",
        "Schedules",
        "Transaction Logs",
        "Purchase History",
        "Users"
    ];


    return(
        <aside className="bg-white border-end min-vh-100 p-3">

            {/* User Profile */}
            <div className="d-flex align-items-center gap-2 mb-4">

                <div 
                    className="bg-primary rounded-circle d-flex justify-content-center align-items-center"
                    style={{
                        width:"40px",
                        height:"40px"
                    }}
                >
                    <i className="bi bi-person text-white"></i>
                </div>


                <strong>
                    Joe Joestar
                </strong>

            </div>


            <hr/>

            {/* Navigation */}
            <div className="d-flex flex-column gap-2">

                {
                    menuItems.map((item, index)=>(
                        <button
                            key={index}
                            className={
                                item === "Dashboard"
                                ?
                                "btn btn-primary text-start rounded-pill"
                                :
                                "btn btn-light text-start"
                            }
                        >
                            {item}
                        </button>
                    ))
                }
            </div>
        </aside>
    );
}
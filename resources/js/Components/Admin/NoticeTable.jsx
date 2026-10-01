// for the lowStockTable.jsx and WarrantyTable.jsx

export default function NoticeTable({
    title,
    headers,
    rows
}){

    return(
        <div className="card border rounded-3">
            <div className="card-body p-4">
                <h5 className="fw-bold mb-3">
                    {title}
                </h5>

                <table className="table table-sm align-middle">
                    <thead>
                        <tr>
                            {
                                headers.map((header,index)=>(
                                    <th key={index}>
                                        {header}
                                    </th>
                                ))
                            }
                        </tr>
                    </thead>

                    <tbody>
                        {
                            rows.length > 0 ?

                            rows.map((row,index)=>(

                                <tr key={index}>
                                    {
                                        row.map((cell,index)=>(
                                            <td key={index}>
                                                {cell}
                                            </td>
                                        ))
                                    }
                                </tr>
                            ))
                            :
                            <tr>
                                <td 
                                    colSpan={headers.length}
                                    className="text-center text-muted"
                                >
                                    No data available
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
}
// Compact dashboard notice table with optional links for the first cell of each row.

import { Link } from "@inertiajs/react";
import AdminPagination from "./AdminPagination";

export default function NoticeTable({
    title,
    headers,
    rows = [],
    pagination = null,
    paginationLabel = "records",
    rowLinks = [],
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

                            rows.map((row,rowIndex)=>(

                                <tr key={rowIndex}>
                                    {
                                        row.map((cell,cellIndex)=>(
                                            <td key={cellIndex}>
                                                {cellIndex === 0 && rowLinks[rowIndex] ? (
                                                    <Link
                                                        href={rowLinks[rowIndex]}
                                                        className="text-decoration-none fw-semibold"
                                                    >
                                                        {cell}
                                                    </Link>
                                                ) : cell}
                                            </td>
                                        ))
                                    }
                                </tr>
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
                <AdminPagination pagination={pagination} label={paginationLabel} compact />
            </div>
        </div>
    );
}
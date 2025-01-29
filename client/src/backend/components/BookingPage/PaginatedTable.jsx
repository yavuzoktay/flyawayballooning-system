import React, { useState } from "react";

const PaginatedTable = ({ data, columns, itemsPerPage = 10 }) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Pagination logic
    const getPaginatedData = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    // Make Heading In UpperCase
    var mainHead = [];
    columns.forEach((item) => {
      var final_head = item.replace("_", " ");
      final_head = final_head.charAt(0).toUpperCase() + final_head.slice(1).toLowerCase();
      mainHead.push(final_head);      
    });

    const paginatedData = getPaginatedData();
    

    return (
        <>
            <table border="1" style={{ width: "100%", background: "#FFF", marginTop: "10px", borderCollapse: "collapse" }}>
                <thead style={{ background: "#3274b4", color: "#FFF" }}>
                    <tr>
                        {mainHead.map((col) => (
                            <th key={col} style={{ padding: "8px" }}>{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {paginatedData.map((item, idx) => (                      
                        <tr key={idx}>
                            {columns.map((col) => (
                                <td key={col} style={{ textAlign: "center", padding: "8px" }}>
                                    {item[col]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination Controls */}
            <div style={{ marginTop: "10px", textAlign: "center" }}>
                {Array.from({ length: Math.ceil(data.length / itemsPerPage) }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        style={{
                            margin: "0 5px",
                            padding: "5px 10px",
                            background: currentPage === i + 1 ? "#3274b4" : "#A6A6A6",
                            color: "#FFF",
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        {i + 1}
                    </button>
                ))}
            </div>
        </>
    );
};

export default PaginatedTable;

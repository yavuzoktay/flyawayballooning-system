import React, { useState } from "react";

const PaginatedTable = ({ data, columns, itemsPerPage = 10 }) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Function to format date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        // Eğer T yoksa, ekle
        let isoString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return String(dateString); // Geçersizse raw göster
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hour = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hour}:${min}`;
    };

    // Pagination logic
    const getPaginatedData = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    // Make Heading In UpperCase
    var mainHead = [];
    columns.forEach((item) => {
      var final_head;
      if (item === 'created_at') {
        final_head = 'Created';
      } else {
        final_head = item.replace(/_/g, " ");
        final_head = final_head.charAt(0).toUpperCase() + final_head.slice(1).toLowerCase();
      }
      mainHead.push(final_head);      
    });

    const paginatedData = getPaginatedData();
    

    return (
        <>
            <table border="1" style={{ width: "100%", background: "#FFF", marginTop: "10px", borderCollapse: "collapse" }}>
                <thead style={{ background: "#3274b4", color: "#FFF" }}>
                    <tr>
                        {mainHead.map((col, index) => (
                            <th key={index} style={{ padding: "8px" }}>{col}</th>
                        ))}
                        <th style={{ padding: "8px" }}>Voucher/Booking ID</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedData.map((item, idx) => {
                        console.log('item:', item); // DEBUG
                        return (
                            <tr key={idx}>
                                {columns.map((col) => (
                                    <td key={col} style={{ textAlign: "center", padding: "8px" }}>
                                        {col === 'created_at' ? formatDate(item[col]) :
                                            col === 'status' && item[col] === 'Confirmed' ? 'Scheduled' : item[col]}
                                    </td>
                                ))}
                                <td style={{ textAlign: "center", padding: "8px", fontWeight: 600 }}>
                                    {item.voucher_code ? item.voucher_code : (item.booking_id || item.id || "-")}
                                </td>
                            </tr>
                        );
                    })}
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

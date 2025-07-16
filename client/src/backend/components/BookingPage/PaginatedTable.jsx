import React, { useState } from "react";

const PaginatedTable = ({ data, columns, itemsPerPage = 10, onNameClick }) => {
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
        return `${day}/${month}/${year}`;
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
      if (item === 'created_at' || item === 'created') {
        final_head = 'Created';
      } else if (item === 'voucher_booking_id') {
        final_head = 'Voucher/Booking ID';
      } else if (item === 'date_requested') {
        final_head = 'Date requested';
      } else {
        final_head = item.replace(/_/g, " ");
        final_head = final_head.charAt(0).toUpperCase() + final_head.slice(1).toLowerCase();
      }
      mainHead.push(final_head);      
    });

    const paginatedData = getPaginatedData();
    

    return (
        <>
            <table border="1" style={{ width: "100%", background: "#FFF", marginTop: "10px", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                    {columns.map((col) => (
                        <col key={col} style={{ width: col === 'email' ? '240px' : col === 'name' ? '180px' : col === 'status' ? '120px' : 'auto', minWidth: col === 'email' ? '240px' : col === 'name' ? '180px' : col === 'status' ? '120px' : '80px', maxWidth: col === 'email' ? '240px' : undefined }} />
                    ))}
                </colgroup>
                <thead style={{ background: "#3274b4", color: "#FFF" }}>
                    <tr>
                        {mainHead.map((col, index) => (
                            <th key={index} style={{ padding: "8px" }}>{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {paginatedData.map((item, idx) => {
                        console.log('item:', item); // DEBUG
                        return (
                            <tr key={idx}>
                                {columns.map((col) => (
                                    <td key={col} style={{ textAlign: "center", padding: "8px", wordBreak: "break-all", overflowWrap: "break-word" }}>
                                        {col === 'name' ? (
                                            <span
                                                style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer' }}
                                                onClick={() => onNameClick && onNameClick(item)}
                                            >
                                                {item[col]}
                                            </span>
                                        ) : (col === 'flight_date' ? (
                                            (() => {
                                                if (!item[col]) return '';
                                                let isoString = item[col].includes('T') ? item[col] : item[col].replace(' ', 'T');
                                                const date = new Date(isoString);
                                                if (isNaN(date.getTime())) return String(item[col]);
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const year = date.getFullYear();
                                                let hours = date.getHours();
                                                const ampm = hours < 12 ? 'AM' : 'PM';
                                                // YYYY-MM-DD format for URL
                                                const urlDate = `${year}-${month}-${day}`;
                                                return (
                                                    <a
                                                        href={`http://44.202.155.45:3002/manifest?date=${urlDate}`}
                                                        style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                                                        target="_self"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {`${day}/${month}/${year} ${ampm}`}
                                                    </a>
                                                );
                                            })()
                                        ) : ( (col === 'created_at' || col === 'created' || col === 'expires' || col === 'date_requested') ? formatDate(item[col]) :
                                            col === 'status' && item[col] === 'Confirmed' ? 'Scheduled' : item[col]))}
                                    </td>
                                ))}
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

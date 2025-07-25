import React, { useState, useEffect } from "react";

const PaginatedTable = ({ data, columns, itemsPerPage = 10, onNameClick, selectable = false, onSelectionChange }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRows, setSelectedRows] = useState([]);

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
    if (selectable) mainHead.push(''); // For checkbox column
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

    // Checkbox logic
    const isAllSelected = paginatedData.length > 0 && paginatedData.every((row, idx) => selectedRows.includes((currentPage-1)*itemsPerPage+idx));
    const isIndeterminate = selectedRows.length > 0 && !isAllSelected;
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRows([
                ...new Set([
                    ...selectedRows,
                    ...paginatedData.map((_, idx) => (currentPage-1)*itemsPerPage+idx)
                ])
            ]);
        } else {
            setSelectedRows(selectedRows.filter(idx => idx < (currentPage-1)*itemsPerPage || idx >= (currentPage)*itemsPerPage));
        }
    };
    const handleRowSelect = (rowIdx) => {
        if (selectedRows.includes(rowIdx)) {
            setSelectedRows(selectedRows.filter(idx => idx !== rowIdx));
        } else {
            setSelectedRows([...selectedRows, rowIdx]);
        }
    };

    // Update parent on selection change
    useEffect(() => {
        if (selectable && typeof onSelectionChange === 'function') {
            const selectedIds = selectedRows.map(idx => data[idx]?.id).filter(Boolean);
            onSelectionChange(selectedIds);
        }
    }, [selectedRows, data, selectable, onSelectionChange]);

    return (
        <>
            <table border="1" style={{ width: "100%", background: "#FFF", marginTop: "10px", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                    {selectable && <col style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }} />}
                    {columns.map((col) => (
                        <col key={col} style={{ width: col === 'email' ? '240px' : col === 'name' ? '180px' : col === 'status' ? '120px' : 'auto', minWidth: col === 'email' ? '240px' : col === 'name' ? '180px' : col === 'status' ? '120px' : '80px', maxWidth: col === 'email' ? '240px' : undefined }} />
                    ))}
                </colgroup>
                <thead style={{ background: "#3274b4", color: "#FFF" }}>
                    <tr>
                        {selectable && (
                            <th style={{ padding: "8px" }}>
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                                    onChange={handleSelectAll}
                                />
                            </th>
                        )}
                        {(selectable ? mainHead.slice(1) : mainHead).map((col, index) => (
                            <th key={index} style={{ padding: "8px" }}>{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {paginatedData.map((item, idx) => {
                        const globalIdx = (currentPage-1)*itemsPerPage+idx;
                        return (
                            <tr key={idx}>
                                {selectable && (
                                    <td style={{ textAlign: "center" }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.includes(globalIdx)}
                                            onChange={() => handleRowSelect(globalIdx)}
                                        />
                                    </td>
                                )}
                                {columns.map((col, colIdx) => (
                                    // If selectable and this is the dummy 'checkbox' column, skip rendering a data cell
                                    selectable && colIdx === 0 && col === 'checkbox' ? null : (
                                        <td key={col} style={{ textAlign: "center", padding: "8px", wordBreak: "break-all", overflowWrap: "break-word" }}>
                                            {col === 'name' ? (
                                                selectable ? (
                                                    <span>{item[col]}</span>
                                                ) : (
                                                    <span
                                                        style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer' }}
                                                        onClick={() => onNameClick && onNameClick(item)}
                                                    >
                                                        {item[col]}
                                                    </span>
                                                )
                                            ) : col === 'flight_date' ? (
                                                (() => {
                                                    if (item.flight_date_display !== undefined) {
                                                        if (item.flight_date_display === '-') return '-';
                                                        return item.flight_date_display;
                                                    }
                                                    if (item[col] === '-') return '-';
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
                                                            href={`http://3.95.28.43:3002/manifest?date=${urlDate}`}
                                                            style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                                                            target="_self"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {`${day}/${month}/${year} ${ampm}`}
                                                        </a>
                                                    );
                                                })()
                                            ) : col === 'date_requested' ? (
                                                (() => {
                                                    if (!item[col]) return '';
                                                    let isoString = item[col].includes('T') ? item[col] : item[col].replace(' ', 'T');
                                                    const date = new Date(isoString);
                                                    if (isNaN(date.getTime())) return String(item[col]);
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                    const year = date.getFullYear();
                                                    return `${day}/${month}/${year}`;
                                                })()
                                            ) : col === 'expires' ? (
                                                (() => {
                                                    if (!item[col]) return '';
                                                    let isoString = item[col].includes('T') ? item[col] : item[col].replace(' ', 'T');
                                                    const date = new Date(isoString);
                                                    if (isNaN(date.getTime())) return String(item[col]);
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                    const year = date.getFullYear();
                                                    return `${day}/${month}/${year}`;
                                                })()
                                            ) : col === 'status' && item[col] === 'Confirmed' ? 'Scheduled' : item[col]}
                                        </td>
                                    )
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

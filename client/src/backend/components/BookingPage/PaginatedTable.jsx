import React, { useState, useEffect } from "react";

const PaginatedTable = ({ data, columns, itemsPerPage = 10, onNameClick, selectable = false, onSelectionChange, context = 'bookings' }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRows, setSelectedRows] = useState([]);

    // Helper to get column id/label
    const getColId = (col) => (typeof col === 'string' ? col : (col?.id || ''));
    const getColLabel = (col) => {
        if (typeof col === 'string') {
            if (col === 'created_at' || col === 'created') return 'Created';
            if (col === 'voucher_booking_id') return 'Voucher/Booking ID';
            if (col === 'date_requested') return 'Date requested';
            if (col === 'flight_type') return 'Experience';
            if (col === 'voucher_type') return context === 'vouchers' ? 'Book Flight' : 'Voucher Type';
            if (col === 'actual_voucher_type') return 'Voucher Type';
            if (col === 'passenger_info') return 'Passengers';
            const label = col.replace(/_/g, ' ');
            return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
        }
        if (col && col.label) return col.label;
        const id = getColId(col) || '';
        if (!id) return '';
        if (id === 'created_at' || id === 'created') return 'Created';
        if (id === 'voucher_booking_id') return 'Voucher/Booking ID';
        if (id === 'date_requested') return 'Date requested';
        if (id === 'flight_type') return 'Experience';
        if (id === 'voucher_type') return context === 'vouchers' ? 'Book Flight' : 'Voucher Type';
        if (id === 'actual_voucher_type') return 'Voucher Type';
        if (id === 'passenger_info') return 'Passengers';
        const label = id.replace(/_/g, ' ');
        return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    };

    // Pagination logic
    const getPaginatedData = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    // Build header labels
    var mainHead = [];
    if (selectable) mainHead.push(''); // For checkbox column
    columns.forEach((item) => {
        mainHead.push(getColLabel(item));
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
                    {columns.map((col) => {
                        const id = getColId(col);
                        return (
                            <col key={id} style={{ 
                                width: id === 'email' ? '240px' : 
                                       id === 'name' ? '180px' : 
                                       id === 'status' ? '120px' : 
                                       id === 'voucher_type' ? '140px' :
                                       id === 'passenger_info' ? '200px' :
                                       id === 'created_at' || id === 'created' ? '120px' :
                                       'auto', 
                                minWidth: id === 'email' ? '240px' : 
                                         id === 'name' ? '180px' : 
                                         id === 'status' ? '120px' : 
                                         id === 'voucher_type' ? '140px' :
                                         id === 'passenger_info' ? '200px' :
                                         id === 'created_at' || id === 'created' ? '120px' :
                                         '80px', 
                                maxWidth: id === 'email' ? '240px' : undefined 
                            }} />
                        );
                    })}
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
                                {columns.map((col) => {
                                    const id = getColId(col);
                                    return (
                                        <td key={id} style={{ textAlign: "center", padding: "8px", wordBreak: "break-all", overflowWrap: "break-word" }}>
                                            {id === 'name' ? (
                                                selectable ? (
                                                    <span>{item[id]}</span>
                                                ) : (
                                                    <span
                                                        style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer' }}
                                                        onClick={() => onNameClick && onNameClick(item)}
                                                    >
                                                        {item[id]}
                                                    </span>
                                                )
                                            ) : id === 'flight_date' ? (
                                                (() => {
                                                    if (item.flight_date_display !== undefined) {
                                                        if (item.flight_date_display === '-') return '-';
                                                        return item.flight_date_display;
                                                    }
                                                    if (item[id] === '-') return '-';
                                                    if (!item[id]) return '';
                                                    let isoString = item[id].includes('T') ? item[id] : item[id].replace(' ', 'T');
                                                    const date = new Date(isoString);
                                                    if (isNaN(date.getTime())) return String(item[id]);
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                    const year = date.getFullYear();
                                                    let hours = date.getHours();
                                                    const ampm = hours < 12 ? 'AM' : 'PM';
                                                    // YYYY-MM-DD format for URL
                                                    const urlDate = `${year}-${month}-${day}`;
                                                    return (
                                                        <a
                                                            href={`https://flyawayballooning-system.com/manifest?date=${urlDate}`}
                                                            style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                                                            target="_self"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {`${day}/${month}/${year} ${ampm}`}
                                                        </a>
                                                    );
                                                })()
                                            ) : id === 'date_requested' ? (
                                                (() => {
                                                    if (!item[id]) return '';
                                                    let isoString = item[id].includes('T') ? item[id] : item[id].replace(' ', 'T');
                                                    const date = new Date(isoString);
                                                    if (isNaN(date.getTime())) return String(item[id]);
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                    const year = date.getFullYear();
                                                    return `${day}/${month}/${year}`;
                                                })()
                                            ) : id === 'expires' ? (
                                                (() => {
                                                    if (!item[id]) return '';
                                                    let isoString = item[id].includes('T') ? item[id] : item[id].replace(' ', 'T');
                                                    const date = new Date(isoString);
                                                    if (isNaN(date.getTime())) return String(item[id]);
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                    const year = date.getFullYear();
                                                    return `${day}/${month}/${year}`;
                                                })()
                                            ) : id === 'voucher_type' ? (
                                                item[id] || ''
                                            ) : id === 'status' ? (
                                                item[id] === 'Confirmed' ? 'Scheduled' : 
                                                item[id] === 'Scheduled' ? 'Scheduled' : 
                                                item[id]
                                            ) : item[id]}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Pagination Controls */}
            <div style={{ marginTop: "10px", textAlign: "center", display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                {(() => {
                    const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
                    const pages = [];
                    const windowSize = 5; // show current +/-2
                    const start = Math.max(1, currentPage - Math.floor(windowSize/2));
                    const end = Math.min(totalPages, start + windowSize - 1);
                    const realStart = Math.max(1, end - windowSize + 1);

                    const makeBtn = (label, page, disabled = false, key = label) => (
                        <button
                            key={key}
                            onClick={() => !disabled && setCurrentPage(page)}
                            disabled={disabled}
                            style={{
                                margin: "0 2px",
                                padding: "5px 8px",
                                background: disabled ? '#cccccc' : (currentPage === page ? "#3274b4" : "#A6A6A6"),
                                color: "#FFF",
                                border: "none",
                                cursor: disabled ? 'default' : "pointer",
                            }}
                        >
                            {label}
                        </button>
                    );

                    pages.push(makeBtn('«', 1, currentPage === 1, 'first'));
                    pages.push(makeBtn('‹', Math.max(1, currentPage - 1), currentPage === 1, 'prev'));

                    for (let p = realStart; p <= end; p++) {
                        pages.push(makeBtn(String(p), p, false, `p-${p}`));
                    }

                    pages.push(makeBtn('›', Math.min(totalPages, currentPage + 1), currentPage === totalPages, 'next'));
                    pages.push(makeBtn('»', totalPages, currentPage === totalPages, 'last'));

                    return pages;
                })()}
            </div>
        </>
    );
};

export default PaginatedTable;
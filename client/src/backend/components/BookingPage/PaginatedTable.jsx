import React, { useState, useEffect } from "react";

const PaginatedTable = ({ data, columns, itemsPerPage = 10, onNameClick, selectable = false, onSelectionChange, context = 'bookings', onEmailClick, onSmsClick }) => {
    // Infinite scroll: show first itemsPerPage items, then load more as user scrolls
    const [visibleCount, setVisibleCount] = useState(itemsPerPage);
    const [selectedRows, setSelectedRows] = useState([]);
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [selectedVoucherData, setSelectedVoucherData] = useState(null);

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

    // Reset visible count when data changes
    useEffect(() => {
        setVisibleCount(itemsPerPage);
    }, [data, itemsPerPage]);

    // Infinite scroll handler (window-based)
    useEffect(() => {
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            const nearBottom = scrollTop + clientHeight >= scrollHeight - 200;
            if (nearBottom) {
                setVisibleCount((prev) => (prev < data.length ? Math.min(prev + itemsPerPage, data.length) : prev));
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [data.length, itemsPerPage]);

    const getVisibleData = () => {
        return data.slice(0, visibleCount);
    };

    // Build header labels
    var mainHead = [];
    if (selectable) mainHead.push(''); // For checkbox column
    columns.forEach((item) => {
        mainHead.push(getColLabel(item));
    });
    // Add Actions column for bookings/vouchers context
    if ((context === 'bookings' || context === 'vouchers') && onEmailClick) {
        mainHead.push('Actions');
    }

    const paginatedData = getVisibleData();

    // Checkbox logic
    const isAllSelected = paginatedData.length > 0 && paginatedData.every((row, idx) => selectedRows.includes(idx));
    const isIndeterminate = selectedRows.length > 0 && !isAllSelected;
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRows([
                ...new Set([
                    ...selectedRows,
                    ...paginatedData.map((_, idx) => idx)
                ])
            ]);
        } else {
            setSelectedRows([]);
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
            {/* Voucher Details Modal */}
            {showVoucherModal && selectedVoucherData && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '24px',
                        borderRadius: '8px',
                        width: '500px',
                        maxWidth: '90vw',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            borderBottom: '2px solid #3274b4',
                            paddingBottom: '12px'
                        }}>
                            <h3 style={{ margin: 0, color: '#3274b4' }}>Voucher Details</h3>
                            <button
                                onClick={() => setShowVoucherModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    color: '#999'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <strong style={{ color: '#3274b4' }}>Voucher Code:</strong>
                                <div style={{ 
                                    padding: '8px 12px', 
                                    backgroundColor: '#e3f2fd', 
                                    borderRadius: '4px', 
                                    fontWeight: 'bold',
                                    border: '1px solid #2196f3',
                                    marginTop: '4px'
                                }}>
                                    {selectedVoucherData.voucher_code}
                                </div>
                            </div>
                            
                            <div>
                                <strong style={{ color: '#3274b4' }}>Booking ID:</strong>
                                <div style={{ marginTop: '4px' }}>{selectedVoucherData.booking_id}</div>
                            </div>
                            
                            <div>
                                <strong style={{ color: '#3274b4' }}>Customer:</strong>
                                <div style={{ marginTop: '4px' }}>{selectedVoucherData.customer_name}</div>
                            </div>
                            
                            <div>
                                <strong style={{ color: '#3274b4' }}>Flight Type:</strong>
                                <div style={{ marginTop: '4px' }}>{selectedVoucherData.flight_type}</div>
                            </div>
                            
                            <div>
                                <strong style={{ color: '#3274b4' }}>Location:</strong>
                                <div style={{ marginTop: '4px' }}>{selectedVoucherData.location}</div>
                            </div>
                            
                            <div>
                                <strong style={{ color: '#3274b4' }}>Passengers:</strong>
                                <div style={{ marginTop: '4px' }}>{selectedVoucherData.pax}</div>
                            </div>
                            
                            <div>
                                <strong style={{ color: '#3274b4' }}>Status:</strong>
                                <div style={{ 
                                    marginTop: '4px',
                                    padding: '4px 8px',
                                    backgroundColor: selectedVoucherData.status === 'Open' ? '#fff3cd' : '#d4edda',
                                    color: selectedVoucherData.status === 'Open' ? '#856404' : '#155724',
                                    borderRadius: '4px',
                                    display: 'inline-block'
                                }}>
                                    {selectedVoucherData.status}
                                </div>
                            </div>
                            
                            <div>
                                <strong style={{ color: '#3274b4' }}>Amount Paid:</strong>
                                <div style={{ marginTop: '4px' }}>£{selectedVoucherData.paid}</div>
                            </div>
                            
                            <div>
                                <strong style={{ color: '#3274b4' }}>Created:</strong>
                                <div style={{ marginTop: '4px' }}>
                                    {selectedVoucherData.created_at_display || (() => {
                                        try {
                                            if (!selectedVoucherData.created_at) return 'N/A';
                                            const date = new Date(selectedVoucherData.created_at);
                                            if (isNaN(date.getTime())) return 'N/A';
                                            const day = String(date.getDate()).padStart(2, '0');
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const year = date.getFullYear();
                                            return `${day}/${month}/${year}`;
                                        } catch (e) {
                                            return 'N/A';
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ marginTop: '16px' }}>
                            <strong style={{ color: '#3274b4' }}>Flight Date:</strong>
                            <div style={{ marginTop: '4px', fontSize: '16px', fontWeight: '500' }}>
                                {selectedVoucherData.flight_date ? (() => {
                                    try {
                                        let dateString = String(selectedVoucherData.flight_date);
                                        let date;
                                        let timeString = '';
                                        
                                        // Handle formats like "2025-09-25T23:00:00.000Z 16:00:00"
                                        if (dateString.includes(' ') && dateString.split(' ').length === 2) {
                                            const parts = dateString.split(' ');
                                            const datePart = parts[0]; // "2025-09-25T23:00:00.000Z"
                                            timeString = parts[1]; // "16:00:00"
                                            
                                            // Use the date part for date, time part for display time
                                            date = new Date(datePart);
                                            
                                            // Parse the time string for display
                                            if (timeString && timeString.includes(':')) {
                                                const timeParts = timeString.split(':');
                                                const hours = parseInt(timeParts[0], 10);
                                                const minutes = timeParts[1] || '00';
                                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                                const displayHours = hours % 12 || 12;
                                                timeString = `${displayHours}:${minutes} ${ampm}`;
                                            }
                                        } else {
                                            // Normal date processing
                                            let isoString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
                                            date = new Date(isoString);
                                            
                                            if (!isNaN(date.getTime())) {
                                                const hours = date.getHours();
                                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                                const displayHours = hours % 12 || 12;
                                                timeString = `${displayHours}:${minutes} ${ampm}`;
                                            }
                                        }
                                        
                                        if (isNaN(date.getTime())) return selectedVoucherData.flight_date;
                                        
                                        const day = String(date.getDate()).padStart(2, '0');
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const year = date.getFullYear();
                                        
                                        return timeString ? `${day}/${month}/${year} at ${timeString}` : `${day}/${month}/${year}`;
                                    } catch (e) {
                                        console.error('Modal flight date parsing error:', e, selectedVoucherData.flight_date);
                                        return selectedVoucherData.flight_date;
                                    }
                                })() : 'Not scheduled'}
                            </div>
                        </div>
                        
                        <div style={{ 
                            marginTop: '24px', 
                            padding: '12px', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '4px',
                            borderLeft: '4px solid #28a745'
                        }}>
                            <strong style={{ color: '#28a745' }}>✓ Status:</strong> This voucher has been successfully redeemed via booking
                        </div>
                        
                        <div style={{ 
                            marginTop: '20px', 
                            textAlign: 'right' 
                        }}>
                            <button
                                onClick={() => setShowVoucherModal(false)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#3274b4',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div style={{ width: '100%', overflowX: 'auto' }}>
            <table border="1" style={{ width: "100%", background: "#FFF", marginTop: "10px", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                    {selectable && <col style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }} />}
                    {columns.map((col) => {
                        const id = getColId(col);
                        return (
                            <col key={id} style={{ 
                                width: id === 'email' ? '240px' : 
                                       id === 'name' ? '180px' : 
                                       id === 'voucher_code' ? '120px' :
                                       id === 'status' ? '120px' : 
                                       id === 'voucher_type' ? '140px' :
                                       id === 'passenger_info' ? '200px' :
                                       id === 'created_at' || id === 'created' ? '120px' :
                                       'auto', 
                                minWidth: id === 'email' ? '240px' : 
                                         id === 'name' ? '180px' : 
                                         id === 'voucher_code' ? '120px' :
                                         id === 'status' ? '120px' : 
                                         id === 'voucher_type' ? '140px' :
                                         id === 'passenger_info' ? '200px' :
                                         id === 'created_at' || id === 'created' ? '120px' :
                                         '80px', 
                                maxWidth: id === 'email' ? '240px' : undefined 
                            }} />
                        );
                    })}
                    {/* Actions column for bookings/vouchers */}
                    {(context === 'bookings' || context === 'vouchers') && onEmailClick && <col style={{ width: '120px', minWidth: '120px' }} />}
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
                        return (
                            <tr key={idx}>
                                {selectable && (
                                    <td style={{ textAlign: "center" }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.includes(idx)}
                                            onChange={() => handleRowSelect(idx)}
                                        />
                                    </td>
                                )}
                                                {columns.map((col) => {
                                                    const id = getColId(col);
                                                    return (
                                                        <td key={id} style={{ textAlign: "center", padding: "8px", wordBreak: id === 'voucher_code' ? 'normal' : 'break-all', overflowWrap: id === 'voucher_code' ? 'normal' : 'break-word', whiteSpace: id === 'voucher_code' ? 'nowrap' : 'normal' }}>
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
                                                            ) : id === 'created_at' ? (
                                                                (() => {
                                                                    // Use created_at_display if available, otherwise format created_at
                                                                    if (item.created_at_display) {
                                                                        return item.created_at_display;
                                                                    }
                                                                    if (!item[id]) return '';
                                                                    try {
                                                                        const date = new Date(item[id]);
                                                                        if (isNaN(date.getTime())) return String(item[id]);
                                                                        const day = String(date.getDate()).padStart(2, '0');
                                                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                                                        const year = date.getFullYear();
                                                                        return `${day}/${month}/${year}`;
                                                                    } catch (e) {
                                                                        return String(item[id]);
                                                                    }
                                                                })()
                                                            ) : id === 'flight_date' ? (
                                                (() => {
                                                    if (item.flight_date_display !== undefined) {
                                                        if (item.flight_date_display === '-') return '-';
                                                        return item.flight_date_display;
                                                    }
                                                    if (item[id] === '-') return '-';
                                                    if (!item[id]) return '';
                                                    
                                                    try {
                                                        let dateString = String(item[id]);
                                                        let date;
                                                        let timeString = '';
                                                        
                                                        // Handle formats like "2025-09-25T23:00:00.000Z 16:00:00"
                                                        if (dateString.includes(' ') && dateString.split(' ').length === 2) {
                                                            const parts = dateString.split(' ');
                                                            const datePart = parts[0]; // "2025-09-25T23:00:00.000Z"
                                                            timeString = parts[1]; // "16:00:00"
                                                            
                                                            // Use the date part for date, time part for display time
                                                            date = new Date(datePart);
                                                            
                                                            // Parse the time string for display
                                                            if (timeString && timeString.includes(':')) {
                                                                const timeParts = timeString.split(':');
                                                                const hours = parseInt(timeParts[0], 10);
                                                                const minutes = timeParts[1] || '00';
                                                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                                                const displayHours = hours % 12 || 12;
                                                                timeString = `${displayHours}:${minutes} ${ampm}`;
                                                            }
                                                        } else {
                                                            // Normal date processing
                                                            let isoString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
                                                            date = new Date(isoString);
                                                            
                                                            if (!isNaN(date.getTime())) {
                                                                const hours = date.getHours();
                                                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                                                const displayHours = hours % 12 || 12;
                                                                timeString = `${displayHours}:${minutes} ${ampm}`;
                                                            }
                                                        }
                                                        
                                                        if (isNaN(date.getTime())) return String(item[id]);
                                                        
                                                        const day = String(date.getDate()).padStart(2, '0');
                                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                                        const year = date.getFullYear();
                                                        
                                                        // YYYY-MM-DD format for URL
                                                        const urlDate = `${year}-${month}-${day}`;
                                                        const displayDateTime = timeString ? `${day}/${month}/${year} ${timeString}` : `${day}/${month}/${year}`;
                                                        
                                                        return (
                                                            <a
                                                                href={`https://flyawayballooning-system.com/manifest?date=${urlDate}`}
                                                                style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                                                                target="_self"
                                                                rel="noopener noreferrer"
                                                            >
                                                                {displayDateTime}
                                                            </a>
                                                        );
                                                    } catch (e) {
                                                        console.error('Flight date parsing error:', e, item[id]);
                                                        return String(item[id]);
                                                    }
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
                                            ) : id === 'voucher_code' ? (
                                                // Make voucher code clickable if it exists
                                                item[id] ? (
                                                    <span
                                                        style={{ 
                                                            color: '#3274b4', 
                                                            textDecoration: 'underline', 
                                                            cursor: 'pointer',
                                                            fontWeight: '600',
                                                            padding: '4px 8px',
                                                            backgroundColor: '#e3f2fd',
                                                            borderRadius: '4px',
                                                            border: '1px solid #2196f3'
                                                        }}
                                                        onClick={() => {
                                                            setSelectedVoucherData({
                                                                voucher_code: item[id],
                                                                booking_id: item.id,
                                                                customer_name: item.name,
                                                                flight_type: item.flight_type,
                                                                location: item.location,
                                                                flight_date: item.flight_date,
                                                                pax: item.pax,
                                                                status: item.status,
                                                                paid: item.paid,
                                                                created_at: item.created_at,
                                                                created_at_display: item.created_at_display
                                                            });
                                                            setShowVoucherModal(true);
                                                        }}
                                                        title="Click to view voucher details"
                                                    >
                                                        {item[id]}
                                                    </span>
                                                ) : ''
                                                            ) : item[id]}
                                        </td>
                                    );
                                })}
                                {/* Actions column for bookings/vouchers */}
                                {(context === 'bookings' || context === 'vouchers') && onEmailClick && (
                                    <td style={{ textAlign: "center", padding: "8px" }}>
                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                            <button
                                                onClick={() => onEmailClick(item)}
                                                style={{
                                                    padding: "3px 6px",
                                                    backgroundColor: "#28a745",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    fontSize: "11px",
                                                    fontWeight: "500",
                                                    lineHeight: 1
                                                }}
                                                title="Send Email"
                                            >
                                                📧 Email
                                            </button>
                                            {typeof onSmsClick === 'function' && (
                                                <button
                                                    onClick={() => onSmsClick(item)}
                                                    style={{
                                                        padding: "3px 6px",
                                                        backgroundColor: "#17a2b8",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        cursor: "pointer",
                                                        fontSize: "11px",
                                                        fontWeight: "500",
                                                        lineHeight: 1
                                                    }}
                                                    title="Send SMS"
                                                >
                                                    📱 SMS
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            </div>

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
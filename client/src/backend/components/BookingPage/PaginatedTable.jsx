import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";

const PaginatedTable = ({
    data,
    columns,
    itemsPerPage = 10,
    onNameClick,
    selectable = false,
    onSelectionChange,
    context = 'bookings',
    onEmailClick,
    onSmsClick,
    onVoucherRefClick
}) => {
    const [visibleCount, setVisibleCount] = useState(10); // Start with 10 items
    const [selectedRows, setSelectedRows] = useState([]);
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [selectedVoucherData, setSelectedVoucherData] = useState(null);
    const loadingRef = useRef(false);
    const prevSelectedIdsRef = useRef([]); // Track previous selected IDs to avoid infinite loops

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
            if (col === 'flight_attempts') return 'Attempts';
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

    // Reset visible count when data length changes (filters, tab switch, etc.)
    // Use ref to track previous length to avoid unnecessary resets
    const prevDataLengthRef = useRef(data?.length || 0);
    const prevDataRef = useRef(data);
    
    useEffect(() => {
        const currentLength = data?.length || 0;
        const prevLength = prevDataLengthRef.current;
        const dataChanged = prevDataRef.current !== data;
        
        // Only reset if length actually changed (not just data reference)
        if (currentLength !== prevLength) {
            setVisibleCount(10);
            loadingRef.current = false;
            prevDataLengthRef.current = currentLength;
        }
        
        // If data array reference changed significantly (different length or completely new data),
        // reset selected rows to avoid stale index references
        if (dataChanged && (Math.abs(currentLength - prevLength) > 2 || currentLength === 0 || prevLength === 0)) {
            setSelectedRows([]);
            prevSelectedIdsRef.current = [];
        }
        
        prevDataRef.current = data;
    }, [data, data?.length]); // Depend on both data reference and length

    // Infinite scroll logic
    useEffect(() => {
        const handleScroll = () => {
            if (loadingRef.current) return;
            if (visibleCount >= data.length) return;

            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;

            // Load more when user scrolls near bottom (within 200px)
            if (scrollTop + clientHeight >= scrollHeight - 200) {
                loadingRef.current = true;
                setTimeout(() => {
                    setVisibleCount(prev => Math.min(prev + 10, data.length));
                    loadingRef.current = false;
                }, 300);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [visibleCount, data.length]);

    // Get visible data (infinite scroll)
    const visibleData = data.slice(0, visibleCount);

    const getVoucherBookingId = (item) =>
        item?.booking_id ??
        item?.bookingId ??
        item?._original?.booking_id ??
        item?._original?.bookingId ??
        null;

    const isVoucherRedeemed = (item) => {
        const value = item?.redeemed ?? item?._original?.redeemed;
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') {
            return value.trim().toLowerCase() === 'yes';
        }
        return Boolean(value);
    };

    // Build header labels
    var mainHead = [];
    if (selectable) mainHead.push(''); // For checkbox column
    columns.forEach((item) => {
        mainHead.push(getColLabel(item));
    });

    // Checkbox logic for infinite scroll
    const isAllSelected = visibleData.length > 0 && visibleData.every((row, idx) => selectedRows.includes(idx));
    const isIndeterminate = selectedRows.length > 0 && !isAllSelected;
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRows([
                ...new Set([
                    ...selectedRows,
                    ...visibleData.map((_, idx) => idx)
                ])
            ]);
        } else {
            setSelectedRows(selectedRows.filter(idx => idx >= visibleCount));
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
    // Use useRef to track previous selectedIds to avoid infinite loops
    useEffect(() => {
        if (selectable && typeof onSelectionChange === 'function') {
            // Filter out invalid indices (out of bounds)
            const validSelectedRows = selectedRows.filter(idx => idx >= 0 && idx < (data?.length || 0));
            // Get ID from item.id or item._original.id (vouchers sometimes have id in _original)
            const selectedIds = validSelectedRows.map(idx => {
                const item = data[idx];
                return item?.id || item?._original?.id || null;
            }).filter(Boolean);
            
            // Only call onSelectionChange if the IDs actually changed
            const idsChanged = selectedIds.length !== prevSelectedIdsRef.current.length ||
                selectedIds.some((id, idx) => id !== prevSelectedIdsRef.current[idx]);
            
            if (idsChanged) {
                prevSelectedIdsRef.current = selectedIds;
                onSelectionChange(selectedIds);
            }
        }
    }, [selectedRows, selectable, onSelectionChange, data]); // Added 'data' to dependencies to fix stale closure

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
            
            <div style={{ width: '100%', overflowX: 'auto' }} className="paginated-table-wrapper">
            <table border="1" style={{ width: "100%", background: "#FFF", marginTop: "10px", borderCollapse: "collapse", tableLayout: "fixed" }} className="booking-table">
                <colgroup>
                    {selectable && <col style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }} />}
                    {columns.map((col) => {
                        const id = getColId(col);
                        return (
                            <col
                                key={id}
                                style={{
                                    // NOTE: Safari has issues with table-layout: fixed + colgroup
                                    // when some columns only use "auto" width. To ensure that
                                    // critical numeric columns like Pax and Paid are always
                                    // visible across browsers (especially Safari), give them
                                    // explicit pixel widths here.
                                    width:
                                        id === 'email' ? '240px' :
                                       id === 'name' ? '180px' : 
                                       id === 'voucher_code' ? '120px' :
                                       id === 'status' ? '120px' : 
                                        id === 'voucher_type'
                                            ? (context === 'vouchers' ? '220px' : '180px') :
                                       id === 'actual_voucher_type' ? '150px' :
                                       id === 'voucher_ref' ? '160px' :
                                       id === 'passenger_info' ? '200px' :
                                       id === 'created_at' || id === 'created' ? '120px' :
                                       id === 'flight_date' ? '200px' :
                                        id === 'pax' ? '80px' :
                                        id === 'paid' ? '120px' :
                                       id === 'flight_attempts' ? '100px' :
                                       id === 'expires' ? '140px' :
                                       id === 'location' ? '140px' :
                                       id === 'redeemed' ? '120px' :
                                       'auto', 
                                    minWidth:
                                        id === 'email' ? '240px' :
                                         id === 'name' ? '180px' : 
                                         id === 'voucher_code' ? '120px' :
                                         id === 'status' ? '120px' : 
                                        id === 'voucher_type'
                                            ? (context === 'vouchers' ? '220px' : '180px') :
                                         id === 'actual_voucher_type' ? '150px' :
                                         id === 'voucher_ref' ? '160px' :
                                         id === 'passenger_info' ? '200px' :
                                         id === 'created_at' || id === 'created' ? '120px' :
                                         id === 'flight_date' ? '200px' :
                                        id === 'pax' ? '80px' :
                                        id === 'paid' ? '120px' :
                                         id === 'flight_attempts' ? '100px' :
                                         id === 'expires' ? '140px' :
                                         id === 'location' ? '140px' :
                                         id === 'redeemed' ? '120px' :
                                         '80px', 
                                maxWidth: id === 'email' ? '240px' : undefined 
                                }}
                            />
                        );
                    })}
                </colgroup>
                <thead style={{ background: "#3274b4", color: "#FFF" }}>
                    <tr>
                        {selectable && (
                            <th style={{ 
                                padding: "8px",
                                whiteSpace: "nowrap",
                                overflow: "hidden"
                            }}>
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                                    onChange={handleSelectAll}
                                />
                            </th>
                        )}
                        {(selectable ? mainHead.slice(1) : mainHead).map((col, index) => (
                            <th key={index} style={{ 
                                padding: "8px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontSize: "16px",
                                fontWeight: "normal",
                                fontFamily: "'Gilroy', sans-serif"
                            }}>{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {visibleData.map((item, idx) => {
                        return (
                            <tr key={idx}>
                                {selectable && (
                                    <td style={{ 
                                        textAlign: "center",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden"
                                    }}>
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
                                                        <td key={id} style={{ 
                                                            textAlign: "center", 
                                                            padding: "8px", 
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            maxWidth: id === 'flight_date' ? "200px" : "200px",
                                                            fontSize: "16px",
                                                            fontWeight: "normal",
                                                            fontFamily: "'Gilroy', sans-serif"
                                                        }}>
                                                            {id === 'name' ? (
                                                                onNameClick ? (
                                                                    <span
                                                                        style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontSize: '16px', fontWeight: 'normal', fontFamily: "'Gilroy', sans-serif" }}
                                                                        onClick={() => onNameClick && onNameClick(item)}
                                                                    >
                                                                        {item[id]}
                                                                    </span>
                                                                ) : (
                                                                    <span>{item[id]}</span>
                                                                )
                                                            ) : (id === 'created_at' || id === 'created' || id === 'created_at_display') ? (
                                                                (() => {
                                                                    // Always prioritize created_at_display from getAllVoucherData to match Flight Voucher Details
                                                                    // This ensures consistency between table and popup
                                                                    if (item.created_at_display) {
                                                                        const displayValue = item.created_at_display;
                                                                        if (typeof displayValue === 'string' && displayValue.trim()) {
                                                                            // Check if it's in YYYY-MM-DD format and convert to DD/MM/YYYY
                                                                            const yyyyMMddPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
                                                                            const match = displayValue.match(yyyyMMddPattern);
                                                                            if (match) {
                                                                                // Convert YYYY-MM-DD to DD/MM/YYYY
                                                                                const [, year, month, day] = match;
                                                                                return `${day}/${month}/${year}`;
                                                                            }
                                                                            // If already in DD/MM/YYYY format, return as is (extract date part if time exists)
                                                                            if (displayValue.includes('/')) {
                                                                                const datePart = displayValue.split(' ')[0];
                                                                                return datePart;
                                                                            }
                                                                            return displayValue;
                                                                        }
                                                                    }
                                                                    // Fallback to created field if created_at_display is not available
                                                                    if (item.created && item.created !== 'N/A' && item.created.trim()) {
                                                                        return item.created;
                                                                    }
                                                                    // If the column itself is created_at_display, use it directly
                                                                    if (id === 'created_at_display') {
                                                                        const displayValue = item[id];
                                                                        if (!displayValue) return '';
                                                                        if (typeof displayValue === 'string') {
                                                                            const yyyyMMddPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
                                                                            const match = displayValue.match(yyyyMMddPattern);
                                                                            if (match) {
                                                                                const [, year, month, day] = match;
                                                                                return `${day}/${month}/${year}`;
                                                                            }
                                                                            if (displayValue.includes('/')) {
                                                                                const datePart = displayValue.split(' ')[0];
                                                                                return datePart;
                                                                            }
                                                                        }
                                                                        return displayValue;
                                                                    }
                                                                    // Last resort: try to format created_at or created field
                                                                    if (item.created_at) {
                                                                        try {
                                                                            const date = dayjs(item.created_at);
                                                                            if (date.isValid()) {
                                                                                return date.format('DD/MM/YYYY');
                                                                            }
                                                                        } catch (e) {
                                                                            // Ignore parsing errors
                                                                        }
                                                                    }
                                                                    if (item[id] && item[id] !== 'N/A') {
                                                                        try {
                                                                            const date = dayjs(item[id]);
                                                                            if (date.isValid()) {
                                                                                return date.format('DD/MM/YYYY');
                                                                            }
                                                                        } catch (e) {
                                                                            // Ignore parsing errors
                                                                        }
                                                                    }
                                                                    // Return empty string instead of 'N/A' to avoid showing N/A
                                                                    return '';
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
                                                                style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'normal', fontSize: '16px', fontFamily: "'Gilroy', sans-serif" }}
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
                                                // For vouchers context, show book_flight if available, otherwise fallback to voucher_type
                                                (context === 'vouchers' && (item.book_flight || item._original?.book_flight)) 
                                                    ? (item.book_flight || item._original?.book_flight || item[id] || '')
                                                    : (item[id] || '')
                                            ) : id === 'voucher_ref' ? (
                                                (() => {
                                                    if (!item[id]) return '';
                                                    // Make voucher ref clickable when voucher is marked as redeemed.
                                                    // Booking lookup will be resolved in handleVoucherRefClick.
                                                    const isClickable =
                                                        context === 'vouchers' &&
                                                        isVoucherRedeemed(item) &&
                                                        typeof onVoucherRefClick === 'function';
                                                    if (!isClickable) {
                                                        return item[id];
                                                    }
                                                    return (
                                                        <span
                                                            style={{
                                                                color: '#3274b4',
                                                                textDecoration: 'underline',
                                                                cursor: 'pointer',
                                                                fontWeight: 'normal',
                                                                fontSize: '16px',
                                                                fontFamily: "'Gilroy', sans-serif"
                                                            }}
                                                            onClick={() => onVoucherRefClick(item)}
                                                            title="View related booking"
                                                        >
                                                            {item[id]}
                                                        </span>
                                                    );
                                                })()
                                            ) : id === 'status' ? (
                                                // Status with color coding: Scheduled (green), Cancelled (orange), Flown (blue), Expired (red)
                                                (() => {
                                                    const statusValue = item[id];
                                                    let displayStatus = statusValue;
                                                    let statusColor = 'inherit';
                                                    let fontWeight = 'normal';
                                                    
                                                    // Check if booking is expired (only for bookings context)
                                                    if (context === 'bookings' && item.expires) {
                                                        try {
                                                            // Parse expires date - handle different formats
                                                            let expiresDate = item.expires;
                                                            let parsedDate = null;
                                                            
                                                            if (typeof expiresDate === 'string' && expiresDate.trim() !== '') {
                                                                // Try to parse as ISO string first (YYYY-MM-DD or YYYY-MM-DD HH:mm:ss)
                                                                parsedDate = dayjs(expiresDate);
                                                                
                                                                // If not valid, try DD/MM/YYYY format
                                                                if (!parsedDate.isValid()) {
                                                                    const parts = expiresDate.split('/');
                                                                    if (parts.length === 3) {
                                                                        // Handle 2-digit year (YY) or 4-digit year (YYYY)
                                                                        let year = parts[2];
                                                                        if (year.length === 2) {
                                                                            // Convert 2-digit year to 4-digit (assuming 20XX for years 00-99)
                                                                            year = '20' + year;
                                                                        }
                                                                        parsedDate = dayjs(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                                                                    }
                                                                }
                                                                
                                                                // If still not valid, try other common formats
                                                                if (!parsedDate.isValid()) {
                                                                    // Try parsing as Date object
                                                                    const dateObj = new Date(expiresDate);
                                                                    if (!isNaN(dateObj.getTime())) {
                                                                        parsedDate = dayjs(dateObj);
                                                                    }
                                                                }
                                                                
                                                                // Check if expires date is before today (start of day)
                                                                if (parsedDate && parsedDate.isValid()) {
                                                                    const today = dayjs().startOf('day');
                                                                    const expiresStartOfDay = parsedDate.startOf('day');
                                                                    
                                                                    // If expires date is before today, mark as expired
                                                                    if (expiresStartOfDay.isBefore(today)) {
                                                                        displayStatus = 'Expired';
                                                                        statusColor = '#dc3545'; // Red
                                                                        fontWeight = 'normal';
                                                                        return (
                                                                            <span style={{ color: statusColor, fontWeight, fontSize: '16px', fontFamily: "'Gilroy', sans-serif" }}>
                                                                                {displayStatus}
                                                                            </span>
                                                                        );
                                                                    }
                                                                }
                                                            }
                                                        } catch (expiresError) {
                                                            console.error('Error checking expires date:', expiresError, 'expires value:', item.expires);
                                                        }
                                                    }
                                                    
                                                    // Normalize status values (only if not expired)
                                                    if (statusValue === 'Confirmed' || statusValue === 'Scheduled') {
                                                        displayStatus = 'Scheduled';
                                                        statusColor = '#28a745'; // Green
                                                        fontWeight = 'normal';
                                                    } else if (statusValue === 'Cancelled' || statusValue === 'Canceled') {
                                                        displayStatus = 'Cancelled';
                                                        statusColor = '#fd7e14'; // Orange
                                                        fontWeight = 'normal';
                                                    } else if (statusValue === 'Flown' || statusValue === 'Completed') {
                                                        displayStatus = 'Flown';
                                                        statusColor = '#007bff'; // Blue
                                                        fontWeight = 'normal';
                                                    }
                                                    
                                                    return (
                                                        <span style={{ color: statusColor, fontWeight, fontSize: '16px', fontFamily: "'Gilroy', sans-serif" }}>
                                                            {displayStatus}
                                                        </span>
                                                    );
                                                })()
                                            ) : id === 'voucher_code' ? (
                                                // Make voucher code clickable if it exists
                                                item[id] ? (
                                                    <span
                                                        style={{ 
                                                            color: '#3274b4', 
                                                            textDecoration: 'underline', 
                                                            cursor: 'pointer',
                                                            fontWeight: 'normal',
                                                            fontSize: '16px',
                                                            fontFamily: "'Gilroy', sans-serif"
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
                                                            ) : id === 'paid' ? (
                                                                // Show paid amount: red for full refund, green for normal payment
                                                                (() => {
                                                                    const paidValue = parseFloat(item[id] || 0);
                                                                    const hasRefund = item.has_refund === 1 || item.has_refund === true;
                                                                    const isFullyRefunded = hasRefund && paidValue <= 0.01;
                                                                    const hasNormalPayment = !hasRefund && paidValue > 0.01;
                                                                    
                                                                    let color = 'inherit';
                                                                    let fontWeight = 'normal';
                                                                    
                                                                    if (isFullyRefunded) {
                                                                        // Full refund: red
                                                                        color = '#dc3545';
                                                                        fontWeight = 'normal';
                                                                    } else if (hasNormalPayment) {
                                                                        // Normal payment: green
                                                                        color = '#28a745';
                                                                        fontWeight = 'normal';
                                                                    }
                                                                    
                                                                    return (
                                                                        <span style={{ color, fontWeight, fontSize: '16px', fontFamily: "'Gilroy', sans-serif" }}>
                                                                    {item[id]}
                                                                </span>
                                                                    );
                                                                })()
                                                            ) : item[id]}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            </div>

            {/* Loading indicator and results info */}
            <div style={{ marginTop: "20px", textAlign: "center", padding: "10px" }} className="pagination-info">
                <div style={{ color: "#666", marginBottom: "10px" }}>
                    Showing {visibleCount} of {data.length} results
                </div>
                {visibleCount < data.length && (
                    <div style={{ 
                        color: "#3274b4", 
                        fontStyle: "italic",
                        fontSize: "14px"
                    }}>
                        Scroll down to load more...
                    </div>
                )}
                {visibleCount >= data.length && data.length > 10 && (
                    <div style={{ 
                        color: "#28a745", 
                        fontWeight: "500",
                        fontSize: "14px"
                    }}>
                        ✓ All results loaded
                    </div>
                )}
            </div>
        </>
    );
};

export default PaginatedTable;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Plus, 
    Edit, 
    Trash2, 
    Eye, 
    Calendar, 
    DollarSign, 
    MapPin, 
    Users, 
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';

const Settings = () => {
    const [voucherCodes, setVoucherCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showUsageModal, setShowUsageModal] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [usageData, setUsageData] = useState([]);
    const [formData, setFormData] = useState({
        code: '',
        title: '',
        discount_type: 'percentage',
        discount_value: '',
        min_booking_amount: '',
        max_discount: '',
        valid_from: '',
        valid_until: '',
        max_uses: '',
        applicable_locations: '',
        applicable_experiences: '',
        applicable_voucher_types: '',
        is_active: true
    });

    const locations = ['Somerset', 'United Kingdom'];
    const experiences = ['Shared Flight', 'Private Charter'];
    const voucherTypes = ['Weekday Morning', 'Flexible Weekday', 'Any Day Flight'];

    useEffect(() => {
        fetchVoucherCodes();
    }, []);

    const fetchVoucherCodes = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/voucher-codes');
            if (response.data.success) {
                setVoucherCodes(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching voucher codes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Form validation
        if (!formData.code || !formData.title || !formData.discount_type || !formData.discount_value) {
            alert('Please fill in all required fields: Code, Title, Discount Type, and Discount Value');
            return;
        }
        
        if (formData.discount_type === 'percentage' && (parseFloat(formData.discount_value) <= 0 || parseFloat(formData.discount_value) > 100)) {
            alert('Percentage discount must be between 0 and 100');
            return;
        }
        
        if (formData.discount_type === 'fixed_amount' && parseFloat(formData.discount_value) <= 0) {
            alert('Fixed amount discount must be greater than 0');
            return;
        }
        
        try {
            if (showEditForm) {
                await axios.put(`/api/voucher-codes/${selectedVoucher.id}`, formData);
            } else {
                await axios.post('/api/voucher-codes', formData);
            }
            
            fetchVoucherCodes();
            resetForm();
            setShowCreateForm(false);
            setShowEditForm(false);
        } catch (error) {
            console.error('Error saving voucher code:', error);
            alert(error.response?.data?.message || 'Error saving voucher code');
        }
    };

    const handleEdit = (voucher) => {
        setSelectedVoucher(voucher);
        setFormData({
            code: voucher.code,
            title: voucher.title,
            discount_type: voucher.discount_type,
            discount_value: voucher.discount_value,
            min_booking_amount: voucher.min_booking_amount,
            max_discount: voucher.max_discount,
            valid_from: voucher.valid_from,
            valid_until: voucher.valid_until,
            max_uses: voucher.max_uses,
            applicable_locations: voucher.applicable_locations,
            applicable_experiences: voucher.applicable_experiences,
            applicable_voucher_types: voucher.applicable_voucher_types,
            is_active: voucher.is_active
        });
        setShowEditForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this voucher code?')) {
            try {
                await axios.delete(`/api/voucher-codes/${id}`);
                fetchVoucherCodes();
            } catch (error) {
                console.error('Error deleting voucher code:', error);
                alert('Error deleting voucher code');
            }
        }
    };

    const handleViewUsage = async (voucher) => {
        try {
            const response = await axios.get(`/api/voucher-codes/${voucher.id}/usage`);
            if (response.data.success) {
                setUsageData(response.data.data);
                setSelectedVoucher(voucher);
                setShowUsageModal(true);
            }
        } catch (error) {
            console.error('Error fetching usage data:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            title: '',
            discount_type: 'percentage',
            discount_value: '',
            min_booking_amount: '',
            max_discount: '',
            valid_from: '',
            valid_until: '',
            max_uses: '',
            applicable_locations: '',
            applicable_experiences: '',
            applicable_voucher_types: '',
            is_active: true
        });
        setSelectedVoucher(null);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const getStatusBadge = (voucher) => {
        const today = new Date();
        const validFrom = voucher.valid_from ? new Date(voucher.valid_from) : null;
        const validUntil = voucher.valid_until ? new Date(voucher.valid_until) : null;
        
        if (!voucher.is_active) {
            return <span className="status-badge inactive">Inactive</span>;
        }
        
        if (validFrom && today < validFrom) {
            return <span className="status-badge valid">Future</span>;
        }
        
        if (validUntil && today > validUntil) {
            return <span className="status-badge expired">Expired</span>;
        }
        
        if (voucher.max_uses && voucher.current_uses >= voucher.max_uses) {
            return <span className="status-badge expired">Maxed Out</span>;
        }
        
        return <span className="status-badge active">Active</span>;
    };

    const getDiscountText = (voucher) => {
        if (voucher.discount_type === 'percentage') {
            return `${voucher.discount_value}% off`;
        }
        return `£${voucher.discount_value} off`;
    };



    if (loading) {
        return (
            <div className="settings-container">
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h1>Settings</h1>
                <button 
                    className="btn btn-primary"
                    onClick={() => setShowCreateForm(true)}
                >
                    <Plus size={20} />
                    Create Voucher Code
                </button>
            </div>

            <div className="settings-content">
                <div className="voucher-codes-section">
                    <h2>Voucher Codes Management</h2>
                    <p>Create and manage discount voucher codes for your customers.</p>
                    
                    <div className="voucher-codes-table-container">
                        {voucherCodes.length === 0 ? (
                            <div className="no-vouchers-message">
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
                                    <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Voucher Codes Yet</h3>
                                    <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                        Create your first voucher code to start offering discounts to your customers.
                                    </p>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => setShowCreateForm(true)}
                                    >
                                        <Plus size={20} />
                                        Create First Voucher Code
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="voucher-stats" style={{ 
                                    display: 'flex', 
                                    gap: '20px', 
                                    marginBottom: '20px',
                                    padding: '16px',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
                                            {voucherCodes.length}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Codes</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
                                            {voucherCodes.filter(v => v.is_active).length}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: '600', color: '#f59e0b' }}>
                                            {voucherCodes.filter(v => v.valid_until && new Date(v.valid_until) > new Date()).length}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6b7280' }}>Valid</div>
                                    </div>
                                </div>
                                
                                <div className="voucher-codes-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Code</th>
                                                <th>Title</th>
                                                <th>Discount</th>
                                                <th>Min Amount</th>
                                                <th>Valid From</th>
                                                <th>Valid Until</th>
                                                <th>Usage</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {voucherCodes.map((voucher) => (
                                                <tr key={voucher.id}>
                                                    <td>
                                                        <div className="voucher-code-cell">
                                                            <span className="voucher-code-badge">{voucher.code}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="voucher-title-cell">
                                                            <div style={{ fontWeight: '600', color: '#1f2937' }}>
                                                                {voucher.title}
                                                            </div>
                                                            {voucher.applicable_locations && (
                                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                                    📍 {voucher.applicable_locations}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="discount-cell">
                                                            <div style={{ fontWeight: '600', color: '#059669' }}>
                                                                {getDiscountText(voucher)}
                                                            </div>
                                                            {voucher.max_discount && voucher.discount_type === 'percentage' && (
                                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                                    Max: £{voucher.max_discount}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="min-amount-cell">
                                                            {voucher.min_booking_amount > 0 ? (
                                                                <span style={{ color: '#dc2626' }}>£{voucher.min_booking_amount}</span>
                                                            ) : (
                                                                <span style={{ color: '#059669' }}>No minimum</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="date-cell">
                                                            {voucher.valid_from ? formatDate(voucher.valid_from) : 'No start date'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="date-cell">
                                                            {voucher.valid_until ? formatDate(voucher.valid_until) : 'No end date'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="usage-cell">
                                                            {voucher.usage_status || '0/Unlimited'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="status-cell">
                                                            {getStatusBadge(voucher)}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="actions-cell">
                                                            <button 
                                                                className="btn btn-sm btn-outline"
                                                                onClick={() => handleViewUsage(voucher)}
                                                                title="View Usage"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            
                                                            <button 
                                                                className="btn btn-sm btn-outline"
                                                                onClick={() => handleEdit(voucher)}
                                                                title="Edit"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            
                                                            <button 
                                                                className="btn btn-sm btn-danger"
                                                                onClick={() => handleDelete(voucher.id)}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Create/Edit Form Modal */}
            {(showCreateForm || showEditForm) && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{showEditForm ? 'Edit Voucher Code' : 'Create New Voucher Code'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setShowEditForm(false);
                                    resetForm();
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="voucher-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Voucher Code *</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                                        placeholder="e.g., SUMMER2024"
                                        required
                                        disabled={showEditForm}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                        placeholder="e.g., Summer Special Discount"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Discount Type *</label>
                                    <select
                                        value={formData.discount_type}
                                        onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                                        required
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed_amount">Fixed Amount (£)</option>
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Discount Value *</label>
                                    <input
                                        type="number"
                                        value={formData.discount_value}
                                        onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                                        placeholder={formData.discount_type === 'percentage' ? '10' : '20'}
                                        step="0.01"
                                        min="0"
                                        max={formData.discount_type === 'percentage' ? '100' : ''}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Minimum Booking Amount (£)</label>
                                    <input
                                        type="number"
                                        value={formData.min_booking_amount}
                                        onChange={(e) => setFormData({...formData, min_booking_amount: e.target.value})}
                                        placeholder="0"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                                
                                {formData.discount_type === 'percentage' && (
                                    <div className="form-group">
                                        <label>Maximum Discount (£)</label>
                                        <input
                                            type="number"
                                            value={formData.max_discount}
                                            onChange={(e) => setFormData({...formData, max_discount: e.target.value})}
                                            placeholder="50"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>
                                )}
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Valid From *</label>
                                    <input
                                        type="date"
                                        value={formData.valid_from}
                                        onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Valid Until *</label>
                                    <input
                                        type="date"
                                        value={formData.valid_until}
                                        onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Maximum Uses</label>
                                    <input
                                        type="number"
                                        value={formData.max_uses}
                                        onChange={(e) => setFormData({...formData, max_uses: e.target.value})}
                                        placeholder="Unlimited"
                                        min="1"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={formData.is_active}
                                        onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                                    >
                                        <option value={true}>Active</option>
                                        <option value={false}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Applicable Locations</label>
                                <select
                                    multiple
                                    value={formData.applicable_locations ? formData.applicable_locations.split(',') : []}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setFormData({...formData, applicable_locations: selected.join(',')});
                                    }}
                                >
                                    {locations.map(location => (
                                        <option key={location} value={location}>{location}</option>
                                    ))}
                                </select>
                                <small>Leave empty for all locations</small>
                            </div>
                            
                            <div className="form-group">
                                <label>Applicable Experiences</label>
                                <select
                                    multiple
                                    value={formData.applicable_experiences ? formData.applicable_experiences.split(',') : []}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setFormData({...formData, applicable_experiences: selected.join(',')});
                                    }}
                                >
                                    {experiences.map(experience => (
                                        <option key={experience} value={experience}>{experience}</option>
                                    ))}
                                </select>
                                <small>Leave empty for all experiences</small>
                            </div>
                            
                            <div className="form-group">
                                <label>Applicable Voucher Types</label>
                                <select
                                    multiple
                                    value={formData.applicable_voucher_types ? formData.applicable_voucher_types.split(',') : []}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setFormData({...formData, applicable_voucher_types: selected.join(',')});
                                    }}
                                >
                                    {voucherTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <small>Leave empty for all voucher types</small>
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowCreateForm(false);
                                    setShowEditForm(false);
                                    resetForm();
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {showEditForm ? 'Update' : 'Create'} Voucher Code
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Usage Modal */}
            {showUsageModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Usage History: {selectedVoucher?.code}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowUsageModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="usage-content">
                            {usageData.length === 0 ? (
                                <p>No usage history found for this voucher code.</p>
                            ) : (
                                <div className="usage-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Customer</th>
                                                <th>Booking Ref</th>
                                                <th>Original Amount</th>
                                                <th>Discount</th>
                                                <th>Final Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usageData.map((usage) => (
                                                <tr key={usage.id}>
                                                    <td>{formatDate(usage.used_at)}</td>
                                                    <td>{usage.customer_name || usage.customer_email}</td>
                                                    <td>{usage.booking_reference}</td>
                                                    <td>£{usage.original_amount}</td>
                                                    <td>£{usage.discount_applied}</td>
                                                    <td>£{usage.final_amount}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings; 
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
    AlertCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'user_generated'
    const [voucherCodes, setVoucherCodes] = useState([]);
    const [userGeneratedCodes, setUserGeneratedCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showUsageModal, setShowUsageModal] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [usageData, setUsageData] = useState([]);
    
    // Experiences state
    const [experiences, setExperiences] = useState([]);
    const [showExperiencesForm, setShowExperiencesForm] = useState(false);
    const [showEditExperienceForm, setShowEditExperienceForm] = useState(false);
    const [selectedExperience, setSelectedExperience] = useState(null);
    const [experienceFormData, setExperienceFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        image_file: null,
        price_from: '',
        price_unit: 'pp',
        max_passengers: 8,
        sort_order: 0,
        is_active: true
    });
    
    // Collapsible sections state
    const [voucherCodesExpanded, setVoucherCodesExpanded] = useState(true);
    const [experiencesExpanded, setExperiencesExpanded] = useState(false);
    
    const [formData, setFormData] = useState({
        code: '',
        title: '',
        valid_from: '',
        valid_until: '',
        max_uses: '',
        applicable_locations: '',
        applicable_experiences: '',
        applicable_voucher_types: '',
        is_active: true
    });

    const locations = ['Somerset', 'United Kingdom'];
    const experienceTypes = ['Shared Flight', 'Private Charter'];
    const voucherTypes = ['Weekday Morning', 'Flexible Weekday', 'Any Day Flight'];

    useEffect(() => {
        fetchVoucherCodes();
        fetchExperiences();
    }, []);

    const fetchVoucherCodes = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/voucher-codes');
            if (response.data.success) {
                const allCodes = response.data.data;
                setVoucherCodes(allCodes.filter(code => code.source_type === 'admin_created'));
                setUserGeneratedCodes(allCodes.filter(code => code.source_type === 'user_generated'));
            }
        } catch (error) {
            console.error('Error fetching voucher codes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchExperiences = async () => {
        try {
            const response = await axios.get('/api/experiences');
            if (response.data.success) {
                setExperiences(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching experiences:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Form validation
        if (!formData.code || !formData.title) {
            alert('Please fill in all required fields: Code and Title');
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

    // Experiences form handling
    const handleExperienceSubmit = async (e) => {
        e.preventDefault();
        
        // Form validation
        if (!experienceFormData.title || !experienceFormData.description || !experienceFormData.price_from) {
            alert('Please fill in all required fields: Title, Description, and Price From');
            return;
        }
        
        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('title', experienceFormData.title);
            formData.append('description', experienceFormData.description);
            formData.append('price_from', experienceFormData.price_from);
            formData.append('price_unit', experienceFormData.price_unit);
            formData.append('max_passengers', experienceFormData.max_passengers);
            formData.append('sort_order', experienceFormData.sort_order);
            formData.append('is_active', experienceFormData.is_active);
            
            // Add image file if selected
            if (experienceFormData.image_file) {
                formData.append('experience_image', experienceFormData.image_file);
            } else if (experienceFormData.image_url) {
                // Keep existing image URL if no new file selected
                formData.append('image_url', experienceFormData.image_url);
            }
            
            if (showEditExperienceForm) {
                await axios.put(`/api/experiences/${selectedExperience.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post('/api/experiences', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            
            fetchExperiences();
            resetExperienceForm();
            setShowExperiencesForm(false);
            setShowEditExperienceForm(false);
        } catch (error) {
            console.error('Error saving experience:', error);
            alert(error.response?.data?.message || 'Error saving experience');
        }
    };

    const handleEditExperience = (experience) => {
        setSelectedExperience(experience);
        setExperienceFormData({
            title: experience.title,
            description: experience.description,
            image_url: experience.image_url || '',
            image_file: null,
            price_from: experience.price_from,
            price_unit: experience.price_unit || 'pp',
            max_passengers: experience.max_passengers || 8,
            sort_order: experience.sort_order || 0,
            is_active: experience.is_active
        });
        setShowEditExperienceForm(true);
    };

    const handleDeleteExperience = async (id) => {
        if (window.confirm('Are you sure you want to delete this experience?')) {
            try {
                await axios.delete(`/api/experiences/${id}`);
                fetchExperiences();
            } catch (error) {
                console.error('Error deleting experience:', error);
                alert(error.response?.data?.message || 'Error deleting experience');
            }
        }
    };

    const resetExperienceForm = () => {
        setExperienceFormData({
            title: '',
            description: '',
            image_url: '',
            image_file: null,
            price_from: '',
            price_unit: 'pp',
            max_passengers: 8,
            sort_order: 0,
            is_active: true
        });
        setSelectedExperience(null);
    };

    const handleEdit = (voucher) => {
        setSelectedVoucher(voucher);
        setFormData({
            code: voucher.code,
            title: voucher.title,
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
                alert(error.response?.data?.message || 'Error deleting voucher code');
            }
        }
    };

    const handleViewUsage = async (id) => {
        try {
            const response = await axios.get(`/api/voucher-codes/${id}/usage`);
            if (response.data.success) {
                setUsageData(response.data.data);
                setShowUsageModal(true);
            }
        } catch (error) {
            console.error('Error fetching usage data:', error);
            alert('Error fetching usage data');
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            title: '',
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
            </div>

            <div className="settings-content">
                {/* Voucher Codes Management Section */}
                <div className="voucher-codes-section">
                    <div 
                        className="section-header"
                        onClick={() => setVoucherCodesExpanded(!voucherCodesExpanded)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginBottom: voucherCodesExpanded ? '20px' : '0'
                        }}
                    >
                        <div>
                            <h2 style={{ margin: 0, color: '#1f2937' }}>Voucher Codes Management</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                                Create and manage discount voucher codes for your customers.
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button 
                                className="btn btn-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCreateForm(true);
                                }}
                                style={{ margin: 0 }}
                            >
                                <Plus size={20} />
                                Create Voucher Code
                            </button>
                            {voucherCodesExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                    </div>
                    
                    {voucherCodesExpanded && (
                        <>
                            {/* Tab Navigation */}
                            <div className="voucher-tabs" style={{ 
                                display: 'flex', 
                                gap: '2px', 
                                marginBottom: '20px',
                                background: '#e5e7eb',
                                borderRadius: '8px',
                                padding: '4px'
                            }}>
                                <button
                                    className={`voucher-tab ${activeTab === 'admin' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('admin')}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        background: activeTab === 'admin' ? '#ffffff' : 'transparent',
                                        color: activeTab === 'admin' ? '#1f2937' : '#6b7280',
                                        fontWeight: activeTab === 'admin' ? '600' : '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    Admin Created Codes ({voucherCodes.length})
                                </button>
                                <button
                                    className={`voucher-tab ${activeTab === 'user_generated' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('user_generated')}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        background: activeTab === 'user_generated' ? '#ffffff' : 'transparent',
                                        color: activeTab === 'user_generated' ? '#1f2937' : '#6b7280',
                                        fontWeight: activeTab === 'user_generated' ? '600' : '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    User Generated Codes ({userGeneratedCodes.length})
                                </button>
                            </div>
                            
                            <div className="voucher-codes-table-container">
                                {/* Admin Created Codes Tab */}
                                {activeTab === 'admin' && (
                                    <>
                                        {voucherCodes.length === 0 ? (
                                            <div className="no-vouchers-message">
                                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
                                                    <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Admin Voucher Codes Yet</h3>
                                                    <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                                        Create your first admin voucher code to start offering discounts to your customers.
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
                                                
                                                <table className="voucher-codes-table">
                                                    <thead>
                                                        <tr>
                                                            <th>CODE</th>
                                                            <th>TITLE</th>
                                                            <th>VALID FROM</th>
                                                            <th>VALID UNTIL</th>
                                                            <th>MAX USES</th>
                                                            <th>STATUS</th>
                                                            <th>ACTIONS</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {voucherCodes.map((voucher) => (
                                                            <tr key={voucher.id}>
                                                                <td>
                                                                    <span className="code-badge">{voucher.code}</span>
                                                                </td>
                                                                <td>{voucher.title}</td>
                                                                <td>{voucher.valid_from ? new Date(voucher.valid_from).toLocaleDateString() : 'N/A'}</td>
                                                                <td>{voucher.valid_until ? new Date(voucher.valid_until).toLocaleDateString() : 'N/A'}</td>
                                                                <td>{voucher.max_uses || 'Unlimited'}</td>
                                                                <td>{getStatusBadge(voucher)}</td>
                                                                <td>
                                                                    <div className="action-buttons">
                                                                        <button
                                                                            className="btn btn-icon"
                                                                            onClick={() => handleEdit(voucher)}
                                                                            title="Edit"
                                                                        >
                                                                            <Edit size={16} />
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-icon btn-danger"
                                                                            onClick={() => handleDelete(voucher.id)}
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-icon"
                                                                            onClick={() => handleViewUsage(voucher.id)}
                                                                            title="View Usage"
                                                                        >
                                                                            <Eye size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </>
                                        )}
                                    </>
                                )}

                                {/* User Generated Codes Tab */}
                                {activeTab === 'user_generated' && (
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
                                                    {userGeneratedCodes.length}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Codes</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
                                                    {userGeneratedCodes.filter(v => v.is_active).length}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#f59e0b' }}>
                                                    {userGeneratedCodes.filter(v => v.valid_until && new Date(v.valid_until) > new Date()).length}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Valid</div>
                                            </div>
                                        </div>
                                        
                                        <table className="voucher-codes-table">
                                            <thead>
                                                <tr>
                                                    <th>CODE</th>
                                                    <th>TITLE</th>
                                                    <th>CUSTOMER</th>
                                                    <th>PAID AMOUNT</th>
                                                    <th>VALID UNTIL</th>
                                                    <th>STATUS</th>
                                                    <th>ACTIONS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {userGeneratedCodes.map((voucher) => (
                                                    <tr key={voucher.id}>
                                                        <td>
                                                            <span className="code-badge user-generated">{voucher.code}</span>
                                                        </td>
                                                        <td>
                                                            <div>
                                                                <div>{voucher.title}</div>
                                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                                    {voucher.customer_email}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>{voucher.customer_name || 'N/A'}</td>
                                                        <td>£{voucher.paid_amount || '0.00'}</td>
                                                        <td>{voucher.valid_until ? new Date(voucher.valid_until).toLocaleDateString() : 'N/A'}</td>
                                                        <td>{getStatusBadge(voucher)}</td>
                                                        <td>
                                                            <div className="action-buttons">
                                                                <button
                                                                    className="btn btn-icon"
                                                                    onClick={() => handleViewUsage(voucher.id)}
                                                                    title="View Usage"
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Experiences Section */}
                <div className="experiences-section" style={{ marginTop: '30px' }}>
                    <div 
                        className="section-header"
                        onClick={() => setExperiencesExpanded(!experiencesExpanded)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginBottom: experiencesExpanded ? '20px' : '0'
                        }}
                    >
                        <div>
                            <h2 style={{ margin: 0, color: '#1f2937' }}>Experiences</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                                Manage flight experiences for balloning-book Select Experience section.
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button 
                                className="btn btn-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowExperiencesForm(true);
                                }}
                                style={{ margin: 0 }}
                            >
                                <Plus size={20} />
                                Create Experience
                            </button>
                            {experiencesExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                    </div>
                    
                    {experiencesExpanded && (
                        <>
                            <div className="experiences-stats" style={{ 
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
                                        {experiences.length}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Experiences</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
                                        {experiences.filter(e => e.is_active).length}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
                                </div>
                            </div>
                            
                            {experiences.length === 0 ? (
                                <div className="no-experiences-message">
                                    <div style={{ textAlign: 'center', padding: '40px' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎈</div>
                                        <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Experiences Yet</h3>
                                        <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                            Create your first experience to display in the balloning-book Select Experience section.
                                        </p>
                                        <button 
                                            className="btn btn-primary"
                                            onClick={() => setShowExperiencesForm(true)}
                                        >
                                            <Plus size={20} />
                                            Create First Experience
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <table className="experiences-table">
                                    <thead>
                                        <tr>
                                            <th>TITLE</th>
                                            <th>DESCRIPTION</th>
                                            <th>PRICE</th>
                                            <th>MAX PASSENGERS</th>
                                            <th>STATUS</th>
                                            <th>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {experiences.map((experience) => (
                                            <tr key={experience.id}>
                                                <td>
                                                    <div>
                                                        <div style={{ fontWeight: '600' }}>{experience.title}</div>
                                                        {experience.image_url && (
                                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                                {experience.image_url.startsWith('/uploads/') ? (
                                                                    <img 
                                                                        src={experience.image_url} 
                                                                        alt={experience.title}
                                                                        style={{ 
                                                                            width: '60px', 
                                                                            height: '40px', 
                                                                            objectFit: 'cover',
                                                                            borderRadius: '4px',
                                                                            marginTop: '4px'
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    `Image: ${experience.image_url}`
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ maxWidth: '300px', fontSize: '14px' }}>
                                                        {experience.description}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: '600' }}>
                                                        £{experience.price_from}
                                                        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>
                                                            {experience.price_unit}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>{experience.max_passengers}</td>
                                                <td>
                                                    {experience.is_active ? (
                                                        <span className="status-badge active">Active</span>
                                                    ) : (
                                                        <span className="status-badge inactive">Inactive</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn btn-icon"
                                                            onClick={() => handleEditExperience(experience)}
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-icon btn-danger"
                                                            onClick={() => handleDeleteExperience(experience.id)}
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
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Create/Edit Voucher Form Modal */}
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
                                    <label>Valid From</label>
                                    <input
                                        type="date"
                                        value={formData.valid_from}
                                        onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Valid Until</label>
                                    <input
                                        type="date"
                                        value={formData.valid_until}
                                        onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
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
                            
                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowCreateForm(false);
                                    setShowEditForm(false);
                                    resetForm();
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {showEditForm ? 'Update Voucher Code' : 'Create Voucher Code'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Experience Form Modal */}
            {(showExperiencesForm || showEditExperienceForm) && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{showEditExperienceForm ? 'Edit Experience' : 'Create New Experience'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowExperiencesForm(false);
                                    setShowEditExperienceForm(false);
                                    resetExperienceForm();
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleExperienceSubmit} className="experience-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Title *</label>
                                    <input
                                        type="text"
                                        value={experienceFormData.title}
                                        onChange={(e) => setExperienceFormData({...experienceFormData, title: e.target.value})}
                                        placeholder="e.g., Shared Flight"
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Price From (£) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={experienceFormData.price_from}
                                        onChange={(e) => setExperienceFormData({...experienceFormData, price_from: e.target.value})}
                                        placeholder="180.00"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Price Unit</label>
                                    <select
                                        value={experienceFormData.price_unit}
                                        onChange={(e) => setExperienceFormData({...experienceFormData, price_unit: e.target.value})}
                                    >
                                        <option value="pp">Per Person (pp)</option>
                                        <option value="total">Total</option>
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Max Passengers</label>
                                    <input
                                        type="number"
                                        value={experienceFormData.max_passengers}
                                        onChange={(e) => setExperienceFormData({...experienceFormData, max_passengers: parseInt(e.target.value)})}
                                        placeholder="8"
                                        min="1"
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    value={experienceFormData.description}
                                    onChange={(e) => setExperienceFormData({...experienceFormData, description: e.target.value})}
                                    placeholder="Describe the experience..."
                                    rows="4"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Experience Image</label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setExperienceFormData({...experienceFormData, image_file: file});
                                            }
                                        }}
                                        style={{ flex: 1 }}
                                    />
                                    {experienceFormData.image_url && (
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                            Current: {experienceFormData.image_url}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Sort Order</label>
                                    <input
                                        type="number"
                                        value={experienceFormData.sort_order}
                                        onChange={(e) => setExperienceFormData({...experienceFormData, sort_order: parseInt(e.target.value)})}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={experienceFormData.is_active}
                                        onChange={(e) => setExperienceFormData({...experienceFormData, is_active: e.target.value === 'true'})}
                                    >
                                        <option value={true}>Active</option>
                                        <option value={false}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowExperiencesForm(false);
                                    setShowEditExperienceForm(false);
                                    resetExperienceForm();
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {showEditExperienceForm ? 'Update Experience' : 'Create Experience'}
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
                            <h3>Voucher Usage History</h3>
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
                                <table className="usage-table">
                                    <thead>
                                        <tr>
                                            <th>Date Used</th>
                                            <th>Customer</th>
                                            <th>Original Amount</th>
                                            <th>Final Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usageData.map((usage, index) => (
                                            <tr key={index}>
                                                <td>{new Date(usage.used_at).toLocaleDateString()}</td>
                                                <td>{usage.customer_name || 'N/A'}</td>
                                                <td>£{usage.original_amount || '0.00'}</td>
                                                <td>£{usage.final_amount || '0.00'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowUsageModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings; 
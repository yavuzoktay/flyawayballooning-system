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
        max_passengers: 8,
        sort_order: 0,
        is_active: true
    });
    
    // Voucher Types state
    const [voucherTypes, setVoucherTypes] = useState([]);
    const [showVoucherTypesForm, setShowVoucherTypesForm] = useState(false);
    const [showEditVoucherTypeForm, setShowEditVoucherTypeForm] = useState(false);
    const [selectedVoucherType, setSelectedVoucherType] = useState(null);
    const [voucherTypeFormData, setVoucherTypeFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        image_file: null,
        max_passengers: 8,
        validity_months: 18,
        flight_days: 'Monday - Friday',
        flight_time: 'AM',
        features: '[]',
        terms: '',
        sort_order: 0,
        is_active: true
    });
    
    // Add to Booking Items state
    const [addToBookingItems, setAddToBookingItems] = useState([]);
    const [showAddToBookingForm, setShowAddToBookingForm] = useState(false);
    const [showEditAddToBookingForm, setShowEditAddToBookingForm] = useState(false);
    const [selectedAddToBookingItem, setSelectedAddToBookingItem] = useState(null);
    const [addToBookingFormData, setAddToBookingFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        image_file: null,
        price: '',
        price_unit: 'fixed',
        category: 'Merchandise',
        stock_quantity: 0,
        is_physical_item: true,
        weight_grams: 0,
        journey_types: ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'],
        sort_order: 0,
        is_active: true
    });
    
    // Additional Information Questions state
    const [additionalInfoQuestions, setAdditionalInfoQuestions] = useState([]);
    const [showAdditionalInfoForm, setShowAdditionalInfoForm] = useState(false);
    const [showEditAdditionalInfoForm, setShowEditAdditionalInfoForm] = useState(false);
    const [selectedAdditionalInfoQuestion, setSelectedAdditionalInfoQuestion] = useState(null);
    const [additionalInfoFormData, setAdditionalInfoFormData] = useState({
        question_text: '',
        question_type: 'dropdown',
        is_required: false,
        options: '[]',
        placeholder_text: '',
        help_text: '',
        category: 'General',
        journey_types: ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'],
        sort_order: 0,
        is_active: true
    });
    
    // Terms & Conditions state
    const [termsAndConditions, setTermsAndConditions] = useState([]);
    const [showTermsForm, setShowTermsForm] = useState(false);
    const [showEditTermsForm, setShowEditTermsForm] = useState(false);
    const [selectedTerms, setSelectedTerms] = useState(null);
    const [termsFormData, setTermsFormData] = useState({
        title: '',
        content: '',
        voucher_type_ids: [],
        is_active: true,
        sort_order: 0
    });
    
    // Collapsible sections state
    const [voucherCodesExpanded, setVoucherCodesExpanded] = useState(true);
    const [experiencesExpanded, setExperiencesExpanded] = useState(false);
    const [voucherTypesExpanded, setVoucherTypesExpanded] = useState(false);
    const [addToBookingExpanded, setAddToBookingExpanded] = useState(false);
    const [additionalInfoExpanded, setAdditionalInfoExpanded] = useState(false);
    const [termsExpanded, setTermsExpanded] = useState(false);
    
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
    const voucherTypeOptions = ['Weekday Morning', 'Flexible Weekday', 'Any Day Flight'];
    const journeyTypes = ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'];

    useEffect(() => {
        fetchVoucherCodes();
        fetchExperiences();
        fetchVoucherTypes();
        fetchAddToBookingItems();
        fetchAdditionalInfoQuestions();
        fetchTermsAndConditions();
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

    const fetchVoucherTypes = async () => {
        try {
            const response = await axios.get('/api/voucher-types');
            if (response.data.success) {
                setVoucherTypes(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching voucher types:', error);
        }
    };

    const fetchAddToBookingItems = async () => {
        try {
            const response = await axios.get('/api/add-to-booking-items');
            if (response.data.success) {
                console.log('Fetched add to booking items:', response.data.data);
                setAddToBookingItems(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching add to booking items:', error);
        }
    };

    const fetchAdditionalInfoQuestions = async () => {
        try {
            const response = await axios.get('/api/additional-information-questions');
            if (response.data.success) {
                setAdditionalInfoQuestions(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching additional information questions:', error);
        }
    };

    const fetchTermsAndConditions = async () => {
        try {
            const response = await axios.get('/api/terms-and-conditions');
            if (response.data.success) {
                setTermsAndConditions(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching terms and conditions:', error);
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
        if (!experienceFormData.title || !experienceFormData.description) {
            alert('Please fill in all required fields: Title and Description');
            return;
        }
        
        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('title', experienceFormData.title);
            formData.append('description', experienceFormData.description);
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

    // Voucher Types form handling
    const handleVoucherTypeSubmit = async (e) => {
        e.preventDefault();
        
        // Form validation
        if (!voucherTypeFormData.title || !voucherTypeFormData.description) {
            alert('Please fill in all required fields: Title and Description');
            return;
        }
        
        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('title', voucherTypeFormData.title);
            formData.append('description', voucherTypeFormData.description);
            formData.append('max_passengers', voucherTypeFormData.max_passengers);
            formData.append('validity_months', voucherTypeFormData.validity_months);
            formData.append('flight_days', voucherTypeFormData.flight_days);
            formData.append('flight_time', voucherTypeFormData.flight_time);
            formData.append('features', voucherTypeFormData.features);
            formData.append('terms', voucherTypeFormData.terms);
            formData.append('sort_order', voucherTypeFormData.sort_order);
            formData.append('is_active', voucherTypeFormData.is_active);
            
            // Add image file if selected
            if (voucherTypeFormData.image_file) {
                formData.append('voucher_type_image', voucherTypeFormData.image_file);
            } else if (voucherTypeFormData.image_url) {
                // Keep existing image URL if no new file selected
                formData.append('image_url', voucherTypeFormData.image_url);
            }
            
            if (showEditVoucherTypeForm) {
                await axios.put(`/api/voucher-types/${selectedVoucherType.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post('/api/voucher-types', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            
            fetchVoucherTypes();
            resetVoucherTypeForm();
            setShowVoucherTypesForm(false);
            setShowEditVoucherTypeForm(false);
        } catch (error) {
            console.error('Error saving voucher type:', error);
            alert(error.response?.data?.message || 'Error saving voucher type');
        }
    };

    const handleEditVoucherType = (voucherType) => {
        setSelectedVoucherType(voucherType);
        setVoucherTypeFormData({
            title: voucherType.title,
            description: voucherType.description,
            image_url: voucherType.image_url || '',
            image_file: null,
            max_passengers: voucherType.max_passengers || 8,
            validity_months: voucherType.validity_months || 18,
            flight_days: voucherType.flight_days || 'Monday - Friday',
            flight_time: voucherType.flight_time || 'AM',
            features: voucherType.features || '[]',
            terms: voucherType.terms || '',
            sort_order: voucherType.sort_order || 0,
            is_active: voucherType.is_active
        });
        setShowEditVoucherTypeForm(true);
    };

    const handleDeleteVoucherType = async (id) => {
        if (window.confirm('Are you sure you want to delete this voucher type?')) {
            try {
                await axios.delete(`/api/voucher-types/${id}`);
                fetchVoucherTypes();
            } catch (error) {
                console.error('Error deleting voucher type:', error);
                alert(error.response?.data?.message || 'Error deleting voucher type');
            }
        }
    };

    const resetVoucherTypeForm = () => {
        setVoucherTypeFormData({
            title: '',
            description: '',
            image_url: '',
            image_file: null,
            max_passengers: 8,
            validity_months: 18,
            flight_days: 'Monday - Friday',
            flight_time: 'AM',
            features: '[]',
            terms: '',
            sort_order: 0,
            is_active: true
        });
        setSelectedVoucherType(null);
    };

    // Add to Booking Items form handling
    const handleAddToBookingSubmit = async (e) => {
        e.preventDefault();
        
        // Form validation
        if (!addToBookingFormData.title || !addToBookingFormData.description || !addToBookingFormData.price) {
            alert('Please fill in all required fields: Title, Description, and Price');
            return;
        }
        
        if (addToBookingFormData.journey_types.length === 0) {
            alert('Please select at least one journey type');
            return;
        }
        
        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('title', addToBookingFormData.title);
            formData.append('description', addToBookingFormData.description);
            formData.append('price', addToBookingFormData.price);
            formData.append('price_unit', addToBookingFormData.price_unit);
            formData.append('category', addToBookingFormData.category);
            formData.append('stock_quantity', addToBookingFormData.stock_quantity);
            formData.append('is_physical_item', addToBookingFormData.is_physical_item);
            formData.append('weight_grams', addToBookingFormData.weight_grams);
            formData.append('journey_types', JSON.stringify(addToBookingFormData.journey_types));
            formData.append('sort_order', addToBookingFormData.sort_order);
            formData.append('is_active', addToBookingFormData.is_active);
            
            // Debug: Log the form data being sent
            console.log('Form data being sent:', {
                title: addToBookingFormData.title,
                description: addToBookingFormData.description,
                price: addToBookingFormData.price,
                price_unit: addToBookingFormData.price_unit,
                category: addToBookingFormData.category,
                stock_quantity: addToBookingFormData.stock_quantity,
                is_physical_item: addToBookingFormData.is_physical_item,
                weight_grams: addToBookingFormData.weight_grams,
                journey_types: addToBookingFormData.journey_types,
                sort_order: addToBookingFormData.sort_order,
                is_active: addToBookingFormData.is_active
            });
            
            // Debug: Log FormData entries
            console.log('FormData entries:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value} (type: ${typeof value})`);
            }
            
            // Add image file if selected
            if (addToBookingFormData.image_file) {
                formData.append('add_to_booking_item_image', addToBookingFormData.image_file);
            } else if (addToBookingFormData.image_url) {
                // Keep existing image URL if no new file selected
                formData.append('image_url', addToBookingFormData.image_url);
            }
            
            if (showEditAddToBookingForm) {
                await axios.put(`/api/add-to-booking-items/${selectedAddToBookingItem.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post('/api/add-to-booking-items', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            
            fetchAddToBookingItems();
            resetAddToBookingForm();
            setShowAddToBookingForm(false);
            setShowEditAddToBookingForm(false);
        } catch (error) {
            console.error('Error saving add to booking item:', error);
            alert(error.response?.data?.message || 'Error saving add to booking item');
        }
    };

    const handleEditAddToBookingItem = (item) => {
        setSelectedAddToBookingItem(item);
        
        // Safely parse journey_types - handle both JSON and string formats
        let parsedJourneyTypes = ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'];
        if (item.journey_types) {
            try {
                // If it's already an array, use it directly
                if (Array.isArray(item.journey_types)) {
                    parsedJourneyTypes = item.journey_types;
                } else if (typeof item.journey_types === 'string') {
                    // Try to parse as JSON first
                    try {
                        parsedJourneyTypes = JSON.parse(item.journey_types);
                    } catch (parseError) {
                        // If JSON parsing fails, try to split by comma
                        if (item.journey_types.includes(',')) {
                            parsedJourneyTypes = item.journey_types.split(',').map(type => type.trim());
                        } else {
                            // Single value, wrap in array
                            parsedJourneyTypes = [item.journey_types.trim()];
                        }
                    }
                }
            } catch (error) {
                console.warn('Error parsing journey_types:', error);
                // Fallback to default
                parsedJourneyTypes = ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'];
            }
        }
        
        setAddToBookingFormData({
            title: item.title,
            description: item.description,
            image_url: item.image_url || '',
            image_file: null,
            price: item.price,
            price_unit: item.price_unit || 'fixed',
            category: item.category || 'Merchandise',
            stock_quantity: item.stock_quantity || 0,
            is_physical_item: Boolean(item.is_physical_item),
            weight_grams: item.weight_grams || 0,
            journey_types: parsedJourneyTypes,
            sort_order: item.sort_order || 0,
            is_active: Boolean(item.is_active)
        });
        setShowEditAddToBookingForm(true);
    };

    const handleDeleteAddToBookingItem = async (id) => {
        if (window.confirm('Are you sure you want to delete this add to booking item?')) {
            try {
                await axios.delete(`/api/add-to-booking-items/${id}`);
                fetchAddToBookingItems();
            } catch (error) {
                console.error('Error deleting add to booking item:', error);
                alert(error.response?.data?.message || 'Error deleting add to booking item');
            }
        }
    };

    const resetAddToBookingForm = () => {
        setAddToBookingFormData({
            title: '',
            description: '',
            image_url: '',
            image_file: null,
            price: '',
            price_unit: 'fixed',
            category: 'Merchandise',
            stock_quantity: 0,
            is_physical_item: true,
            weight_grams: 0,
            journey_types: ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'],
            sort_order: 0,
            is_active: true
        });
        setSelectedAddToBookingItem(null);
    };

    // Additional Information Questions form handling
    const handleAdditionalInfoSubmit = async (e) => {
        e.preventDefault();
        
        // Form validation
        if (!additionalInfoFormData.question_text || !additionalInfoFormData.question_type) {
            alert('Please fill in all required fields: Question Text and Question Type');
            return;
        }
        
        if (additionalInfoFormData.journey_types.length === 0) {
            alert('Please select at least one journey type');
            return;
        }
        
        try {
            // Debug: Log the form data being sent
            console.log('Additional info form data being sent:', additionalInfoFormData);
            console.log('journey_types being sent:', additionalInfoFormData.journey_types);
            console.log('journey_types type:', typeof additionalInfoFormData.journey_types);
            console.log('journey_types isArray:', Array.isArray(additionalInfoFormData.journey_types));
            
            if (showEditAdditionalInfoForm) {
                await axios.put(`/api/additional-information-questions/${selectedAdditionalInfoQuestion.id}`, additionalInfoFormData);
            } else {
                await axios.post('/api/additional-information-questions', additionalInfoFormData);
            }
            
            fetchAdditionalInfoQuestions();
            resetAdditionalInfoForm();
            setShowAdditionalInfoForm(false);
            setShowEditAdditionalInfoForm(false);
        } catch (error) {
            console.error('Error saving additional information question:', error);
            alert(error.response?.data?.message || 'Error saving additional information question');
        }
    };

    const handleEditAdditionalInfoQuestion = (question) => {
        setSelectedAdditionalInfoQuestion(question);
        
        // Safely parse journey_types - handle both JSON and string formats
        let parsedJourneyTypes = ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'];
        if (question.journey_types) {
            try {
                // If it's already an array, use it directly
                if (Array.isArray(question.journey_types)) {
                    parsedJourneyTypes = question.journey_types;
                } else if (typeof question.journey_types === 'string') {
                    // Try to parse as JSON first
                    try {
                        parsedJourneyTypes = JSON.parse(question.journey_types);
                    } catch (parseError) {
                        // If JSON parsing fails, try to split by comma
                        if (question.journey_types.includes(',')) {
                            parsedJourneyTypes = question.journey_types.split(',').map(type => type.trim());
                        } else {
                            // Single value, wrap in array
                            parsedJourneyTypes = [question.journey_types.trim()];
                        }
                    }
                }
            } catch (error) {
                console.warn('Error parsing journey_types:', error);
                // Fallback to default
                parsedJourneyTypes = ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'];
            }
        }
        
        setAdditionalInfoFormData({
            question_text: question.question_text,
            question_type: question.question_type,
            is_required: question.is_required,
            options: question.options || '[]',
            placeholder_text: question.placeholder_text || '',
            help_text: question.help_text || '',
            category: question.category || 'General',
            journey_types: parsedJourneyTypes,
            sort_order: question.sort_order || 0,
            is_active: question.is_active
        });
        setShowEditAdditionalInfoForm(true);
    };

    const handleDeleteAdditionalInfoQuestion = async (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                await axios.delete(`/api/additional-information-questions/${id}`);
                fetchAdditionalInfoQuestions();
            } catch (error) {
                console.error('Error deleting additional information question:', error);
                alert(error.response?.data?.message || 'Error deleting additional information question');
            }
        }
    };

    const resetAdditionalInfoForm = () => {
        setAdditionalInfoFormData({
            question_text: '',
            question_type: 'dropdown',
            is_required: false,
            options: '[]',
            placeholder_text: '',
            help_text: '',
            category: 'General',
            journey_types: ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'],
            sort_order: 0,
            is_active: true
        });
        setSelectedAdditionalInfoQuestion(null);
    };

    // Terms & Conditions form handling
    const handleTermsSubmit = async (e) => {
        e.preventDefault();
        
        // Debug log
        console.log('Terms form data:', termsFormData);
        console.log('voucher_type_ids type:', typeof termsFormData.voucher_type_ids);
        console.log('voucher_type_ids value:', termsFormData.voucher_type_ids);
        console.log('voucher_type_ids isArray:', Array.isArray(termsFormData.voucher_type_ids));
        
        // Ensure voucher_type_ids is an array
        const formDataToSend = {
            ...termsFormData,
            voucher_type_ids: Array.isArray(termsFormData.voucher_type_ids) ? termsFormData.voucher_type_ids : []
        };
        
        console.log('Form data to send:', formDataToSend);
        
        // Form validation
        if (!formDataToSend.title || !formDataToSend.content || formDataToSend.voucher_type_ids.length === 0) {
            alert('Please fill in all required fields: Title, Content, and select at least one Voucher Type');
            return;
        }
        
        try {
            if (showEditTermsForm) {
                await axios.put(`/api/terms-and-conditions/${selectedTerms.id}`, formDataToSend);
            } else {
                await axios.post('/api/terms-and-conditions', formDataToSend);
            }
            
            fetchTermsAndConditions();
            resetTermsForm();
            setShowTermsForm(false);
            setShowEditTermsForm(false);
        } catch (error) {
            console.error('Error saving terms and conditions:', error);
            alert(error.response?.data?.message || 'Error saving terms and conditions');
        }
    };

    const handleEditTerms = (terms) => {
        setSelectedTerms(terms);
        setTermsFormData({
            title: terms.title,
            content: terms.content,
            voucher_type_ids: (() => {
                try {
                    if (terms.voucher_type_ids) {
                        const parsed = JSON.parse(terms.voucher_type_ids);
                        return Array.isArray(parsed) ? parsed : [];
                    }
                    return [];
                } catch (error) {
                    console.error('Error parsing voucher_type_ids:', error);
                    return [];
                }
            })(),
            is_active: terms.is_active,
            sort_order: terms.sort_order || 0
        });
        setShowEditTermsForm(true);
    };

    const handleDeleteTerms = async (id) => {
        if (window.confirm('Are you sure you want to delete these terms and conditions?')) {
            try {
                await axios.delete(`/api/terms-and-conditions/${id}`);
                fetchTermsAndConditions();
            } catch (error) {
                console.error('Error deleting terms and conditions:', error);
                alert(error.response?.data?.message || 'Error deleting terms and conditions');
            }
        }
    };

    const resetTermsForm = () => {
        setTermsFormData({
            title: '',
            content: '',
            voucher_type_ids: [],
            is_active: true,
            sort_order: 0
        });
        setSelectedTerms(null);
    };

    const handleVoucherTypeToggle = (voucherTypeId) => {
        console.log('Toggle voucher type:', voucherTypeId);
        console.log('Current voucher_type_ids:', termsFormData.voucher_type_ids);
        
        setTermsFormData(prev => {
            const currentIds = Array.isArray(prev.voucher_type_ids) ? prev.voucher_type_ids : [];
            console.log('Current IDs array:', currentIds);
            
            let newIds;
            if (currentIds.includes(voucherTypeId)) {
                newIds = currentIds.filter(id => id !== voucherTypeId);
                console.log('Removing ID:', voucherTypeId);
            } else {
                newIds = [...currentIds, voucherTypeId];
                console.log('Adding ID:', voucherTypeId);
            }
            
            console.log('New IDs array:', newIds);
            
            return {
                ...prev,
                voucher_type_ids: newIds
            };
        });
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
                <div className="settings-card" style={{ marginBottom: '24px' }}>
                    <div 
                        className="card-header"
                        onClick={() => setVoucherCodesExpanded(!voucherCodesExpanded)}
                        style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '20px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
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
                            
                            <div className="voucher-codes-table-container" style={{ 
                                width: '100%', 
                                overflowX: 'auto',
                                minHeight: '400px'
                            }}>
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
                <div className="settings-card" style={{ marginBottom: '24px' }}>
                    <div 
                        className="card-header"
                        onClick={() => setExperiencesExpanded(!experiencesExpanded)}
                        style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '20px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
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
                                <div className="experiences-table-container" style={{ 
                                    width: '100%', 
                                    overflowX: 'auto',
                                    minHeight: '400px'
                                }}>
                                    <table className="experiences-table">
                                        <thead>
                                            <tr>
                                                <th>TITLE</th>
                                                <th>DESCRIPTION</th>
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
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Add to Booking Section */}
            <div className="settings-card" style={{ marginBottom: '24px' }}>
                <div 
                    className="card-header"
                    onClick={() => setAddToBookingExpanded(!addToBookingExpanded)}
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '20px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <div>
                        <h2 style={{ margin: 0, color: '#1f2937' }}>Add to Booking</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                            Manage additional items that can be added to bookings (merchandise, services, etc.).
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            className="btn btn-primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowAddToBookingForm(true);
                            }}
                            style={{ margin: 0 }}
                        >
                            <Plus size={20} />
                            Create Item
                        </button>
                        {addToBookingExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>
                
                {addToBookingExpanded && (
                    <>
                        <div className="add-to-booking-stats" style={{ 
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
                                    {addToBookingItems.length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Items</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
                                    {addToBookingItems.filter(item => item.is_active).length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#3b82f6' }}>
                                    {addToBookingItems.filter(item => item.category === 'Merchandise').length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Merchandise</div>
                            </div>
                        </div>
                        
                        {addToBookingItems.length === 0 ? (
                            <div className="no-add-to-booking-message">
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛍️</div>
                                    <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Items Yet</h3>
                                    <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                        Create your first item to display in the balloning-book Add to Booking section.
                                    </p>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => setShowAddToBookingForm(true)}
                                    >
                                        <Plus size={20} />
                                        Create First Item
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="add-to-booking-table-container" style={{ 
                                width: '100%', 
                                overflowX: 'auto',
                                minHeight: '400px'
                            }}>
                                <table className="add-to-booking-table">
                                    <thead>
                                        <tr>
                                            <th>ITEM</th>
                                            <th>DESCRIPTION</th>
                                            <th>PRICE</th>
                                            <th>CATEGORY</th>
                                            <th>JOURNEY TYPES</th>
                                            <th>STOCK</th>
                                            <th>WEIGHT</th>
                                            <th>STATUS</th>
                                            <th>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {addToBookingItems.map((item) => (
                                            <tr key={item.id}>
                                                <td>
                                                    <div>
                                                        <div style={{ fontWeight: '600' }}>{item.title}</div>
                                                        {item.image_url && (
                                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                                {item.image_url.startsWith('/uploads/') ? (
                                                                    <img 
                                                                        src={item.image_url} 
                                                                        alt={item.title}
                                                                        style={{ 
                                                                            width: '60px', 
                                                                            height: '40px', 
                                                                            objectFit: 'cover',
                                                                            borderRadius: '4px',
                                                                            marginTop: '4px'
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    `Image: ${item.image_url}`
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ maxWidth: '300px', fontSize: '14px' }}>
                                                        {item.description}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: '600' }}>
                                                        £{item.price}
                                                        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>
                                                            {item.price_unit === 'pp' ? 'pp' : 'fixed'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: '500',
                                                        backgroundColor: item.category === 'Merchandise' ? '#dbeafe' : '#fef3c7',
                                                        color: item.category === 'Merchandise' ? '#1e40af' : '#92400e'
                                                    }}>
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td>
                                                    {item.journey_types ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {(() => {
                                                                let journeyTypes = [];
                                                                try {
                                                                    if (Array.isArray(item.journey_types)) {
                                                                        journeyTypes = item.journey_types;
                                                                    } else if (typeof item.journey_types === 'string') {
                                                                        try {
                                                                            journeyTypes = JSON.parse(item.journey_types);
                                                                        } catch (parseError) {
                                                                            if (item.journey_types.includes(',')) {
                                                                                journeyTypes = item.journey_types.split(',').map(type => type.trim());
                                                                            } else {
                                                                                journeyTypes = [item.journey_types.trim()];
                                                                            }
                                                                        }
                                                                    }
                                                                } catch (error) {
                                                                    console.warn('Error parsing journey_types for display:', error);
                                                                    journeyTypes = ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'];
                                                                }
                                                                
                                                                return journeyTypes.map((journeyType) => (
                                                                    <span key={journeyType} style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        backgroundColor: '#dbeafe',
                                                                        color: '#1e40af'
                                                                    }}>
                                                                        {journeyType}
                                                                    </span>
                                                                ));
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                            {item.journey_types === undefined || item.journey_types === null ? 
                                                                'Not set' : 'No journey types'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {item.stock_quantity === 0 ? (
                                                        <span style={{ color: '#10b981', fontSize: '12px' }}>Unlimited</span>
                                                    ) : (
                                                        <span style={{ color: item.stock_quantity > 10 ? '#10b981' : item.stock_quantity > 5 ? '#f59e0b' : '#ef4444' }}>
                                                            {item.stock_quantity}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {item.weight_grams > 0 ? `${item.weight_grams}g` : '-'}
                                                </td>
                                                <td>
                                                    {item.is_active ? (
                                                        <span className="status-badge active">Active</span>
                                                    ) : (
                                                        <span className="status-badge inactive">Inactive</span>
                                                    )}
                                                    {/* Debug: Show raw value */}
                                                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                                                        Raw: {item.is_active} (type: {typeof item.is_active})
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn btn-icon"
                                                            onClick={() => handleEditAddToBookingItem(item)}
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-icon btn-danger"
                                                            onClick={() => handleDeleteAddToBookingItem(item.id)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                        {/* Test button to toggle status */}
                                                        <button
                                                            className="btn btn-sm"
                                                            onClick={async () => {
                                                                try {
                                                                    const newStatus = !item.is_active;
                                                                    console.log(`Toggling status for item ${item.id} from ${item.is_active} to ${newStatus}`);
                                                                    
                                                                    const formData = new FormData();
                                                                    formData.append('title', item.title);
                                                                    formData.append('description', item.description);
                                                                    formData.append('price', item.price);
                                                                    formData.append('price_unit', item.price_unit || 'fixed');
                                                                    formData.append('category', item.category || 'Merchandise');
                                                                    formData.append('stock_quantity', item.stock_quantity || 0);
                                                                    formData.append('is_physical_item', item.is_physical_item);
                                                                    formData.append('weight_grams', item.weight_grams || 0);
                                                                    formData.append('journey_types', item.journey_types ? JSON.stringify(item.journey_types) : JSON.stringify(['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift']));
                                                                    formData.append('sort_order', item.sort_order || 0);
                                                                    formData.append('is_active', newStatus);
                                                                    
                                                                    await axios.put(`/api/add-to-booking-items/${item.id}`, formData, {
                                                                        headers: { 'Content-Type': 'multipart/form-data' }
                                                                    });
                                                                    
                                                                    fetchAddToBookingItems();
                                                                } catch (error) {
                                                                    console.error('Error toggling status:', error);
                                                                    alert('Error toggling status');
                                                                }
                                                            }}
                                                            style={{ 
                                                                fontSize: '10px', 
                                                                padding: '2px 6px',
                                                                backgroundColor: item.is_active ? '#ef4444' : '#10b981',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {item.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Voucher Types Section */}
            <div className="settings-card" style={{ marginBottom: '24px' }}>
                <div 
                    className="card-header"
                    onClick={() => setVoucherTypesExpanded(!voucherTypesExpanded)}
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '20px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <div>
                        <h2 style={{ margin: 0, color: '#1f2937' }}>Voucher Types</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                            Manage voucher types for balloning-book Select Voucher Type section.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            className="btn btn-primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowVoucherTypesForm(true);
                            }}
                            style={{ margin: 0 }}
                        >
                            <Plus size={20} />
                            Create Voucher Type
                        </button>
                        {voucherTypesExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>
                
                {voucherTypesExpanded && (
                    <>
                        <div className="voucher-types-stats" style={{ 
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
                                    {voucherTypes.length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Voucher Types</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
                                    {voucherTypes.filter(vt => vt.is_active).length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
                            </div>
                        </div>
                        
                        {voucherTypes.length === 0 ? (
                            <div className="no-voucher-types-message">
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
                                    <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Voucher Types Yet</h3>
                                    <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                        Create your first voucher type to display in the balloning-book Select Voucher Type section.
                                    </p>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => setShowVoucherTypesForm(true)}
                                    >
                                        <Plus size={20} />
                                        Create First Voucher Type
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="voucher-types-table-container" style={{ 
                                width: '100%', 
                                overflowX: 'auto',
                                minHeight: '400px'
                            }}>
                                <table className="voucher-types-table">
                                    <thead>
                                        <tr>
                                            <th>TITLE</th>
                                            <th>DESCRIPTION</th>
                                            <th>FLIGHT DAYS</th>
                                            <th>FLIGHT TIME</th>
                                            <th>VALIDITY</th>
                                            <th>STATUS</th>
                                            <th>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {voucherTypes.map((voucherType) => (
                                            <tr key={voucherType.id}>
                                                <td>
                                                    <div>
                                                        <div style={{ fontWeight: '600' }}>{voucherType.title}</div>
                                                        {voucherType.image_url && (
                                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                                {voucherType.image_url.startsWith('/uploads/') ? (
                                                                    <img 
                                                                        src={voucherType.image_url} 
                                                                        alt={voucherType.title}
                                                                        style={{ 
                                                                            width: '60px', 
                                                                            height: '40px', 
                                                                            objectFit: 'cover',
                                                                            borderRadius: '4px',
                                                                            marginTop: '4px'
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    `Image: ${voucherType.image_url}`
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ maxWidth: '300px', fontSize: '14px' }}>
                                                        {voucherType.description}
                                                    </div>
                                                </td>
                                                <td>{voucherType.flight_days}</td>
                                                <td>{voucherType.flight_time}</td>
                                                <td>{voucherType.validity_months} months</td>
                                                <td>
                                                    {voucherType.is_active ? (
                                                        <span className="status-badge active">Active</span>
                                                    ) : (
                                                        <span className="status-badge inactive">Inactive</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn btn-icon"
                                                            onClick={() => handleEditVoucherType(voucherType)}
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-icon btn-danger"
                                                            onClick={() => handleDeleteVoucherType(voucherType.id)}
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
                        )}
                    </>
                )}
            </div>

            {/* Additional Information Section */}
            <div className="settings-card" style={{ marginBottom: '24px' }}>
                <div 
                    className="card-header"
                    onClick={() => setAdditionalInfoExpanded(!additionalInfoExpanded)}
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '20px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <div>
                        <h2 style={{ margin: 0, color: '#1f2937' }}>Additional Information</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                            Manage additional information questions for booking forms (dropdowns, text fields, etc.).
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            className="btn btn-primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowAdditionalInfoForm(true);
                            }}
                            style={{ margin: 0 }}
                        >
                            <Plus size={20} />
                            Create Question
                        </button>
                        {additionalInfoExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>
                
                {additionalInfoExpanded && (
                    <>
                        <div className="additional-info-stats" style={{ 
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
                                    {additionalInfoQuestions.length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Questions</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
                                    {additionalInfoQuestions.filter(q => q.is_active).length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#3b82f6' }}>
                                    {additionalInfoQuestions.filter(q => q.is_required).length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Required</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#f59e0b' }}>
                                    {additionalInfoQuestions.filter(q => q.question_type === 'dropdown').length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Dropdowns</div>
                            </div>
                        </div>
                        
                        {additionalInfoQuestions.length === 0 ? (
                            <div className="no-additional-info-message">
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>❓</div>
                                    <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Questions Yet</h3>
                                    <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                        Create your first question to display in the balloning-book Additional Information section.
                                    </p>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => setShowAdditionalInfoForm(true)}
                                    >
                                        <Plus size={20} />
                                        Create First Question
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="additional-info-table-container" style={{ 
                                width: '100%', 
                                overflowX: 'auto',
                                minHeight: '400px'
                            }}>
                                <table className="additional-info-table">
                                    <thead>
                                        <tr>
                                            <th>QUESTION</th>
                                            <th>TYPE</th>
                                            <th>OPTIONS</th>
                                            <th>CATEGORY</th>
                                            <th>JOURNEY TYPES</th>
                                            <th>REQUIRED</th>
                                            <th>HELP TEXT</th>
                                            <th>STATUS</th>
                                            <th>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {additionalInfoQuestions.map((question) => (
                                            <tr key={question.id}>
                                                <td>
                                                    <div>
                                                        <div style={{ fontWeight: '600' }}>{question.question_text}</div>
                                                        {question.placeholder_text && (
                                                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                                Placeholder: {question.placeholder_text}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: '500',
                                                        backgroundColor: question.question_type === 'dropdown' ? '#dbeafe' : 
                                                                       question.question_type === 'text' ? '#fef3c7' :
                                                                       question.question_type === 'radio' ? '#fce7f3' : '#dcfce7',
                                                        color: question.question_type === 'dropdown' ? '#1e40af' : 
                                                               question.question_type === 'text' ? '#92400e' :
                                                               question.question_type === 'radio' ? '#be185d' : '#166534'
                                                    }}>
                                                        {question.question_type}
                                                    </span>
                                                </td>
                                                <td>
                                                    {question.options && question.options !== '[]' ? (
                                                        <div style={{ maxWidth: '200px', fontSize: '12px' }}>
                                                            {JSON.parse(question.options).slice(0, 3).join(', ')}
                                                            {JSON.parse(question.options).length > 3 && '...'}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>No options</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: '500',
                                                        backgroundColor: question.category === 'General' ? '#f3f4f6' : 
                                                                       question.category === 'Communication' ? '#dbeafe' :
                                                                       question.category === 'Marketing' ? '#fef3c7' : '#fce7f3',
                                                        color: question.category === 'General' ? '#374151' : 
                                                               question.category === 'Communication' ? '#1e40af' :
                                                               question.category === 'Marketing' ? '#92400e' : '#be185d'
                                                    }}>
                                                        {question.category}
                                                    </span>
                                                </td>
                                                <td>
                                                    {question.journey_types ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {(() => {
                                                                let journeyTypes = [];
                                                                try {
                                                                    if (Array.isArray(question.journey_types)) {
                                                                        journeyTypes = question.journey_types;
                                                                    } else if (typeof question.journey_types === 'string') {
                                                                        try {
                                                                            journeyTypes = JSON.parse(question.journey_types);
                                                                        } catch (parseError) {
                                                                            if (question.journey_types.includes(',')) {
                                                                                journeyTypes = question.journey_types.split(',').map(type => type.trim());
                                                                            } else {
                                                                                journeyTypes = [question.journey_types.trim()];
                                                                            }
                                                                        }
                                                                    }
                                                                } catch (error) {
                                                                    console.warn('Error parsing journey_types for display:', error);
                                                                    journeyTypes = ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'];
                                                                }
                                                                
                                                                return journeyTypes.map((journeyType) => (
                                                                    <span key={journeyType} style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        backgroundColor: '#dbeafe',
                                                                        color: '#1e40af'
                                                                    }}>
                                                                        {journeyType}
                                                                    </span>
                                                                ));
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                            {question.journey_types === undefined || question.journey_types === null ? 
                                                                'Not set' : 'No journey types'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {question.is_required ? (
                                                        <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>Required</span>
                                                    ) : (
                                                        <span style={{ color: '#6b7280', fontSize: '12px' }}>Optional</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {question.help_text ? (
                                                        <div style={{ maxWidth: '200px', fontSize: '12px', color: '#6b7280' }}>
                                                            {question.help_text}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>No help text</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {question.is_active ? (
                                                        <span className="status-badge active">Active</span>
                                                    ) : (
                                                        <span className="status-badge inactive">Inactive</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn btn-icon"
                                                            onClick={() => handleEditAdditionalInfoQuestion(question)}
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-icon btn-danger"
                                                            onClick={() => handleDeleteAdditionalInfoQuestion(question.id)}
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
                        )}
                    </>
                )}
            </div>

            {/* Terms & Conditions Section */}
            <div className="settings-card" style={{ marginBottom: '24px' }}>
                <div 
                    className="card-header"
                    onClick={() => setTermsExpanded(!termsExpanded)}
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '20px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <div>
                        <h2 style={{ margin: 0, color: '#1f2937' }}>Terms & Conditions</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                            Manage terms and conditions for different voucher types.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            className="btn btn-primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowTermsForm(true);
                            }}
                            style={{ margin: 0 }}
                        >
                            <Plus size={20} />
                            Create Terms
                        </button>
                        {termsExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>
                
                {termsExpanded && (
                    <>
                        <div className="terms-stats" style={{ 
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
                                    {termsAndConditions.length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Terms</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
                                    {termsAndConditions.filter(t => t.is_active).length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#3b82f6' }}>
                                    {termsAndConditions.filter(t => {
                                        try {
                                            if (t.voucher_type_ids) {
                                                const voucherTypeIds = JSON.parse(t.voucher_type_ids);
                                                return Array.isArray(voucherTypeIds) && voucherTypeIds.length > 0;
                                            }
                                            return false;
                                        } catch (error) {
                                            return false;
                                        }
                                    }).length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Linked to Voucher Types</div>
                            </div>
                        </div>
                        
                        {termsAndConditions.length === 0 ? (
                            <div className="no-terms-message">
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                                    <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Terms Yet</h3>
                                    <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                        Create your first terms and conditions to display in the balloning-book Terms & Conditions section.
                                    </p>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => setShowTermsForm(true)}
                                    >
                                        <Plus size={20} />
                                        Create First Terms
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="terms-table-container" style={{ 
                                width: '100%', 
                                overflowX: 'auto',
                                minHeight: '400px'
                            }}>
                                <table className="terms-table">
                                    <thead>
                                        <tr>
                                            <th>Title</th>
                                            <th>Content Preview</th>
                                            <th>Voucher Types</th>
                                            <th>Sort Order</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {termsAndConditions.map((terms) => (
                                            <tr key={terms.id}>
                                                <td>
                                                    <div style={{ fontWeight: '500', color: '#1f2937' }}>
                                                        {terms.title}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ 
                                                        maxWidth: '300px', 
                                                        fontSize: '12px', 
                                                        color: '#6b7280',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {terms.content.substring(0, 100)}
                                                        {terms.content.length > 100 && '...'}
                                                    </div>
                                                </td>
                                                <td>
                                                    {terms.voucher_type_ids ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {(() => {
                                                                try {
                                                                    const voucherTypeIds = JSON.parse(terms.voucher_type_ids);
                                                                    if (Array.isArray(voucherTypeIds)) {
                                                                        return voucherTypeIds.map((voucherTypeId) => {
                                                                            const voucherType = voucherTypes.find(vt => vt.id === voucherTypeId);
                                                                            return voucherType ? (
                                                                                <span key={voucherTypeId} style={{
                                                                                    padding: '2px 8px',
                                                                                    borderRadius: '12px',
                                                                                    fontSize: '11px',
                                                                                    backgroundColor: '#dbeafe',
                                                                                    color: '#1e40af'
                                                                                }}>
                                                                                    {voucherType.title}
                                                                                </span>
                                                                            ) : null;
                                                                        });
                                                                    }
                                                                    return <span style={{ color: '#9ca3af', fontSize: '12px' }}>Invalid format</span>;
                                                                } catch (error) {
                                                                    console.error('Error parsing voucher_type_ids:', error);
                                                                    return <span style={{ color: '#ef4444', fontSize: '12px' }}>Parse error</span>;
                                                                }
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>No voucher types</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{ color: '#6b7280', fontSize: '12px' }}>
                                                        {terms.sort_order}
                                                    </span>
                                                </td>
                                                <td>
                                                    {terms.is_active ? (
                                                        <span className="status-badge active">Active</span>
                                                    ) : (
                                                        <span className="status-badge inactive">Inactive</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn btn-icon"
                                                            onClick={() => handleEditTerms(terms)}
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-icon btn-danger"
                                                            onClick={() => handleDeleteTerms(terms.id)}
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
                        )}
                    </>
                )}
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

            {/* Create/Edit Voucher Type Form Modal */}
            {(showVoucherTypesForm || showEditVoucherTypeForm) && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{showEditVoucherTypeForm ? 'Edit Voucher Type' : 'Create New Voucher Type'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowVoucherTypesForm(false);
                                    setShowEditVoucherTypeForm(false);
                                    resetVoucherTypeForm();
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleVoucherTypeSubmit} className="voucher-type-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Title *</label>
                                    <input
                                        type="text"
                                        value={voucherTypeFormData.title}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, title: e.target.value})}
                                        placeholder="e.g., Weekday Morning"
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Description *</label>
                                    <textarea
                                        value={voucherTypeFormData.description}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, description: e.target.value})}
                                        placeholder="Detailed description of the voucher type..."
                                        rows="3"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Max Passengers</label>
                                    <input
                                        type="number"
                                        value={voucherTypeFormData.max_passengers}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, max_passengers: e.target.value})}
                                        placeholder="8"
                                        min="1"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Validity (Months)</label>
                                    <input
                                        type="number"
                                        value={voucherTypeFormData.validity_months}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, validity_months: e.target.value})}
                                        placeholder="18"
                                        min="1"
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Flight Days</label>
                                    <input
                                        type="text"
                                        value={voucherTypeFormData.flight_days}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, flight_days: e.target.value})}
                                        placeholder="e.g., Monday - Friday"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Flight Time</label>
                                    <select
                                        value={voucherTypeFormData.flight_time}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, flight_time: e.target.value})}
                                    >
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                        <option value="AM & PM">AM & PM</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Sort Order</label>
                                    <input
                                        type="number"
                                        value={voucherTypeFormData.sort_order}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, sort_order: e.target.value})}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={voucherTypeFormData.is_active}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, is_active: e.target.value === 'true'})}
                                    >
                                        <option value={true}>Active</option>
                                        <option value={false}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Features (JSON Array)</label>
                                <textarea
                                    value={voucherTypeFormData.features}
                                    onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, features: e.target.value})}
                                    placeholder='["Around 1 Hour of Air Time", "Complimentary Drink", "Inflight Photos and 3D Flight Track"]'
                                    rows="2"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Terms & Conditions</label>
                                <textarea
                                    value={voucherTypeFormData.terms}
                                    onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, terms: e.target.value})}
                                    placeholder="Terms and conditions for this voucher type..."
                                    rows="3"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, image_file: e.target.files[0]})}
                                />
                                {voucherTypeFormData.image_url && !voucherTypeFormData.image_file && (
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                        Current image: {voucherTypeFormData.image_url}
                                    </div>
                                )}
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowVoucherTypesForm(false);
                                    setShowEditVoucherTypeForm(false);
                                    resetVoucherTypeForm();
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {showEditVoucherTypeForm ? 'Update Voucher Type' : 'Create Voucher Type'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Additional Information Question Form Modal */}
            {(showAdditionalInfoForm || showEditAdditionalInfoForm) && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{showEditAdditionalInfoForm ? 'Edit Question' : 'Create New Question'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowAdditionalInfoForm(false);
                                    setShowEditAdditionalInfoForm(false);
                                    resetAdditionalInfoForm();
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleAdditionalInfoSubmit} className="additional-info-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Question Text *</label>
                                    <input
                                        type="text"
                                        value={additionalInfoFormData.question_text}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, question_text: e.target.value})}
                                        placeholder="e.g., How did you hear about us?"
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Question Type *</label>
                                    <select
                                        value={additionalInfoFormData.question_type}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, question_type: e.target.value})}
                                        required
                                    >
                                        <option value="dropdown">Dropdown</option>
                                        <option value="text">Text Input</option>
                                        <option value="radio">Radio Buttons</option>
                                        <option value="checkbox">Checkbox</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        value={additionalInfoFormData.category}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, category: e.target.value})}
                                    >
                                        <option value="General">General</option>
                                        <option value="Communication">Communication</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Experience">Experience</option>
                                        <option value="Special Requirements">Special Requirements</option>
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Sort Order</label>
                                    <input
                                        type="number"
                                        value={additionalInfoFormData.sort_order}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, sort_order: e.target.value})}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Required Field</label>
                                    <select
                                        value={additionalInfoFormData.is_required}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, is_required: e.target.value === 'true'})}
                                    >
                                        <option value={false}>Optional</option>
                                        <option value={true}>Required</option>
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={additionalInfoFormData.is_active}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, is_active: e.target.value === 'true'})}
                                    >
                                        <option value={true}>Active</option>
                                        <option value={false}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Journey Types *</label>
                                <div style={{ 
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '8px', 
                                    padding: '16px',
                                    background: '#f9fafb'
                                }}>
                                    <div style={{ marginBottom: '12px', fontSize: '14px', color: '#374151' }}>
                                        Select which journey types this question applies to:
                                    </div>
                                    {journeyTypes.map((journeyType) => (
                                        <label key={journeyType} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '8px',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={additionalInfoFormData.journey_types.includes(journeyType)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setAdditionalInfoFormData({
                                                            ...additionalInfoFormData,
                                                            journey_types: [...additionalInfoFormData.journey_types, journeyType]
                                                        });
                                                    } else {
                                                        setAdditionalInfoFormData({
                                                            ...additionalInfoFormData,
                                                            journey_types: additionalInfoFormData.journey_types.filter(type => type !== journeyType)
                                                        });
                                                    }
                                                }}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <span style={{ fontSize: '14px', color: '#374151' }}>{journeyType}</span>
                                        </label>
                                    ))}
                                    {additionalInfoFormData.journey_types.length === 0 && (
                                        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>
                                            Please select at least one journey type.
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {(additionalInfoFormData.question_type === 'dropdown' || additionalInfoFormData.question_type === 'radio' || additionalInfoFormData.question_type === 'checkbox') && (
                                <div className="form-group">
                                    <label>Options (JSON array)</label>
                                    <textarea
                                        value={additionalInfoFormData.options}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, options: e.target.value})}
                                        placeholder='["Option 1", "Option 2", "Option 3"]'
                                        rows="3"
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                        Enter options as a JSON array. Example: ["Yes", "No", "Maybe"]
                                    </div>
                                </div>
                            )}
                            
                            {additionalInfoFormData.question_type === 'text' && (
                                <div className="form-group">
                                    <label>Placeholder Text</label>
                                    <input
                                        type="text"
                                        value={additionalInfoFormData.placeholder_text}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, placeholder_text: e.target.value})}
                                        placeholder="e.g., Please enter your special requirements..."
                                    />
                                </div>
                            )}
                            
                            <div className="form-group">
                                <label>Help Text</label>
                                <textarea
                                    value={additionalInfoFormData.help_text}
                                    onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, help_text: e.target.value})}
                                    placeholder="Additional help text to display below the question..."
                                    rows="2"
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowAdditionalInfoForm(false);
                                    setShowEditAdditionalInfoForm(false);
                                    resetAdditionalInfoForm();
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {showEditAdditionalInfoForm ? 'Update Question' : 'Create Question'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Add to Booking Item Form Modal */}
            {(showAddToBookingForm || showEditAddToBookingForm) && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{showEditAddToBookingForm ? 'Edit Add to Booking Item' : 'Create New Add to Booking Item'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowAddToBookingForm(false);
                                    setShowEditAddToBookingForm(false);
                                    resetAddToBookingForm();
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddToBookingSubmit} className="add-to-booking-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Title *</label>
                                    <input
                                        type="text"
                                        value={addToBookingFormData.title}
                                        onChange={(e) => setAddToBookingFormData({...addToBookingFormData, title: e.target.value})}
                                        placeholder="e.g., FAB Cap, FAB Mug"
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Price *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={addToBookingFormData.price}
                                        onChange={(e) => setAddToBookingFormData({...addToBookingFormData, price: e.target.value})}
                                        placeholder="e.g., 20.00"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Price Unit</label>
                                    <select
                                        value={addToBookingFormData.price_unit}
                                        onChange={(e) => setAddToBookingFormData({...addToBookingFormData, price_unit: e.target.value})}
                                    >
                                        <option value="fixed">Fixed Price</option>
                                        <option value="pp">Per Person</option>
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        value={addToBookingFormData.category}
                                        onChange={(e) => setAddToBookingFormData({...addToBookingFormData, category: e.target.value})}
                                    >
                                        <option value="Merchandise">Merchandise</option>
                                        <option value="Service">Service</option>
                                        <option value="Food">Food & Beverage</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Stock Quantity</label>
                                    <input
                                        type="number"
                                        value={addToBookingFormData.stock_quantity}
                                        onChange={(e) => setAddToBookingFormData({...addToBookingFormData, stock_quantity: e.target.value})}
                                        placeholder="0 = unlimited"
                                        min="0"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Weight (grams)</label>
                                    <input
                                        type="number"
                                        value={addToBookingFormData.weight_grams}
                                        onChange={(e) => setAddToBookingFormData({...addToBookingFormData, weight_grams: e.target.value})}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Sort Order</label>
                                    <input
                                        type="number"
                                        value={addToBookingFormData.sort_order}
                                        onChange={(e) => setAddToBookingFormData({...addToBookingFormData, sort_order: e.target.value})}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Physical Item</label>
                                    <select
                                        value={addToBookingFormData.is_physical_item}
                                        onChange={(e) => setAddToBookingFormData({...addToBookingFormData, is_physical_item: e.target.value === 'true'})}
                                    >
                                        <option value={true}>Yes (needs shipping)</option>
                                        <option value={false}>No (digital/service)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    value={addToBookingFormData.description}
                                    onChange={(e) => setAddToBookingFormData({...addToBookingFormData, description: e.target.value})}
                                    placeholder="Detailed description of the item..."
                                    rows="4"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setAddToBookingFormData({...addToBookingFormData, image_file: e.target.files[0]})}
                                />
                                {addToBookingFormData.image_url && !addToBookingFormData.image_file && (
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                                        Current image: {addToBookingFormData.image_url}
                                    </div>
                                )}
                            </div>
                            
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={addToBookingFormData.is_active}
                                    onChange={(e) => setAddToBookingFormData({...addToBookingFormData, is_active: e.target.value === 'true'})}
                                >
                                    <option value={true}>Active</option>
                                    <option value={false}>Inactive</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label>Journey Types *</label>
                                <div style={{ 
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '8px', 
                                    padding: '16px',
                                    background: '#f9fafb'
                                }}>
                                    <div style={{ marginBottom: '12px', fontSize: '14px', color: '#374151' }}>
                                        Select which journey types this item applies to:
                                    </div>
                                    {journeyTypes.map((journeyType) => (
                                        <label key={journeyType} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '8px',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={addToBookingFormData.journey_types.includes(journeyType)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setAddToBookingFormData({
                                                            ...addToBookingFormData,
                                                            journey_types: [...addToBookingFormData.journey_types, journeyType]
                                                        });
                                                    } else {
                                                        setAddToBookingFormData({
                                                            ...addToBookingFormData,
                                                            journey_types: addToBookingFormData.journey_types.filter(type => type !== journeyType)
                                                        });
                                                    }
                                                }}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <span style={{ fontSize: '14px', color: '#374151' }}>{journeyType}</span>
                                        </label>
                                    ))}
                                    {addToBookingFormData.journey_types.length === 0 && (
                                        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>
                                            Please select at least one journey type.
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowAddToBookingForm(false);
                                    setShowEditAddToBookingForm(false);
                                    resetAddToBookingForm();
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {showEditAddToBookingForm ? 'Update Item' : 'Create Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Terms & Conditions Form Modal */}
            {(showTermsForm || showEditTermsForm) && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{showEditTermsForm ? 'Edit Terms & Conditions' : 'Create New Terms & Conditions'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowTermsForm(false);
                                    setShowEditTermsForm(false);
                                    resetTermsForm();
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleTermsSubmit} className="terms-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Title *</label>
                                    <input
                                        type="text"
                                        value={termsFormData.title}
                                        onChange={(e) => setTermsFormData({...termsFormData, title: e.target.value})}
                                        placeholder="e.g., Weekday Morning Terms, Any Day Flight Terms"
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Sort Order</label>
                                    <input
                                        type="number"
                                        value={termsFormData.sort_order}
                                        onChange={(e) => setTermsFormData({...termsFormData, sort_order: parseInt(e.target.value)})}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Content *</label>
                                <textarea
                                    value={termsFormData.content}
                                    onChange={(e) => setTermsFormData({...termsFormData, content: e.target.value})}
                                    placeholder="Enter the terms and conditions text content..."
                                    rows="8"
                                    required
                                    style={{ fontFamily: 'inherit', lineHeight: '1.5' }}
                                />
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                    Use \n for line breaks. This content will be displayed in the balloning-book Terms & Conditions section.
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Voucher Types *</label>
                                <div style={{ 
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '8px', 
                                    padding: '16px',
                                    background: '#f9fafb'
                                }}>
                                    <div style={{ marginBottom: '12px', fontSize: '14px', color: '#374151' }}>
                                        Select which voucher types these terms apply to:
                                    </div>
                                    {voucherTypes.map((voucherType) => (
                                        <label key={voucherType.id} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '8px',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={Array.isArray(termsFormData.voucher_type_ids) && termsFormData.voucher_type_ids.includes(voucherType.id)}
                                                onChange={() => {
                                                    console.log('Checkbox clicked for voucher type:', voucherType.id);
                                                    console.log('Current checked state:', Array.isArray(termsFormData.voucher_type_ids) && termsFormData.voucher_type_ids.includes(voucherType.id));
                                                    handleVoucherTypeToggle(voucherType.id);
                                                }}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <span style={{ fontSize: '14px' }}>
                                                {voucherType.title} - {voucherType.description}
                                            </span>
                                        </label>
                                    ))}
                                    {voucherTypes.length === 0 && (
                                        <div style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>
                                            No voucher types available. Please create voucher types first.
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={termsFormData.is_active}
                                    onChange={(e) => setTermsFormData({...termsFormData, is_active: e.target.value === 'true'})}
                                >
                                    <option value={true}>Active</option>
                                    <option value={false}>Inactive</option>
                                </select>
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowTermsForm(false);
                                    setShowEditTermsForm(false);
                                    resetTermsForm();
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {showEditTermsForm ? 'Update Terms' : 'Create Terms'}
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
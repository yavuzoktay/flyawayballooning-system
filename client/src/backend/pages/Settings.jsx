import React, { useState, useEffect, useRef, useTransition } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
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
import { 
    getDefaultTemplateMessageHtml,
    extractMessageFromTemplateBody
} from '../utils/emailTemplateUtils';

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
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
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
        image_text_tag: '',
        max_passengers: 8,
        validity_months: 18,
        flight_days: 'Monday - Friday',
        flight_time: 'AM',
        features: '[]',
        terms: '',
        sort_order: 0,
        is_active: true
    });
    
    // Private Charter Voucher Types state
    const [privateCharterVoucherTypes, setPrivateCharterVoucherTypes] = useState([]);
    const [showPrivateCharterVoucherTypesForm, setShowPrivateCharterVoucherTypesForm] = useState(false);
    const [showEditPrivateCharterVoucherTypeForm, setShowEditPrivateCharterVoucherTypeForm] = useState(false);
    const [selectedPrivateCharterVoucherType, setSelectedPrivateCharterVoucherType] = useState(null);
    const [privateCharterVoucherTypeFormData, setPrivateCharterVoucherTypeFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        image_file: null,
        image_text_tag: '',
        max_passengers: 8,
        validity_months: 18,
        flight_days: 'Any Day',
        flight_time: 'AM & PM',
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
        is_physical_item: true,
        journey_types: ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'],
        locations: ['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'],
        experience_types: ['Shared Flight', 'Private Charter'],
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
        is_required: true,
        options: '[]',
        placeholder_text: '',
        help_text: '',
        category: 'General',
        journey_types: ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'],
        locations: ['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'],
        experience_types: ['Shared Flight', 'Private Charter'],
        sort_order: 0,
        is_active: true
    });

    // Crew Management state
    const [crewMembers, setCrewMembers] = useState([]);
    const [showCrewForm, setShowCrewForm] = useState(false);
    const [showEditCrewForm, setShowEditCrewForm] = useState(false);
    const [selectedCrewMember, setSelectedCrewMember] = useState(null);
    const [crewFormData, setCrewFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        is_active: true
    });
    
    // Pilot Management state
    const [pilots, setPilots] = useState([]);
    const [showPilotForm, setShowPilotForm] = useState(false);
    const [showEditPilotForm, setShowEditPilotForm] = useState(false);
    const [selectedPilot, setSelectedPilot] = useState(null);
    const [pilotFormData, setPilotFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
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
        experience_ids: [],
        voucher_type_ids: [],
        private_voucher_type_ids: [],
        is_active: true,
        sort_order: 0,
        showVoucherTypes: false,
        showPrivateVoucherTypes: false
    });

    // Passenger Terms state (for Passenger Information)
    const [passengerTerms, setPassengerTerms] = useState([]);
    const [showPassengerTermsForm, setShowPassengerTermsForm] = useState(false);
    const [showEditPassengerTermsForm, setShowEditPassengerTermsForm] = useState(false);
    const [selectedPassengerTerms, setSelectedPassengerTerms] = useState(null);
    const [passengerTermsFormData, setPassengerTermsFormData] = useState({
        title: '',
        content: '',
        journey_types: [],
        is_active: true,
        sort_order: 0
    });
    
    // Resources & Resource Groups state
    const [resources, setResources] = useState([]);
    const [resourceGroups, setResourceGroups] = useState([]);
    const [resourcesExpanded, setResourcesExpanded] = useState(false);
    const [resourceGroupsExpanded, setResourceGroupsExpanded] = useState(false);
    const [showResourceForm, setShowResourceForm] = useState(false);
    const [showResourceGroupForm, setShowResourceGroupForm] = useState(false);
    const [resourceGroupFormData, setResourceGroupFormData] = useState({ name: '' });
    const [showEditResourceGroupForm, setShowEditResourceGroupForm] = useState(false);
    const [selectedResourceGroup, setSelectedResourceGroup] = useState(null);
    const [resourceGroupEditFormData, setResourceGroupEditFormData] = useState({
        name: '',
        resource_ids: []
    });
    const [resourceFormData, setResourceFormData] = useState({
        name: '',
        resource_group_id: '',
        experience_types: [],
        max_uses: 1,
        sort_order: 1,
        color: '#0ea5e9',
        icon: 'Generic',
        quantity: 1
    });
    const [showEditResourceForm, setShowEditResourceForm] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);
    
    // Email Templates state
    const [emailTemplates, setEmailTemplates] = useState([]);
    const [emailTemplatesExpanded, setEmailTemplatesExpanded] = useState(false);
    const [showEmailTemplateForm, setShowEmailTemplateForm] = useState(false);
    const [showEditEmailTemplateForm, setShowEditEmailTemplateForm] = useState(false);
    const [selectedEmailTemplate, setSelectedEmailTemplate] = useState(null);
    const getDefaultTemplateBody = (templateName) => extractMessageFromTemplateBody(getDefaultTemplateMessageHtml(templateName)) || '';

    // SMS Templates state
    const [smsTemplates, setSmsTemplates] = useState([]);
    const [smsTemplatesExpanded, setSmsTemplatesExpanded] = useState(false);
    const [showSmsTemplateForm, setShowSmsTemplateForm] = useState(false);
    const [showEditSmsTemplateForm, setShowEditSmsTemplateForm] = useState(false);
    const [selectedSmsTemplate, setSelectedSmsTemplate] = useState(null);
    const [smsTemplateFormData, setSmsTemplateFormData] = useState({
        name: '',
        message: '',
        category: 'User Defined Message'
    });

    // Customer Portal Content state
    const [customerPortalContents, setCustomerPortalContents] = useState([]);
    const [customerPortalExpanded, setCustomerPortalExpanded] = useState(false);
    const [showCustomerPortalForm, setShowCustomerPortalForm] = useState(false);
    const [showEditCustomerPortalForm, setShowEditCustomerPortalForm] = useState(false);
    const [selectedCustomerPortalContent, setSelectedCustomerPortalContent] = useState(null);
    const [customerPortalFormData, setCustomerPortalFormData] = useState({
        header: '',
        body: '',
        sort_order: 0,
        is_active: true
    });

    const RichTextEditor = ({ value, onChange, placeholder }) => {
        const editorRef = useRef(null);
        const inputDebounceRef = useRef(null);
        const [, startTransition] = useTransition();
        const [showButtonModal, setShowButtonModal] = useState(false);
        const [buttonText, setButtonText] = useState('');
        const [buttonUrl, setButtonUrl] = useState('');
        const [showCustomerPortalLinkModal, setShowCustomerPortalLinkModal] = useState(false);
        const [customerPortalLinkText, setCustomerPortalLinkText] = useState('');

        useEffect(() => {
            if (!editorRef.current) return;
            if (document.activeElement === editorRef.current) return;
            const currentHtml = editorRef.current.innerHTML;
            const nextHtml = value || '';
            if (currentHtml !== nextHtml) {
                editorRef.current.innerHTML = nextHtml;
            }
        }, [value]);

        useEffect(() => () => {
            if (inputDebounceRef.current) {
                clearTimeout(inputDebounceRef.current);
            }
        }, []);

        const exec = (command, arg = null) => {
            if (!editorRef.current) return;
            editorRef.current.focus();
            document.execCommand(command, false, arg);
            const html = editorRef.current.innerHTML;
            startTransition(() => {
                onChange(html);
            });
        };

        const scheduleChange = () => {
            if (!editorRef.current) return;
            const html = editorRef.current.innerHTML;
            if (inputDebounceRef.current) {
                clearTimeout(inputDebounceRef.current);
            }
            inputDebounceRef.current = setTimeout(() => {
                inputDebounceRef.current = null;
                startTransition(() => {
                    onChange(html);
                });
            }, 200);
        };

        const handleInput = () => {
            scheduleChange();
        };

        const handleBlur = () => {
            if (!editorRef.current) return;
            if (inputDebounceRef.current) {
                clearTimeout(inputDebounceRef.current);
                inputDebounceRef.current = null;
            }
            const html = editorRef.current.innerHTML;
            startTransition(() => {
                onChange(html);
            });
        };

        const handleLink = () => {
            const url = prompt('Enter URL');
            if (url) {
                exec('createLink', url);
            }
        };

        const handleClear = () => {
            exec('removeFormat');
        };

        const handleAddButton = () => {
            setButtonText('');
            setButtonUrl('');
            setShowButtonModal(true);
        };

        const handleInsertButton = () => {
            if (!buttonText || !buttonUrl) {
                alert('Please enter both button text and URL');
                return;
            }
            
            if (!editorRef.current) return;
            editorRef.current.focus();
            
            // Create button element directly (not using innerHTML to preserve existing buttons)
            const buttonElement = document.createElement('a');
            buttonElement.href = buttonUrl;
            buttonElement.target = '_blank';
            buttonElement.rel = 'noopener noreferrer';
            buttonElement.style.display = 'inline-block';
            buttonElement.style.padding = '10px 20px';
            buttonElement.style.backgroundColor = '#3274b4';
            buttonElement.style.color = 'white';
            buttonElement.style.textDecoration = 'none';
            buttonElement.style.borderRadius = '4px';
            buttonElement.style.fontWeight = '500';
            buttonElement.style.margin = '5px 0';
            buttonElement.textContent = buttonText;
            
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                
                // Check if we're inside an existing button/link - if so, insert after it
                let container = range.commonAncestorContainer;
                if (container.nodeType === 3) { // TEXT_NODE
                    container = container.parentElement;
                }
                
                // If we're inside a link/button, move selection after it
                if (container && (container.tagName === 'A' || container.closest('a'))) {
                    const linkElement = container.tagName === 'A' ? container : container.closest('a');
                    if (linkElement && linkElement.parentNode) {
                        // Insert after the link element
                        const spaceNode = document.createTextNode(' ');
                        linkElement.parentNode.insertBefore(spaceNode, linkElement.nextSibling);
                        linkElement.parentNode.insertBefore(buttonElement, linkElement.nextSibling);
                        range.setStartAfter(buttonElement);
                        range.collapse(true);
                    }
                } else {
                    // Normal insertion - insert button and space
                    range.deleteContents();
                    range.insertNode(buttonElement);
                    // Add space after button for better formatting
                    const spaceNode = document.createTextNode(' ');
                    range.setStartAfter(buttonElement);
                    range.insertNode(spaceNode);
                    range.setStartAfter(spaceNode);
                    range.collapse(true);
                }
                
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // If no selection, append at the end
                // Add space and then button
                const spaceNode = document.createTextNode(' ');
                editorRef.current.appendChild(spaceNode);
                editorRef.current.appendChild(buttonElement);
            }
            
            scheduleChange();
            setShowButtonModal(false);
            setButtonText('');
            setButtonUrl('');
        };

        const insertPrompt = (promptText) => {
            if (!editorRef.current) return;
            editorRef.current.focus();
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                const textNode = document.createTextNode(promptText);
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // If no selection, append at the end
                const textNode = document.createTextNode(promptText);
                editorRef.current.appendChild(textNode);
            }
            scheduleChange();
        };

        const handleInsertCustomerPortalLink = () => {
            if (!customerPortalLinkText || !customerPortalLinkText.trim()) {
                alert('Please enter link text');
                return;
            }
            
            if (!editorRef.current) return;
            editorRef.current.focus();
            
            // Create prompt text with format: [Customer Portal Link:Link Text]
            const promptText = `[Customer Portal Link:${customerPortalLinkText.trim()}]`;
            
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                const textNode = document.createTextNode(promptText);
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // If no selection, append at the end
                const textNode = document.createTextNode(promptText);
                editorRef.current.appendChild(textNode);
            }
            
            scheduleChange();
            setShowCustomerPortalLinkModal(false);
            setCustomerPortalLinkText('');
        };

        return (
            <div>
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '12px',
                    flexWrap: 'wrap'
                }}>
                    <button type="button" className="btn btn-secondary" onClick={() => exec('bold')} style={{ padding: '6px 12px' }}>B</button>
                    <button type="button" className="btn btn-secondary" onClick={() => exec('italic')} style={{ padding: '6px 12px', fontStyle: 'italic' }}>I</button>
                    <button type="button" className="btn btn-secondary" onClick={() => exec('underline')} style={{ padding: '6px 12px', textDecoration: 'underline' }}>U</button>
                    <button type="button" className="btn btn-secondary" onClick={() => exec('insertUnorderedList')} style={{ padding: '6px 12px' }}>• List</button>
                    <button type="button" className="btn btn-secondary" onClick={handleLink} style={{ padding: '6px 12px' }}>Link</button>
                    <button type="button" className="btn btn-secondary" onClick={handleClear} style={{ padding: '6px 12px' }}>Clear</button>
                    <button type="button" className="btn btn-secondary" onClick={handleAddButton} style={{ padding: '6px 12px', backgroundColor: '#3274b4', color: 'white' }}>Button</button>
                    <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 4px' }}></div>
                    <button type="button" className="btn btn-secondary" onClick={() => insertPrompt('[First Name]')} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#6366f1' }}>[First Name]</button>
                    <button type="button" className="btn btn-secondary" onClick={() => insertPrompt('[Last Name]')} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#6366f1' }}>[Last Name]</button>
                    <button type="button" className="btn btn-secondary" onClick={() => insertPrompt('[Full Name]')} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#6366f1' }}>[Full Name]</button>
                    <button type="button" className="btn btn-secondary" onClick={() => insertPrompt('[Email]')} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#6366f1' }}>[Email]</button>
                    <button type="button" className="btn btn-secondary" onClick={() => insertPrompt('[Phone]')} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#6366f1' }}>[Phone]</button>
                    <button type="button" className="btn btn-secondary" onClick={() => insertPrompt('[Booking ID]')} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#6366f1' }}>[Booking ID]</button>
                    <button type="button" className="btn btn-secondary" onClick={() => insertPrompt('[First Name of Recipient]')} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#6366f1' }}>[First Name of Recipient]</button>
                    <button type="button" className="btn btn-secondary" onClick={() => insertPrompt('[Experience Data]')} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#6366f1' }}>[Experience Data]</button>
                    <button type="button" className="btn btn-secondary" onClick={() => insertPrompt('[Receipt]')} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f3f4f6', color: '#6366f1' }}>[Receipt]</button>
                    <button type="button" className="btn btn-secondary" onClick={() => {
                        setCustomerPortalLinkText('');
                        setShowCustomerPortalLinkModal(true);
                    }} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#dbeafe', color: '#1d4ed8' }}>[Customer Portal Link]</button>
                </div>
                {/* Button Modal */}
                {showButtonModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000
                    }} onClick={() => setShowButtonModal(false)}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '24px',
                            width: '90%',
                            maxWidth: '500px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }} onClick={(e) => e.stopPropagation()}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: 600 }}>
                                Add Button
                            </h3>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
                                    Button Text <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={buttonText}
                                    onChange={(e) => setButtonText(e.target.value)}
                                    placeholder="Enter button text"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
                                    Button URL <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={buttonUrl}
                                    onChange={(e) => setButtonUrl(e.target.value)}
                                    placeholder="Enter URL (e.g., https://example.com)"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowButtonModal(false);
                                        setButtonText('');
                                        setButtonUrl('');
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '4px',
                                        backgroundColor: 'white',
                                        color: '#374151',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleInsertButton}
                                    style={{
                                        padding: '8px 16px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        backgroundColor: '#3274b4',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Add Button
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Customer Portal Link Modal */}
                {showCustomerPortalLinkModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000
                    }} onClick={() => setShowCustomerPortalLinkModal(false)}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '24px',
                            width: '90%',
                            maxWidth: '500px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }} onClick={(e) => e.stopPropagation()}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: 600 }}>
                                Add Customer Portal Link
                            </h3>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>
                                    Link Text <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={customerPortalLinkText}
                                    onChange={(e) => setCustomerPortalLinkText(e.target.value)}
                                    placeholder="Enter link text (e.g., View Your Booking)"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                                <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                                    The link URL will be automatically generated from the booking data.
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCustomerPortalLinkModal(false);
                                        setCustomerPortalLinkText('');
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '4px',
                                        backgroundColor: 'white',
                                        color: '#374151',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleInsertCustomerPortalLink}
                                    style={{
                                        padding: '8px 16px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        backgroundColor: '#1d4ed8',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Add Link
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    onBlur={handleBlur}
                    style={{
                        width: '100%',
                        minHeight: '200px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: '#fff',
                        fontSize: '14px',
                        lineHeight: '1.7',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        color: '#374151',
                        outline: 'none'
                    }}
                    data-placeholder={placeholder}
                />
            </div>
        );
    };

    const [emailTemplateFormData, setEmailTemplateFormData] = useState({
        name: '',
        subject: '',
        body: getDefaultTemplateBody('Booking Confirmation'),
        category: 'User Defined Message'
    });
    
    // Collapsible sections state
    const [voucherCodesExpanded, setVoucherCodesExpanded] = useState(false);
    const [experiencesExpanded, setExperiencesExpanded] = useState(false);
    const [voucherTypesExpanded, setVoucherTypesExpanded] = useState(false);
    const [privateCharterVoucherTypesExpanded, setPrivateCharterVoucherTypesExpanded] = useState(false);
    const [addToBookingExpanded, setAddToBookingExpanded] = useState(false);
    const [crewExpanded, setCrewExpanded] = useState(false);
    const [additionalInfoExpanded, setAdditionalInfoExpanded] = useState(false);
    const [termsExpanded, setTermsExpanded] = useState(false);
    const [passengerTermsExpanded, setPassengerTermsExpanded] = useState(false);
    
    // Helper: safely parse journey_types from DB (array, JSON string, CSV, or single string)
    const safeParseJourneyTypes = (val) => {
        try {
            if (!val && val !== '') return [];
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
                const s = val.trim();
                if (s.startsWith('[')) {
                    return JSON.parse(s);
                }
                if (s.includes(',')) {
                    return s.split(',').map(t => t.trim()).filter(Boolean);
                }
                return s.length ? [s] : [];
            }
            return [];
        } catch (e) {
            console.warn('safeParseJourneyTypes error:', e, val);
            return [];
        }
    };
    
    const [formData, setFormData] = useState({
        code: '',
        title: '',
        valid_from: dayjs().format('YYYY-MM-DD'),
        valid_until: dayjs().format('YYYY-MM-DD'),
        max_uses: '',
        applicable_locations: '',
        applicable_experiences: '',
        applicable_voucher_types: '',
        is_active: true
    });

    const locations = ['Somerset', 'United Kingdom'];
    const activityLocations = ['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'];
    const experienceTypes = ['Shared Flight', 'Private Charter'];
    const voucherTypeOptions = ['Weekday Morning', 'Flexible Weekday', 'Any Day Flight'];
    const journeyTypes = ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'];

    useEffect(() => {
        fetchVoucherCodes();
        fetchExperiences();
        fetchVoucherTypes();
        fetchPrivateCharterVoucherTypes();
        fetchAddToBookingItems();
        fetchAdditionalInfoQuestions();
        fetchTermsAndConditions();
        fetchCrewMembers();
        fetchSmsTemplates();
        fetchPilots();
        fetchPassengerTerms();
        fetchResources();
        fetchResourceGroups();
        fetchEmailTemplates();
        fetchSmsTemplates();
        fetchCustomerPortalContents();
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

    const fetchPrivateCharterVoucherTypes = async () => {
        try {
            console.log('Fetching private charter voucher types...');
            // Get all voucher types (active and inactive) for admin view
            const response = await axios.get('/api/private-charter-voucher-types?active=false');
            if (response.data.success) {
                console.log('Private charter voucher types fetched:', response.data.data);
                console.log('Voucher types with is_active values:', response.data.data.map(vt => ({
                    id: vt.id,
                    title: vt.title,
                    is_active: vt.is_active,
                    is_active_type: typeof vt.is_active
                })));
                setPrivateCharterVoucherTypes(response.data.data);
            } else {
                console.error('Failed to fetch private charter voucher types:', response.data);
            }
        } catch (error) {
            console.error('Error fetching private charter voucher types:', error);
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

    const fetchPassengerTerms = async () => {
        try {
            const response = await axios.get('/api/passenger-terms');
            if (response.data.success) {
                setPassengerTerms(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching passenger terms:', error);
        }
    };

    const fetchCrewMembers = async () => {
        try {
            const response = await axios.get('/api/crew');
            if (response.data.success) {
                setCrewMembers(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching crew members:', error);
        }
    };

    const fetchPilots = async () => {
        try {
            const response = await axios.get('/api/pilots');
            if (response.data.success) {
                setPilots(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching pilots:', error);
        }
    };

    const fetchResources = async () => {
        try {
            const response = await axios.get('/api/resources');
            if (response.data?.success) {
                setResources(response.data.data);
                return;
            }
        } catch (error) {
            console.warn('Resources API not available, using demo data');
        }
        // Fallback demo data (for UI only)
        setResources([
            { id: 1, name: 'Balloon 210', group: 'Balloon 210', max_uses: 8, sort_order: 1, color: '#0ea5e9', experience_types: ['Shared Flight'] },
            { id: 2, name: 'Hot Air Balloon 105', group: 'Balloon 105', max_uses: 4, sort_order: 1, color: '#f97316', experience_types: ['Private Charter'] }
        ]);
    };

    const fetchResourceGroups = async () => {
        try {
            const response = await axios.get('/api/resource-groups');
            if (response.data?.success) {
                setResourceGroups(response.data.data);
                return;
            }
        } catch (error) {
            console.warn('Resource Groups API not available, using demo data');
        }
        // Fallback demo data (for UI only)
        setResourceGroups([
            { id: 1, name: 'Balloon 210', used_by: 'Somerset Private +8 more', sort_order: 1, color: '#0ea5e9' },
            { id: 2, name: 'Balloon 105', used_by: 'Somerset Private +5 more', sort_order: 1, color: '#f97316' }
        ]);
    };

    const fetchEmailTemplates = async () => {
        try {
            const response = await axios.get('/api/email-templates');
            if (response.data?.success) {
                setEmailTemplates(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching email templates:', error);
            setEmailTemplates([]);
        }
    };

    const fetchSmsTemplates = async () => {
        try {
            const response = await axios.get('/api/sms-templates');
            if (response.data?.success) {
                setSmsTemplates(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching SMS templates:', error);
            setSmsTemplates([]);
        }
    };

    const fetchCustomerPortalContents = async () => {
        try {
            const response = await axios.get('/api/customer-portal-contents');
            if (response.data?.success) {
                setCustomerPortalContents(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching customer portal contents:', error);
            setCustomerPortalContents([]);
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
            if (voucherTypeFormData.image_text_tag) {
                formData.append('image_text_tag', voucherTypeFormData.image_text_tag);
            }
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
            image_text_tag: voucherType.image_text_tag || '',
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

    // Private Charter Voucher Types form handling
    const handlePrivateCharterVoucherTypeSubmit = async (e) => {
        e.preventDefault();
        
        // Form validation
        if (!privateCharterVoucherTypeFormData.title || !privateCharterVoucherTypeFormData.description) {
            alert('Please fill in all required fields: Title and Description');
            return;
        }
        
        try {
            const formData = new FormData();
            
            // Debug logging for form data
            console.log('Private Charter Voucher Type form data before sending:', privateCharterVoucherTypeFormData);
            
            Object.keys(privateCharterVoucherTypeFormData).forEach(key => {
                if (key === 'image_file' && privateCharterVoucherTypeFormData[key]) {
                    formData.append('private_charter_voucher_type_image', privateCharterVoucherTypeFormData[key]);
                } else if (key !== 'image_file') {
                    let value = privateCharterVoucherTypeFormData[key];
                    // Special handling for boolean values to ensure they are sent as proper strings
                    if (key === 'is_active') {
                        value = value === true ? 'true' : 'false';
                        console.log(`Special handling for is_active - original:`, privateCharterVoucherTypeFormData[key], 'converted to:', value);
                    }
                    if (key === 'image_text_tag' && !value) {
                        // skip empty values to avoid overriding existing data with blank
                    } else {
                        formData.append(key, value);
                    }
                    console.log(`FormData appended - ${key}:`, value, 'Type:', typeof value);
                }
            });
            
            // Debug logging for FormData contents
            for (let [key, value] of formData.entries()) {
                console.log(`FormData entry - ${key}:`, value, 'Type:', typeof value);
            }
            
            let response;
            if (showEditPrivateCharterVoucherTypeForm) {
                console.log('Updating Private Charter Voucher Type with ID:', selectedPrivateCharterVoucherType.id);
                response = await axios.put(`/api/private-charter-voucher-types/${selectedPrivateCharterVoucherType.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                console.log('Creating new Private Charter Voucher Type');
                response = await axios.post('/api/private-charter-voucher-types', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            
            console.log('Private Charter Voucher Type response:', response.data);
            
            // Add delay to ensure database transaction is committed before fetching
            console.log('Waiting 2 seconds for database transaction to commit...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Refresh the list to show the new/updated voucher type
            await fetchPrivateCharterVoucherTypes();
            
            resetPrivateCharterVoucherTypeForm();
            setShowPrivateCharterVoucherTypesForm(false);
            setShowEditPrivateCharterVoucherTypeForm(false);
        } catch (error) {
            console.error('Error saving private charter voucher type:', error);
            alert(error.response?.data?.message || 'Error saving private charter voucher type');
        }
    };

    const handleEditPrivateCharterVoucherType = (privateCharterVoucherType) => {
        console.log('Editing Private Charter Voucher Type:', privateCharterVoucherType);
        console.log('Original is_active value:', privateCharterVoucherType.is_active, 'Type:', typeof privateCharterVoucherType.is_active);
        
        setSelectedPrivateCharterVoucherType(privateCharterVoucherType);
        // Ensure is_active is properly converted to boolean
        const isActiveValue = privateCharterVoucherType.is_active === 1 || privateCharterVoucherType.is_active === true;
        
        setPrivateCharterVoucherTypeFormData({
            title: privateCharterVoucherType.title,
            description: privateCharterVoucherType.description,
            image_url: privateCharterVoucherType.image_url || '',
            image_file: null,
            image_text_tag: privateCharterVoucherType.image_text_tag || '',
            max_passengers: privateCharterVoucherType.max_passengers || 8,
            price_per_person: privateCharterVoucherType.price_per_person || 300,
            price_unit: privateCharterVoucherType.price_unit || 'pp',
            validity_months: privateCharterVoucherType.validity_months || 18,
            flight_days: privateCharterVoucherType.flight_days || 'Any Day',
            flight_time: privateCharterVoucherType.flight_time || 'AM & PM',
            features: privateCharterVoucherType.features || '[]',
            terms: privateCharterVoucherType.terms || '',
            sort_order: privateCharterVoucherType.sort_order || 0,
            is_active: isActiveValue
        });
        
        console.log('Form data set with converted is_active:', isActiveValue, 'Original value:', privateCharterVoucherType.is_active);
        
        console.log('Form data set with is_active:', privateCharterVoucherType.is_active);
        setShowEditPrivateCharterVoucherTypeForm(true);
    };

    const handleDeletePrivateCharterVoucherType = async (id) => {
        if (window.confirm('Are you sure you want to delete this private charter voucher type?')) {
            try {
                await axios.delete(`/api/private-charter-voucher-types/${id}`);
                fetchPrivateCharterVoucherTypes();
            } catch (error) {
                console.error('Error deleting private charter voucher type:', error);
                alert(error.response?.data?.message || 'Error deleting private charter voucher type');
            }
        }
    };
    
    const handleSyncPricingFromActivities = async () => {
        try {
            // Get all activities with private charter pricing
            const activitiesResponse = await axios.get('/api/activities/flight-types');
            if (!activitiesResponse.data.success) {
                alert('Failed to fetch activities');
                return;
            }
            
            const activities = activitiesResponse.data.data;
            const activitiesWithPricing = activities.filter(activity => 
                activity.private_charter_pricing && 
                typeof activity.private_charter_pricing === 'string' && 
                activity.private_charter_pricing !== '{}'
            );
            
            if (activitiesWithPricing.length === 0) {
                alert('No activities found with group pricing configured');
                return;
            }
            
            // Show activity selection dialog
            const selectedActivityId = window.prompt(
                `Select an activity to sync pricing from:\n\n${activitiesWithPricing.map(a => `${a.id}: ${a.activity_name} (${a.location})`).join('\n')}\n\nEnter the activity ID:`
            );
            
            if (!selectedActivityId) return;
            
            const selectedActivity = activitiesWithPricing.find(a => a.id.toString() === selectedActivityId);
            if (!selectedActivity) {
                alert('Invalid activity ID');
                return;
            }
            
            // Sync pricing from selected activity
            const syncResponse = await axios.post('/api/sync-activity-pricing', {
                activity_id: selectedActivity.id
            });
            
            if (syncResponse.data.success) {
                alert(`Successfully synced ${syncResponse.data.updatedCount} voucher types with group pricing from ${selectedActivity.activity_name}!`);
                // Refresh the voucher types to show updated pricing
                fetchPrivateCharterVoucherTypes();
            } else {
                alert('Error syncing pricing: ' + syncResponse.data.message);
            }
        } catch (error) {
            console.error('Error syncing pricing:', error);
            alert('Error syncing pricing: ' + error.message);
        }
    };
    
    const resetPrivateCharterVoucherTypeForm = () => {
        console.log('Resetting Private Charter Voucher Type form to default values');
        setPrivateCharterVoucherTypeFormData({
            title: '',
            description: '',
            image_url: '',
            image_file: null,
            max_passengers: 8,
            price_per_person: 300,
            price_unit: 'pp',
            validity_months: 18,
            flight_days: 'Any Day',
            flight_time: 'AM & PM',
            features: '[]',
            terms: '',
            sort_order: 0,
            is_active: true
        });
        setSelectedPrivateCharterVoucherType(null);
        console.log('Form reset completed');
    };

    // Crew Management form handling
    const handleCrewSubmit = async (e) => {
        e.preventDefault();
        
        // Form validation
        if (!crewFormData.first_name || !crewFormData.last_name) {
            alert('Please fill in all required fields: First Name and Last Name');
            return;
        }
        
        try {
            if (showEditCrewForm) {
                await axios.put(`/api/crew/${selectedCrewMember.id}`, crewFormData);
            } else {
                await axios.post('/api/crew', crewFormData);
            }
            
            fetchCrewMembers();
            resetCrewForm();
            setShowCrewForm(false);
            setShowEditCrewForm(false);
        } catch (error) {
            console.error('Error saving crew member:', error);
            alert(error.response?.data?.message || 'Error saving crew member');
        }
    };

    const handleEditCrew = (crewMember) => {
        setSelectedCrewMember(crewMember);
        setCrewFormData({
            first_name: crewMember.first_name,
            last_name: crewMember.last_name,
            email: crewMember.email || '',
            phone: crewMember.phone || '',
            is_active: crewMember.is_active
        });
        setShowEditCrewForm(true);
    };

    const handleDeleteCrew = async (id) => {
        if (window.confirm('Are you sure you want to delete this crew member?')) {
            try {
                await axios.delete(`/api/crew/${id}`);
                fetchCrewMembers();
            } catch (error) {
                console.error('Error deleting crew member:', error);
                alert(error.response?.data?.message || 'Error deleting crew member');
            }
        }
    };

    const resetCrewForm = () => {
        setCrewFormData({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            is_active: true
        });
        setSelectedCrewMember(null);
    };

    // Pilot Management form handling
    const handlePilotSubmit = async (e) => {
        e.preventDefault();
        
        // Form validation
        if (!pilotFormData.first_name || !pilotFormData.last_name) {
            alert('Please fill in all required fields: First Name and Last Name');
            return;
        }
        
        try {
            if (showEditPilotForm) {
                await axios.put(`/api/pilots/${selectedPilot.id}`, pilotFormData);
            } else {
                await axios.post('/api/pilots', pilotFormData);
            }
            
            fetchPilots();
            resetPilotForm();
            setShowPilotForm(false);
            setShowEditPilotForm(false);
        } catch (error) {
            console.error('Error saving pilot:', error);
            alert(error.response?.data?.message || 'Error saving pilot');
        }
    };

    const handleEditPilot = (pilot) => {
        setSelectedPilot(pilot);
        setPilotFormData({
            first_name: pilot.first_name,
            last_name: pilot.last_name,
            email: pilot.email || '',
            phone: pilot.phone || '',
            is_active: pilot.is_active
        });
        setShowEditPilotForm(true);
    };

    const handleDeletePilot = async (id) => {
        if (window.confirm('Are you sure you want to delete this pilot?')) {
            try {
                await axios.delete(`/api/pilots/${id}`);
                fetchPilots();
            } catch (error) {
                console.error('Error deleting pilot:', error);
                alert(error.response?.data?.message || 'Error deleting pilot');
            }
        }
    };

    const resetPilotForm = () => {
        setPilotFormData({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            is_active: true
        });
        setSelectedPilot(null);
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
        
        if (addToBookingFormData.locations.length === 0) {
            alert('Please select at least one location');
            return;
        }
        
        if (addToBookingFormData.experience_types.length === 0) {
            alert('Please select at least one experience type');
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
            formData.append('is_physical_item', addToBookingFormData.is_physical_item);
            formData.append('journey_types', JSON.stringify(addToBookingFormData.journey_types));
            formData.append('locations', JSON.stringify(addToBookingFormData.locations));
            formData.append('experience_types', JSON.stringify(addToBookingFormData.experience_types));
            formData.append('sort_order', addToBookingFormData.sort_order);
            formData.append('is_active', addToBookingFormData.is_active);
            
            // Debug: Log the form data being sent
            console.log('Form data being sent:', {
                title: addToBookingFormData.title,
                description: addToBookingFormData.description,
                price: addToBookingFormData.price,
                price_unit: addToBookingFormData.price_unit,
                category: addToBookingFormData.category,
                is_physical_item: addToBookingFormData.is_physical_item,
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
        
        // Safely parse locations - handle both JSON and string formats
        let parsedLocations = ['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'];
        if (item.locations) {
            try {
                // If it's already an array, use it directly
                if (Array.isArray(item.locations)) {
                    parsedLocations = item.locations;
                } else if (typeof item.locations === 'string') {
                    // Try to parse as JSON first
                    try {
                        parsedLocations = JSON.parse(item.locations);
                    } catch (parseError) {
                        // If JSON parsing fails, try to split by comma
                        if (item.locations.includes(',')) {
                            parsedLocations = item.locations.split(',').map(loc => loc.trim());
                        } else {
                            // Single value, wrap in array
                            parsedLocations = [item.locations.trim()];
                        }
                    }
                }
            } catch (error) {
                console.warn('Error parsing locations:', error);
                // Fallback to default
                parsedLocations = ['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'];
            }
        }
        
        // Safely parse experience_types - handle both JSON and string formats
        let parsedExperienceTypes = ['Shared Flight', 'Private Charter'];
        if (item.experience_types) {
            try {
                // If it's already an array, use it directly
                if (Array.isArray(item.experience_types)) {
                    parsedExperienceTypes = item.experience_types;
                } else if (typeof item.experience_types === 'string') {
                    // Try to parse as JSON first
                    try {
                        parsedExperienceTypes = JSON.parse(item.experience_types);
                    } catch (parseError) {
                        // If JSON parsing fails, try to split by comma
                        if (item.experience_types.includes(',')) {
                            parsedExperienceTypes = item.experience_types.split(',').map(exp => exp.trim());
                        } else {
                            // Single value, wrap in array
                            parsedExperienceTypes = [item.experience_types.trim()];
                        }
                    }
                }
            } catch (error) {
                console.warn('Error parsing experience_types:', error);
                // Fallback to default
                parsedExperienceTypes = ['Shared Flight', 'Private Charter'];
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
            is_physical_item: Boolean(item.is_physical_item),
            journey_types: parsedJourneyTypes,
            locations: parsedLocations,
            experience_types: parsedExperienceTypes,
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
            is_physical_item: true,
            journey_types: ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'],
            locations: ['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'],
            experience_types: ['Shared Flight', 'Private Charter'],
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
        
        if (additionalInfoFormData.locations.length === 0) {
            alert('Please select at least one location');
            return;
        }
        
        if (additionalInfoFormData.experience_types.length === 0) {
            alert('Please select at least one experience type');
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
            is_required: true, // All questions are now required
            options: question.options || '[]',
            placeholder_text: question.placeholder_text || '',
            help_text: question.help_text || '',
            category: question.category || 'General',
            journey_types: parsedJourneyTypes,
            locations: (() => {
                try {
                    if (question.locations) {
                        if (Array.isArray(question.locations)) {
                            return question.locations;
                        } else if (typeof question.locations === 'string') {
                            try {
                                return JSON.parse(question.locations);
                            } catch (parseError) {
                                if (question.locations.includes(',')) {
                                    return question.locations.split(',').map(loc => loc.trim());
                                } else {
                                    return [question.locations.trim()];
                                }
                            }
                        }
                    }
                    return ['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'];
                } catch (error) {
                    console.warn('Error parsing locations:', error);
                    return ['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'];
                }
            })(),
            experience_types: (() => {
                try {
                    if (question.experience_types) {
                        if (Array.isArray(question.experience_types)) {
                            return question.experience_types;
                        } else if (typeof question.experience_types === 'string') {
                            try {
                                return JSON.parse(question.experience_types);
                            } catch (parseError) {
                                if (question.experience_types.includes(',')) {
                                    return question.experience_types.split(',').map(exp => exp.trim());
                                } else {
                                    return [question.experience_types.trim()];
                                }
                            }
                        }
                    }
                    return ['Shared Flight', 'Private Charter'];
                } catch (error) {
                    console.warn('Error parsing experience_types:', error);
                    return ['Shared Flight', 'Private Charter'];
                }
            })(),
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
            is_required: true,
            options: '[]',
            placeholder_text: '',
            help_text: '',
            category: 'General',
            journey_types: ['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift'],
            locations: ['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'],
            experience_types: ['Shared Flight', 'Private Charter'],
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
        console.log('private_voucher_type_ids type:', typeof termsFormData.private_voucher_type_ids);
        console.log('private_voucher_type_ids value:', termsFormData.private_voucher_type_ids);
        console.log('private_voucher_type_ids isArray:', Array.isArray(termsFormData.private_voucher_type_ids));
        
        // Ensure voucher_type_ids is an array and also send voucher_type_id for clarity
            const normalizedIds = Array.isArray(termsFormData.voucher_type_ids)
                ? termsFormData.voucher_type_ids.map(Number)
                : [];
            
            // Ensure private_voucher_type_ids is an array
            const normalizedPrivateIds = Array.isArray(termsFormData.private_voucher_type_ids)
                ? termsFormData.private_voucher_type_ids.map(Number)
                : [];
            
            const formDataToSend = {
                ...termsFormData,
                voucher_type_id: normalizedIds[0] || null,
                voucher_type_ids: normalizedIds,
                private_voucher_type_ids: normalizedPrivateIds
            };
        
        console.log('Form data to send:', formDataToSend);
        
        // Form validation
        if (!formDataToSend.title || !formDataToSend.content) {
            alert('Please fill in all required fields: Title and Content');
            return;
        }
        
        // Check if at least one type is selected
        if (formDataToSend.voucher_type_ids.length === 0 && formDataToSend.private_voucher_type_ids.length === 0 && formDataToSend.experience_ids.length === 0) {
            alert('Please select at least one Voucher Type, Private Voucher Type, or Experience');
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

    // Passenger Terms (Passenger Information) form handling
    const resetPassengerTermsForm = () => {
        setPassengerTermsFormData({
            title: '',
            content: '',
            journey_types: [],
            is_active: true,
            sort_order: 0
        });
        setSelectedPassengerTerms(null);
    };

    const handlePassengerTermsSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...passengerTermsFormData };

        if (!payload.title || !payload.content) {
            alert('Please fill in all required fields: Title and Content');
            return;
        }
        if (!Array.isArray(payload.journey_types) || payload.journey_types.length === 0) {
            alert('Please select at least one Flight Type');
            return;
        }

        try {
            if (showEditPassengerTermsForm && selectedPassengerTerms) {
                await axios.put(`/api/passenger-terms/${selectedPassengerTerms.id}`, payload);
            } else {
                await axios.post('/api/passenger-terms', payload);
            }
            await fetchPassengerTerms();
            resetPassengerTermsForm();
            setShowPassengerTermsForm(false);
            setShowEditPassengerTermsForm(false);
        } catch (error) {
            console.error('Error saving passenger terms:', error);
            alert(error.response?.data?.message || 'Error saving passenger terms');
        }
    };

    const handleEditTerms = (terms) => {
        console.log('handleEditTerms called with:', terms);
        console.log('terms.private_voucher_type_ids:', terms.private_voucher_type_ids);
        console.log('terms.private_voucher_type_ids type:', typeof terms.private_voucher_type_ids);
        
        setSelectedTerms(terms);
        setTermsFormData({
            title: terms.title,
            content: terms.content,
            voucher_type_ids: (() => {
                try {
                    if (terms.voucher_type_id) {
                        return [Number(terms.voucher_type_id)];
                    }
                    if (terms.voucher_type_ids) {
                        const parsed = JSON.parse(terms.voucher_type_ids);
                        if (Array.isArray(parsed)) {
                            return parsed.map(id => Number(id));
                        }
                        return [];
                    }
                    return [];
                } catch (error) {
                    console.error('Error parsing voucher_type_ids:', error);
                    return [];
                }
            })(),
            private_voucher_type_ids: (() => {
                try {
                    console.log('Parsing private_voucher_type_ids:', terms.private_voucher_type_ids);
                    if (terms.private_voucher_type_ids) {
                        const parsed = JSON.parse(terms.private_voucher_type_ids);
                        console.log('Parsed private_voucher_type_ids:', parsed);
                        if (Array.isArray(parsed)) {
                            const result = parsed.map(id => Number(id));
                            console.log('Final private_voucher_type_ids result:', result);
                            return result;
                        }
                        return [];
                    }
                    console.log('No private_voucher_type_ids found, returning empty array');
                    return [];
                } catch (error) {
                    console.error('Error parsing private_voucher_type_ids:', error);
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
            experience_ids: [],
            voucher_type_ids: [],
            private_voucher_type_ids: [],
            is_active: true,
            sort_order: 0,
            showVoucherTypes: false,
            showPrivateVoucherTypes: false
        });
        setSelectedTerms(null);
    };

    const handleVoucherTypeToggle = (voucherTypeId) => {
        console.log('Toggle voucher type:', voucherTypeId);
        console.log('Current voucher_type_ids:', termsFormData.voucher_type_ids);
        
        setTermsFormData(prev => {
            const currentIds = Array.isArray(prev.voucher_type_ids) ? prev.voucher_type_ids.map(Number) : [];
            let newIds;
            if (currentIds.includes(Number(voucherTypeId))) {
                newIds = currentIds.filter(id => id !== Number(voucherTypeId));
            } else {
                newIds = [...currentIds, Number(voucherTypeId)];
            }
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
            valid_from: dayjs().format('YYYY-MM-DD'),
            valid_until: dayjs().format('YYYY-MM-DD'),
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
                                style={{ margin: 0, minWidth: 260 }}
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
                                                           <th style={{ textAlign: 'center' }}>CODE</th>
                                                           <th style={{ textAlign: 'center' }}>TITLE</th>
                                                           <th style={{ textAlign: 'center' }}>VALID FROM</th>
                                                           <th style={{ textAlign: 'center' }}>VALID UNTIL</th>
                                                           <th style={{ textAlign: 'center' }}>MAX USES</th>
                                                           <th style={{ textAlign: 'center' }}>STATUS</th>
                                                           <th style={{ textAlign: 'center' }}>ACTIONS</th>
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
                                style={{ margin: 0}}
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
                                                <th style={{ textAlign: 'center' }}>TITLE</th>
                                                <th style={{ textAlign: 'center' }}>DESCRIPTION</th>
                                                <th style={{ textAlign: 'center' }}>MAX PASSENGERS</th>
                                                <th style={{ textAlign: 'center' }}>STATUS</th>
                                                <th style={{ textAlign: 'center' }}>ACTIONS</th>
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
                            style={{ margin: 0}}
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
                                            
                                            <th>CATEGORY</th>
                                            <th>JOURNEY TYPES</th>
                                            <th>LOCATIONS</th>
                                            <th>EXPERIENCE TYPES</th>
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
                                                    {item.locations ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {(() => {
                                                                let locations = [];
                                                                try {
                                                                    if (Array.isArray(item.locations)) {
                                                                        locations = item.locations;
                                                                    } else if (typeof item.locations === 'string') {
                                                                        try {
                                                                            locations = JSON.parse(item.locations);
                                                                        } catch (parseError) {
                                                                            if (item.locations.includes(',')) {
                                                                                locations = item.locations.split(',').map(loc => loc.trim());
                                                                            } else {
                                                                                locations = [item.locations.trim()];
                                                                            }
                                                                        }
                                                                    }
                                                                } catch (error) {
                                                                    console.warn('Error parsing locations for display:', error);
                                                                    locations = ['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'];
                                                                }
                                                                
                                                                return locations.map((location) => (
                                                                    <span key={location} style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        backgroundColor: '#fef3c7',
                                                                        color: '#92400e'
                                                                    }}>
                                                                        {location}
                                                                    </span>
                                                                ));
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '11px',
                                                            backgroundColor: '#f3f4f6',
                                                            color: '#6b7280'
                                                        }}>
                                                            All Locations
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {item.experience_types ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {(() => {
                                                                let experienceTypes = [];
                                                                try {
                                                                    if (Array.isArray(item.experience_types)) {
                                                                        experienceTypes = item.experience_types;
                                                                    } else if (typeof item.experience_types === 'string') {
                                                                        try {
                                                                            experienceTypes = JSON.parse(item.experience_types);
                                                                        } catch (parseError) {
                                                                            if (item.experience_types.includes(',')) {
                                                                                experienceTypes = item.experience_types.split(',').map(exp => exp.trim());
                                                                            } else {
                                                                                experienceTypes = [item.experience_types.trim()];
                                                                            }
                                                                        }
                                                                    }
                                                                } catch (error) {
                                                                    console.warn('Error parsing experience_types for display:', error);
                                                                    experienceTypes = ['Shared Flight', 'Private Charter'];
                                                                }
                                                                
                                                                return experienceTypes.map((experienceType) => (
                                                                    <span key={experienceType} style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        backgroundColor: '#fef3c7',
                                                                        color: '#92400e'
                                                                    }}>
                                                                        {experienceType}
                                                                    </span>
                                                                ));
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '11px',
                                                            backgroundColor: '#f3f4f6',
                                                            color: '#6b7280'
                                                        }}>
                                                            All Experience Types
                                                        </span>
                                                    )}
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
                                                                    formData.append('is_physical_item', item.is_physical_item);
                                                                    formData.append('journey_types', item.journey_types ? JSON.stringify(item.journey_types) : JSON.stringify(['Book Flight', 'Flight Voucher', 'Redeem Voucher', 'Buy Gift']));
                                                                    formData.append('locations', item.locations ? JSON.stringify(item.locations) : JSON.stringify(['Bath', 'Devon', 'Somerset', 'Bristol Fiesta']));
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

            {/* Private Charter Voucher Types Section */}
            <div className="settings-card" style={{ marginBottom: '24px' }}>
                <div 
                    className="card-header"
                    onClick={() => setPrivateCharterVoucherTypesExpanded(!privateCharterVoucherTypesExpanded)}
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
                        <h2 style={{ margin: 0, color: '#1f2937' }}>Private Charter Voucher Types</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                            Manage private charter voucher types for exclusive ballooning experiences.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            className="btn btn-primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowPrivateCharterVoucherTypesForm(true);
                            }}
                            style={{ margin: 0 }}
                        >
                            <Plus size={20} />
                            Create Private Charter Voucher Type
                        </button>
                        <button 
                            className="btn btn-secondary"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSyncPricingFromActivities();
                            }}
                            style={{ margin: 0 }}
                            title="Sync group pricing from activities to voucher types"
                        >
                            🔄 Sync Pricing
                        </button>
                        {privateCharterVoucherTypesExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>
                
                {privateCharterVoucherTypesExpanded && (
                    <>
                        <div className="private-charter-voucher-types-stats" style={{ 
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
                                    {privateCharterVoucherTypes.length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Private Charter Voucher Types</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
                                    {privateCharterVoucherTypes.filter(vt => vt.is_active).length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
                            </div>
                        </div>
                        
                        {privateCharterVoucherTypes.length === 0 ? (
                            <div className="no-private-charter-voucher-types-message">
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎈</div>
                                    <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Private Charter Voucher Types Yet</h3>
                                    <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                        Create your first private charter voucher type for exclusive ballooning experiences.
                                    </p>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => setShowPrivateCharterVoucherTypesForm(true)}
                                    >
                                        <Plus size={20} />
                                        Create First Private Charter Voucher Type
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="private-charter-voucher-types-table-container">
                                <table className="private-charter-voucher-types-table">
                                    <thead>
                                        <tr>
                                            <th>TITLE</th>
                                            <th>DESCRIPTION</th>
                                            <th>PRICE</th>
                                            <th>FLIGHT DAYS</th>
                                            <th>FLIGHT TIME</th>
                                            <th>VALIDITY</th>
                                            <th>STATUS</th>
                                            <th>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {privateCharterVoucherTypes.map((privateCharterVoucherType) => (
                                            <tr key={privateCharterVoucherType.id}>
                                                <td>
                                                    <div>
                                                        <div style={{ fontWeight: '600' }}>{privateCharterVoucherType.title}</div>
                                                        {privateCharterVoucherType.image_url && (
                                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                                {privateCharterVoucherType.image_url.startsWith('/uploads/') ? (
                                                                    <img 
                                                                        src={privateCharterVoucherType.image_url} 
                                                                        alt={privateCharterVoucherType.title}
                                                                        style={{ 
                                                                            width: '60px', 
                                                                            height: '40px', 
                                                                            objectFit: 'cover',
                                                                            borderRadius: '4px',
                                                                            marginTop: '4px'
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    `Image: ${privateCharterVoucherType.image_url}`
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ maxWidth: '300px', fontSize: '14px' }}>
                                                        {privateCharterVoucherType.description}
                                                    </div>
                                                </td>
                                                
                                                <td>{privateCharterVoucherType.flight_days}</td>
                                                <td>{privateCharterVoucherType.flight_time}</td>
                                                <td>{privateCharterVoucherType.validity_months} months</td>
                                                <td>
                                                    {privateCharterVoucherType.is_active ? (
                                                        <span className="status-badge active">Active</span>
                                                    ) : (
                                                        <span className="status-badge inactive">Inactive</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="action-btn edit"
                                                            onClick={() => handleEditPrivateCharterVoucherType(privateCharterVoucherType)}
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            className="action-btn delete"
                                                            onClick={() => handleDeletePrivateCharterVoucherType(privateCharterVoucherType.id)}
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

            {/* Crew Management Section */}
            <div className="settings-card" style={{ marginBottom: '24px' }}>
                <div 
                    className="card-header"
                    onClick={() => setCrewExpanded(!crewExpanded)}
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
                        <h2 style={{ margin: 0, color: '#1f2937' }}>Crew Management</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                            Manage balloon crew members for flight operations.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                                className="btn btn-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCrewForm(true);
                                }}
                                style={{ margin: 0 }}
                            >
                                <Plus size={20} />
                                Add Crew Member
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPilotForm(true);
                                }}
                                style={{ margin: 0 }}
                            >
                                <Plus size={20} />
                                Add Pilot Member
                            </button>
                        </div>
                        {crewExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>
                
                {crewExpanded && (
                    <>
                        <div className="crew-stats" style={{ 
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
                                    {crewMembers.length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Crew Members</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
                                    {crewMembers.filter(c => c.is_active).length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
                            </div>
                        </div>
                        
                        {crewMembers.length === 0 ? (
                            <div className="no-crew-message">
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                                    <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Crew Members Yet</h3>
                                    <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                        Add your first crew member to manage balloon flight operations.
                                    </p>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => setShowCrewForm(true)}
                                    >
                                        <Plus size={20} />
                                        Add First Crew Member
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="crew-table-container">
                                <table className="crew-table">
                                    <thead>
                                        <tr>
                                            <th>NAME</th>
                                            <th>STATUS</th>
                                            <th>CREATED</th>
                                            <th>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {crewMembers.map((crew) => (
                                            <tr key={crew.id}>
                                                <td>
                                                    <div style={{ fontWeight: '500', color: '#1f2937' }}>
                                                        {crew.first_name} {crew.last_name}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${crew.is_active ? 'active' : 'inactive'}`}>
                                                        {crew.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ color: '#6b7280', fontSize: '14px' }}>
                                                        {new Date(crew.created_at).toLocaleDateString()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="action-btn edit"
                                                            onClick={() => handleEditCrew(crew)}
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            className="action-btn delete"
                                                            onClick={() => handleDeleteCrew(crew.id)}
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
                        
                        {/* Pilots Table */}
                        <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '2px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
                                Pilots
                            </h3>
                            
                            <div className="crew-stats" style={{ 
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
                                        {pilots.length}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Pilots</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
                                        {pilots.filter(p => p.is_active).length}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
                                </div>
                            </div>
                            
                            {pilots.length === 0 ? (
                                <div className="no-crew-message">
                                    <div style={{ textAlign: 'center', padding: '40px' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✈️</div>
                                        <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Pilots Yet</h3>
                                        <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                            Add your first pilot to manage balloon flight operations.
                                        </p>
                                        <button 
                                            className="btn btn-primary"
                                            onClick={() => setShowPilotForm(true)}
                                        >
                                            <Plus size={20} />
                                            Add First Pilot
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="crew-table-container">
                                    <table className="crew-table">
                                        <thead>
                                            <tr>
                                                <th>NAME</th>
                                                <th>STATUS</th>
                                                <th>CREATED</th>
                                                <th>ACTIONS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pilots.map((pilot) => (
                                                <tr key={pilot.id}>
                                                    <td>
                                                        <div style={{ fontWeight: '500', color: '#1f2937' }}>
                                                            {pilot.first_name} {pilot.last_name}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${pilot.is_active ? 'active' : 'inactive'}`}>
                                                            {pilot.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{ color: '#6b7280', fontSize: '14px' }}>
                                                            {new Date(pilot.created_at).toLocaleDateString()}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="action-btn edit"
                                                                onClick={() => handleEditPilot(pilot)}
                                                                title="Edit"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn delete"
                                                                onClick={() => handleDeletePilot(pilot.id)}
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
                        </div>
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
                                            <th>LOCATIONS</th>
                                            <th>EXPERIENCE TYPES</th>
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
                                                            {(() => {
                                                                try {
                                                                    const parsedOptions = JSON.parse(question.options);
                                                                    if (Array.isArray(parsedOptions)) {
                                                                        return (
                                                                            <>
                                                                                {parsedOptions.slice(0, 3).join(', ')}
                                                                                {parsedOptions.length > 3 && '...'}
                                                                            </>
                                                                        );
                                                                    } else {
                                                                        return 'Invalid options format';
                                                                    }
                                                                } catch (parseError) {
                                                                    console.warn('Error parsing question options:', parseError, 'Raw value:', question.options);
                                                                    return 'Invalid options format';
                                                                }
                                                            })()}
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
                                                    {question.locations ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {(() => {
                                                                let locations = [];
                                                                try {
                                                                    if (Array.isArray(question.locations)) {
                                                                        locations = question.locations;
                                                                    } else if (typeof question.locations === 'string') {
                                                                        try {
                                                                            locations = JSON.parse(question.locations);
                                                                        } catch (parseError) {
                                                                            if (question.locations.includes(',')) {
                                                                                locations = question.locations.split(',').map(loc => loc.trim());
                                                                            } else {
                                                                                locations = [question.locations.trim()];
                                                                            }
                                                                        }
                                                                    }
                                                                } catch (error) {
                                                                    console.warn('Error parsing locations for display:', error);
                                                                    locations = ['Bath', 'Devon', 'Somerset', 'Bristol Fiesta'];
                                                                }
                                                                
                                                                return locations.map((location) => (
                                                                    <span key={location} style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        backgroundColor: '#fef3c7',
                                                                        color: '#92400e'
                                                                    }}>
                                                                        {location}
                                                                    </span>
                                                                ));
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                            {question.locations === undefined || question.locations === null ? 
                                                                'Not set' : 'No locations'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {question.experience_types ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {(() => {
                                                                let experienceTypes = [];
                                                                try {
                                                                    if (Array.isArray(question.experience_types)) {
                                                                        experienceTypes = question.experience_types;
                                                                    } else if (typeof question.experience_types === 'string') {
                                                                        try {
                                                                            experienceTypes = JSON.parse(question.experience_types);
                                                                        } catch (parseError) {
                                                                            if (question.experience_types.includes(',')) {
                                                                                experienceTypes = question.experience_types.split(',').map(exp => exp.trim());
                                                                            } else {
                                                                                experienceTypes = [question.experience_types.trim()];
                                                                            }
                                                                        }
                                                                    }
                                                                } catch (error) {
                                                                    console.warn('Error parsing experience_types for display:', error);
                                                                    experienceTypes = ['Shared Flight', 'Private Charter'];
                                                                }
                                                                
                                                                return experienceTypes.map((experienceType) => (
                                                                    <span key={experienceType} style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        backgroundColor: '#dcfce7',
                                                                        color: '#166534'
                                                                    }}>
                                                                        {experienceType}
                                                                    </span>
                                                                ));
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                            {question.experience_types === undefined || question.experience_types === null ? 
                                                                'Not set' : 'No experience types'}
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
                                            let hasVoucherTypes = false;
                                            
                                            // Check voucher_type_ids
                                            if (t.voucher_type_ids) {
                                                const voucherTypeIds = JSON.parse(t.voucher_type_ids);
                                                if (Array.isArray(voucherTypeIds) && voucherTypeIds.length > 0) {
                                                    hasVoucherTypes = true;
                                                }
                                            }
                                            
                                            // Check private_voucher_type_ids
                                            if (t.private_voucher_type_ids) {
                                                const privateVoucherTypeIds = JSON.parse(t.private_voucher_type_ids);
                                                if (Array.isArray(privateVoucherTypeIds) && privateVoucherTypeIds.length > 0) {
                                                    hasVoucherTypes = true;
                                                }
                                            }
                                            
                                            return hasVoucherTypes;
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
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                        {(() => {
                                                            // Prefer voucher_type_id; fallback to voucher_type_ids JSON
                                                            const idCandidates = [];
                                                            if (terms.voucher_type_id) {
                                                                idCandidates.push(Number(terms.voucher_type_id));
                                                            }
                                                            if (terms.voucher_type_ids) {
                                                                let parsed = [];
                                                                if (Array.isArray(terms.voucher_type_ids)) {
                                                                    parsed = terms.voucher_type_ids;
                                                                } else {
                                                                    try {
                                                                        parsed = JSON.parse(terms.voucher_type_ids);
                                                                    } catch (e) {
                                                                        // ignore parse error here; we'll show a badge if nothing resolves
                                                                    }
                                                                }
                                                                if (Array.isArray(parsed)) {
                                                                    parsed.forEach((v) => idCandidates.push(Number(v)));
                                                                }
                                                            }
                                                            
                                                            // Add private voucher type IDs
                                                            if (terms.private_voucher_type_ids) {
                                                                let parsedPrivate = [];
                                                                if (Array.isArray(terms.private_voucher_type_ids)) {
                                                                    parsedPrivate = terms.private_voucher_type_ids;
                                                                } else {
                                                                    try {
                                                                        parsedPrivate = JSON.parse(terms.private_voucher_type_ids);
                                                                    } catch (e) {
                                                                        // ignore parse error here; we'll show a badge if nothing resolves
                                                                    }
                                                                }
                                                                if (Array.isArray(parsedPrivate)) {
                                                                    parsedPrivate.forEach((v) => idCandidates.push(Number(v)));
                                                                }
                                                            }
                                                            
                                                            const uniqueIds = Array.from(new Set(idCandidates.filter((v) => !Number.isNaN(v))));
                                                            if (uniqueIds.length === 0) {
                                                                return <span style={{ color: '#9ca3af', fontSize: '12px' }}>No voucher type</span>;
                                                            }
                                                            return uniqueIds.map((voucherTypeId) => {
                                                                // First try to find in normal voucher types
                                                                let voucherType = voucherTypes.find((vt) => Number(vt.id) === Number(voucherTypeId));
                                                                let isPrivateCharter = false;
                                                                
                                                                // If not found in normal voucher types, check private charter voucher types
                                                                if (!voucherType) {
                                                                    voucherType = privateCharterVoucherTypes.find((vt) => Number(vt.id) === Number(voucherTypeId));
                                                                    isPrivateCharter = true;
                                                                }
                                                                
                                                                return (
                                                                    <span key={voucherTypeId} style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '11px',
                                                                        backgroundColor: isPrivateCharter ? '#fef3c7' : '#dbeafe',
                                                                        color: isPrivateCharter ? '#92400e' : '#1e40af'
                                                                    }}>
                                                                        {voucherType ? voucherType.title : `#${voucherTypeId}`}
                                                                    </span>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
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

            {/* Terms & Conditions for Passenger Information (duplicate section) */}
            <div className="card" style={{ marginTop: '16px' }}>
                <div
                    className="card-header"
                    onClick={() => setPassengerTermsExpanded(!passengerTermsExpanded)}
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
                        <h2 style={{ margin: 0, color: '#1f2937' }}>Terms & Conditions for Passenger Information</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                            Manage additional terms shown alongside Passenger Information in balloning-book.
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
                        {passengerTermsExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>
                {passengerTermsExpanded && (
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
                                    {passengerTerms.length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Terms</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
                                    {passengerTerms.filter(t => t.is_active).length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Active</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '600', color: '#3b82f6' }}>
                                    {passengerTerms.filter(t => safeParseJourneyTypes(t.journey_types).length > 0).length}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Linked to Journey Types</div>
                            </div>
                        </div>

                        {passengerTerms.length === 0 ? (
                            <div className="no-terms-message">
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                                    <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Terms Yet</h3>
                                    <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                        Create your first terms and conditions to display in the Passenger Information section.
                                    </p>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => setShowPassengerTermsForm(true)}
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
                                            <th>Journey Types</th>
                                            <th>Sort Order</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {passengerTerms.map((terms) => (
                                            <tr key={`passenger-${terms.id}`}>
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
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                        {safeParseJourneyTypes(terms.journey_types).map((label) => (
                                                            <span key={`journey-${label}`} style={{
                                                                padding: '2px 8px',
                                                                borderRadius: '12px',
                                                                fontSize: '11px',
                                                                backgroundColor: '#dbeafe',
                                                                color: '#1e40af'
                                                            }}>
                                                                {label}
                                                            </span>
                                                        ))}
                                                    </div>
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
                                                            onClick={() => {
                                                                setSelectedPassengerTerms(terms);
                                                                setPassengerTermsFormData({
                                                                    title: terms.title,
                                                                    content: terms.content,
                                                                    journey_types: safeParseJourneyTypes(terms.journey_types),
                                                                    is_active: !!terms.is_active,
                                                                    sort_order: terms.sort_order || 0
                                                                });
                                                                setShowEditPassengerTermsForm(true);
                                                            }}
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-icon btn-danger"
                                                            onClick={async () => {
                                                                if (!window.confirm('Delete this passenger terms item?')) return;
                                                                try {
                                                                    await axios.delete(`/api/passenger-terms/${terms.id}`);
                                                                    fetchPassengerTerms();
                                                                } catch (e) {
                                                                    alert('Error deleting');
                                                                }
                                                            }}
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

            {/* Resources Section (under Passenger Information terms) */}
            <div className="settings-card" style={{ marginBottom: '24px' }}>
                <div 
                    className="card-header"
                    onClick={() => setResourcesExpanded(!resourcesExpanded)}
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
                        <h2 style={{ margin: 0, color: '#1f2937' }}>Resources</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                            Manage your inventory of resources, helping you assign, schedule, and share resources across activities.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            className="btn btn-primary"
                            onClick={(e) => { e.stopPropagation(); setShowResourceForm(true); }}
                            style={{ margin: 0 }}
                        >
                            <Plus size={20} />
                            Create Resources
                        </button>
                        {resourcesExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>

                {resourcesExpanded && (
                    resources.length === 0 ? (
                        <div className="no-crew-message">
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎈</div>
                                <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Resources Yet</h3>
                                <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                    Create your first resource to start scheduling and assigning resources.
                                </p>
                                <button className="btn btn-primary" onClick={() => setShowResourceForm(true)}>
                                    <Plus size={20} />
                                    Create First Resource
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="resources-table-container">
                            <table className="resources-table">
                                <thead>
                                    <tr>
                                        <th>NAME</th>
                                        <th>GROUP</th>
                                        <th>MAX USES</th>
                                        <th>SORT ORDER</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resources.map((r) => (
                                        <tr key={r.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ width: 10, height: 10, borderRadius: 10, background: r.color || '#3b82f6', display: 'inline-block' }} />
                                                    <span style={{ fontWeight: 500, color: '#1f2937' }}>{r.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>{r.group}</span>
                                            </td>
                                            <td>{r.max_uses}</td>
                                            <td><span style={{ color: '#6b7280' }}>{r.sort_order}</span></td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="action-btn edit"
                                                        title="Edit"
                                                        onClick={() => {
                                                            setSelectedResource(r);
                                                            setResourceFormData({
                                                                name: r.name,
                                                                resource_group_id: resourceGroups.find(g => g.name === r.group)?.id || '',
                                                                experience_types: Array.isArray(r.experience_types) ? r.experience_types : (r.experience_type ? [r.experience_type] : []),
                                                                max_uses: r.max_uses,
                                                                sort_order: r.sort_order,
                                                                color: r.color || '#0ea5e9',
                                                                icon: r.icon || 'Generic',
                                                                quantity: 1
                                                            });
                                                            setShowEditResourceForm(true);
                                                        }}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* Resource Groups Section */}
            <div className="settings-card" style={{ marginBottom: '24px' }}>
                <div 
                    className="card-header"
                    onClick={() => setResourceGroupsExpanded(!resourceGroupsExpanded)}
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
                        <h2 style={{ margin: 0, color: '#1f2937' }}>Resource Groups</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                            Organize resources into groups for easier scheduling and assignment.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            className="btn btn-primary"
                            onClick={(e) => { e.stopPropagation(); setShowResourceGroupForm(true); }}
                            style={{ margin: 0 }}
                        >
                            <Plus size={20} />
                            Create Resource Group
                        </button>
                        {resourceGroupsExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>

                {resourceGroupsExpanded && (
                    resourceGroups.length === 0 ? (
                        <div className="no-crew-message">
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧩</div>
                                <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>No Resource Groups Yet</h3>
                                <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                                    Create your first resource group to categorize resources.
                                </p>
                                <button className="btn btn-primary" onClick={() => setShowResourceGroupForm(true)}>
                                    <Plus size={20} />
                                    Create First Group
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="resource-groups-table-container">
                            <table className="resource-groups-table">
                                <thead>
                                    <tr>
                                        <th>GROUP NAME</th>
                                        <th>USED BY</th>
                                        <th>ITEMS</th>
                                        <th>TOTAL PAX</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resourceGroups.map((g) => {
                                        const items = resources.filter(r => (r.group && r.group === g.name) || String(r.resource_group_id) === String(g.id)).length;
                                        const totalPax = resources
                                            .filter(r => (r.group && r.group === g.name) || String(r.resource_group_id) === String(g.id))
                                            .reduce((sum, r) => sum + (Number(r.max_uses) || 0), 0);
                                        return (
                                            <tr key={g.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ width: 10, height: 10, borderRadius: 10, background: g.color || '#94a3b8', display: 'inline-block' }} />
                                                        <span style={{ fontWeight: 500, color: '#1f2937' }}>{g.name}</span>
                                                    </div>
                                                </td>
                                                <td><span style={{ color: '#475569' }}>{g.used_by || '-'}</span></td>
                                                <td>{items}</td>
                                                <td>{totalPax}</td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="action-btn edit"
                                                            title="Edit"
                                                            onClick={() => {
                                                                setSelectedResourceGroup(g);
                                                                const selectedIds = resources
                                                                    .filter((r) => (r.group && r.group === g.name) || String(r.resource_group_id) === String(g.id))
                                                                    .map((r) => r.id);
                                                                setResourceGroupEditFormData({ name: g.name, resource_ids: selectedIds });
                                                                setShowEditResourceGroupForm(true);
                                                            }}
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* Email Templates Section */}
            <div className="settings-card" style={{ marginBottom: '24px' }}>
                <div 
                    className="card-header"
                    onClick={() => setEmailTemplatesExpanded(!emailTemplatesExpanded)}
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
                        <h2 style={{ margin: 0, color: '#1f2937' }}>Email Templates</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                            Message Templates are any communication—via email or text message— sent to a customer or participant from your dashboard.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            className="btn btn-primary"
                            onClick={(e) => { e.stopPropagation(); setShowEmailTemplateForm(true); }}
                            style={{ margin: 0 }}
                        >
                            <Plus size={20} />
                            New Template
                        </button>
                        {emailTemplatesExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>

                {emailTemplatesExpanded && (
                    <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
                        {emailTemplates.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '40px 20px', 
                                color: '#6b7280',
                                background: '#fff',
                                borderRadius: '8px',
                                border: '1px dashed #d1d5db'
                            }}>
                                <p style={{ margin: 0, fontSize: '15px' }}>No email templates yet. Create your first template!</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NAME</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SUBJECT</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CATEGORY</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EDITED</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emailTemplates.map((template) => (
                                            <tr key={template.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{ fontWeight: 500, color: '#1f2937' }}>{template.name}</span>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ color: '#d32f2f', fontSize: '16px' }}>🎈</span>
                                                        <span style={{ color: '#475569' }}>{template.subject}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{ color: '#475569' }}>{template.category}</span>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                                    <div style={{ 
                                                        width: '24px', 
                                                        height: '24px', 
                                                        borderRadius: '50%', 
                                                        border: '2px solid #d1d5db',
                                                        margin: '0 auto',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {template.edited ? <CheckCircle size={16} color="#10b981" /> : null}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                                        <button
                                                            className="action-btn edit"
                                                            title="Edit"
                                                            onClick={() => {
                                                setSelectedEmailTemplate(template);
                                                setEmailTemplateFormData({
                                                    name: template.name,
                                                    subject: template.subject,
                                                                    body: extractMessageFromTemplateBody(template.body) || getDefaultTemplateBody(template.name),
                                                    category: template.category
                                                });
                                                setShowEditEmailTemplateForm(true);
                                                            }}
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            className="action-btn delete"
                                                            title="Delete"
                                                            onClick={async () => {
                                                                if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
                                                                    try {
                                                                        await axios.delete(`/api/email-templates/${template.id}`);
                                                                        fetchEmailTemplates();
                                                                        alert('Template deleted successfully');
                                                                    } catch (error) {
                                                                        alert('Error deleting template: ' + (error.response?.data?.message || error.message));
                                                                    }
                                                                }
                                                            }}
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
                    </div>
                )}
            </div>

            {/* SMS Templates Section */}
            <div className="settings-card" style={{ marginBottom: '24px' }}>
                <div 
                    className="card-header"
                    onClick={() => setSmsTemplatesExpanded(!smsTemplatesExpanded)}
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
                        <h2 style={{ margin: 0, color: '#1f2937' }}>SMS Templates</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                            SMS message templates sent to customers via text message. Preview shows how messages appear on mobile devices.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            className="btn btn-primary"
                            onClick={(e) => { e.stopPropagation(); setShowSmsTemplateForm(true); }}
                            style={{ margin: 0 }}
                        >
                            <Plus size={20} />
                            New Template
                        </button>
                        {smsTemplatesExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>

                {smsTemplatesExpanded && (
                    <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
                        {smsTemplates.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '40px 20px', 
                                color: '#6b7280',
                                background: '#fff',
                                borderRadius: '8px',
                                border: '1px dashed #d1d5db'
                            }}>
                                <p style={{ margin: 0, fontSize: '15px' }}>No SMS templates yet. Create your first template!</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NAME</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MESSAGE PREVIEW</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CATEGORY</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EDITED</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {smsTemplates.map((template) => (
                                            <tr key={template.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{ fontWeight: 500, color: '#1f2937' }}>{template.name}</span>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{ color: '#475569', fontSize: '13px' }}>
                                                        {template.message ? (template.message.length > 80 ? template.message.substring(0, 80) + '...' : template.message) : 'N/A'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{ color: '#475569' }}>{template.category}</span>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                                    <div style={{ 
                                                        width: '24px', 
                                                        height: '24px', 
                                                        borderRadius: '50%', 
                                                        border: '2px solid #d1d5db',
                                                        margin: '0 auto',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {template.edited ? <CheckCircle size={16} color="#10b981" /> : null}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                                        <button
                                                            className="action-btn edit"
                                                            title="Edit"
                                                            onClick={() => {
                                                                setSelectedSmsTemplate(template);
                                                                setSmsTemplateFormData({
                                                                    name: template.name,
                                                                    message: template.message || '',
                                                                    category: template.category || 'User Defined Message'
                                                                });
                                                                setShowEditSmsTemplateForm(true);
                                                            }}
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            className="action-btn delete"
                                                            title="Delete"
                                                            onClick={async () => {
                                                                if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
                                                                    try {
                                                                        await axios.delete(`/api/sms-templates/${template.id}`);
                                                                        fetchSmsTemplates();
                                                                        alert('Template deleted successfully');
                                                                    } catch (error) {
                                                                        alert('Error deleting template: ' + (error.response?.data?.message || error.message));
                                                                    }
                                                                }
                                                            }}
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
                    </div>
                )}
            </div>

            {/* Create Resource Group Modal */}
            {showResourceGroupForm && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 style={isMobile ? {
                                fontSize: '14px',
                                fontWeight: 600,
                                margin: 0
                            } : {
                                fontSize: '20px',
                                fontWeight: 600,
                                margin: 0,
                                color: '#1f2937'
                            }}>Add Resource Group</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowResourceGroupForm(false)}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {
                                    fontSize: '24px',
                                    width: '32px',
                                    height: '32px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div className="voucher-form" style={isMobile ? {
                            padding: '12px',
                            paddingTop: '12px'
                        } : {
                            padding: '24px'
                        }}>
                            <p style={isMobile ? {
                                color: '#6b7280',
                                marginTop: 0,
                                marginBottom: '12px',
                                fontSize: '11px',
                                lineHeight: '1.4'
                            } : {
                                color: '#6b7280',
                                marginTop: 0,
                                marginBottom: '12px',
                                fontSize: '14px',
                                lineHeight: '1.5'
                            }}>
                                A resource group allows you to group your resources together, and assign the group of resources to an activity.
                            </p>
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Name</label>
                                <input
                                    type="text"
                                    placeholder="Canoe"
                                    value={resourceGroupFormData.name}
                                    onChange={(e) => setResourceGroupFormData({ name: e.target.value })}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        height: '32px',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div className="form-actions" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingTop: '12px',
                                marginTop: '12px',
                                borderTop: '1px solid #e5e7eb'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '20px'
                            }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowResourceGroupForm(false)}
                                    style={isMobile ? {
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        width: '100%',
                                        borderRadius: '4px',
                                        height: '36px'
                                    } : {
                                        padding: '8px 20px',
                                        fontSize: '14px',
                                        borderRadius: '6px'
                                    }}
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={async () => {
                                        const payload = { name: resourceGroupFormData.name };
                                        let success = false;
                                        try {
                                            const resp = await axios.post('/api/resource-groups', payload);
                                            success = !!resp.data?.success;
                                        } catch (apiErr) {
                                            console.warn('Resource Groups create API not available, mocking create');
                                        }
                                        if (!success) {
                                            setResourceGroups(prev => [{ id: Date.now(), name: payload.name, used_by: '—', sort_order: 0, color: '#94a3b8' }, ...prev]);
                                        } else {
                                            await fetchResourceGroups();
                                        }
                                        setShowResourceGroupForm(false);
                                        setResourceGroupFormData({ name: '' });
                                    }}
                                    style={isMobile ? {
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        width: '100%',
                                        borderRadius: '4px',
                                        height: '36px'
                                    } : {
                                        padding: '8px 20px',
                                        fontSize: '14px',
                                        borderRadius: '6px'
                                    }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Resource Group Modal */}
            {showEditResourceGroupForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Edit Resource Group</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowEditResourceGroupForm(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="voucher-form" style={{ paddingTop: 16 }}>
                            <p style={{ color: '#6b7280', marginTop: 0 }}>
                                A resource group allows you to group your resources together, and assign the group of resources to an activity.
                            </p>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    value={resourceGroupEditFormData.name}
                                    onChange={(e) => setResourceGroupEditFormData({ ...resourceGroupEditFormData, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Resources</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                    {resources.map(r => (
                                        <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151' }}>
                                            <input
                                                type="checkbox"
                                                checked={resourceGroupEditFormData.resource_ids.includes(r.id)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setResourceGroupEditFormData(prev => {
                                                        const set = new Set(prev.resource_ids);
                                                        if (checked) set.add(r.id); else set.delete(r.id);
                                                        return { ...prev, resource_ids: Array.from(set) };
                                                    });
                                                }}
                                            />
                                            {r.name}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={async () => {
                                        if (!selectedResourceGroup) return;
                                        if (!window.confirm('Delete this resource group?')) return;
                                        let success = false;
                                        try {
                                            const resp = await axios.delete(`/api/resource-groups/${selectedResourceGroup.id}`);
                                            success = !!resp.data?.success;
                                        } catch (apiErr) {
                                            console.warn('Resource Groups delete API not available, removing locally');
                                        }
                                        if (!success) {
                                            setResourceGroups(prev => prev.filter(g => g.id !== selectedResourceGroup.id));
                                            // Also clear assignment from resources
                                            setResources(prev => prev.map(r => ((String(r.resource_group_id) === String(selectedResourceGroup.id)) || (r.group === selectedResourceGroup.name)) ? { ...r, resource_group_id: undefined, group: '' } : r));
                                        } else {
                                            await fetchResourceGroups();
                                            await fetchResources();
                                        }
                                        setShowEditResourceGroupForm(false);
                                        setSelectedResourceGroup(null);
                                    }}
                                >
                                    Delete
                                </button>
                                <div>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowEditResourceGroupForm(false)}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={async () => {
                                            if (!selectedResourceGroup) return;
                                            const payload = {
                                                name: resourceGroupEditFormData.name,
                                                resource_ids: resourceGroupEditFormData.resource_ids
                                            };
                                            let success = false;
                                            try {
                                                const resp = await axios.put(`/api/resource-groups/${selectedResourceGroup.id}`, payload);
                                                success = !!resp.data?.success;
                                            } catch (apiErr) {
                                                console.warn('Resource Groups update API not available, mocking update');
                                            }
                                            if (!success) {
                                                // Update groups list
                                                setResourceGroups(prev => prev.map(g => g.id === selectedResourceGroup.id ? { ...g, name: payload.name } : g));
                                                // Reassign resources locally
                                                setResources(prev => prev.map(r => {
                                                    const isSelected = payload.resource_ids.includes(r.id);
                                                    if (isSelected) {
                                                        return { ...r, group: payload.name, resource_group_id: selectedResourceGroup.id };
                                                    }
                                                    if ((String(r.resource_group_id) === String(selectedResourceGroup.id)) || (r.group === selectedResourceGroup.name)) {
                                                        return { ...r, group: '', resource_group_id: undefined };
                                                    }
                                                    return r;
                                                }));
                                            } else {
                                                await fetchResourceGroups();
                                                await fetchResources();
                                            }
                                            setShowEditResourceGroupForm(false);
                                            setSelectedResourceGroup(null);
                                        }}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Resources Form Modal */}
            {showResourceForm && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 style={isMobile ? {
                                fontSize: '14px',
                                fontWeight: 600,
                                margin: 0
                            } : {
                                fontSize: '20px',
                                fontWeight: 600,
                                margin: 0,
                                color: '#1f2937'
                            }}>Create New Resources</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowResourceForm(false)}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {
                                    fontSize: '24px',
                                    width: '32px',
                                    height: '32px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <form 
                            onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    const payload = {
                                        name: resourceFormData.name,
                                        resource_group_id: resourceFormData.resource_group_id,
                                        experience_types: resourceFormData.experience_types,
                                        max_uses: Number(resourceFormData.max_uses) || 1,
                                        sort_order: Number(resourceFormData.sort_order) || 1,
                                        color: resourceFormData.color,
                                        icon: resourceFormData.icon,
                                        quantity: Number(resourceFormData.quantity) || 1
                                    };
                                    let success = false;
                                    try {
                                        const resp = await axios.post('/api/resources', payload);
                                        success = !!resp.data?.success;
                                    } catch (apiErr) {
                                        console.warn('Resources create API not available, mocking create');
                                    }
                                    if (!success) {
                                        // Fallback: push to UI list
                                        const groupName = (resourceGroups.find(g => String(g.id) === String(payload.resource_group_id)) || {}).name || payload.resource_group_id;
                                        const newItems = Array.from({ length: payload.quantity }).map((_, idx) => ({
                                            id: `${Date.now()}-${idx}`,
                                            name: payload.name || `Resource #${Math.floor(Math.random()*1000)}`,
                                            group: groupName,
                                            experience_types: payload.experience_types,
                                            max_uses: payload.max_uses,
                                            sort_order: payload.sort_order,
                                            color: payload.color
                                        }));
                                        setResources(prev => [...newItems, ...prev]);
                                    } else {
                                        await fetchResources();
                                    }
                                    setShowResourceForm(false);
                                    setResourceFormData({ name: '', resource_group_id: '', experience_types: [], max_uses: 1, sort_order: 1, color: '#0ea5e9', icon: 'Generic', quantity: 1 });
                                } catch (err) {
                                    alert('Error saving resource');
                                }
                            }}
                            className="voucher-form"
                            style={isMobile ? {
                                padding: '12px'
                            } : {
                                padding: '24px'
                            }}
                        >
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Resource Name</label>
                                    <input
                                        type="text"
                                        placeholder="Resource #244"
                                        value={resourceFormData.name}
                                        onChange={(e) => setResourceFormData({ ...resourceFormData, name: e.target.value })}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Resource Group</label>
                                    <select
                                        value={resourceFormData.resource_group_id}
                                        onChange={(e) => setResourceFormData({ ...resourceFormData, resource_group_id: e.target.value })}
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="" disabled>Select group</option>
                                        {resourceGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    <small style={isMobile ? {
                                        fontSize: '10px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        display: 'block'
                                    } : {
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        display: 'block'
                                    }}>Assign this resource to a Resource Group</small>
                                </div>
                            </div>

                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Max Uses</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={resourceFormData.max_uses}
                                        onChange={(e) => setResourceFormData({ ...resourceFormData, max_uses: e.target.value })}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <small style={isMobile ? {
                                        fontSize: '10px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        display: 'block'
                                    } : {
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        display: 'block'
                                    }}>Max number of times this resource can be used at one time.</small>
                                </div>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Sort Order</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={resourceFormData.sort_order}
                                        onChange={(e) => setResourceFormData({ ...resourceFormData, sort_order: e.target.value })}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <small style={isMobile ? {
                                        fontSize: '10px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        display: 'block'
                                    } : {
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        display: 'block'
                                    }}>Sort order to display resources on Manifest Timeline</small>
                                </div>
                            </div>

                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Experience</label>
                                    <div style={isMobile ? {
                                        display: 'grid',
                                        gridTemplateColumns: '1fr',
                                        gap: '6px',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        background: '#f9fafb'
                                    } : {
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        background: '#f9fafb'
                                    }}>
                                        {experienceTypes.map(opt => (
                                            <label key={opt} style={isMobile ? {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            } : {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '8px',
                                                cursor: 'pointer'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={resourceFormData.experience_types.includes(opt)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setResourceFormData(prev => {
                                                            const set = new Set(prev.experience_types);
                                                            if (checked) set.add(opt); else set.delete(opt);
                                                            return { ...prev, experience_types: Array.from(set) };
                                                        });
                                                    }}
                                                    style={isMobile ? {
                                                        width: '14px',
                                                        height: '14px'
                                                    } : {
                                                        width: '18px',
                                                        height: '18px',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                                <span style={isMobile ? {
                                                    fontSize: '11px',
                                                    color: '#374151'
                                                } : {
                                                    fontSize: '14px',
                                                    color: '#374151'
                                                }}>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <small style={isMobile ? {
                                        fontSize: '10px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        display: 'block'
                                    } : {
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        display: 'block'
                                    }}>Choose which experience this resource is used for</small>
                                </div>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Display Color</label>
                                    <input
                                        type="color"
                                        value={resourceFormData.color}
                                        onChange={(e) => setResourceFormData({ ...resourceFormData, color: e.target.value })}
                                        style={isMobile ? {
                                            width: '100%',
                                            height: '32px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            height: '40px',
                                            borderRadius: '6px',
                                            border: '1px solid #d1d5db',
                                            boxSizing: 'border-box',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <small style={isMobile ? {
                                        fontSize: '10px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        display: 'block'
                                    } : {
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        display: 'block'
                                    }}>The color to use when showing this resource on the manifest</small>
                                </div>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Icon</label>
                                    <select
                                        value={resourceFormData.icon}
                                        onChange={(e) => setResourceFormData({ ...resourceFormData, icon: e.target.value })}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="Generic">Generic</option>
                                        <option value="Balloon">Balloon</option>
                                        <option value="Vehicle">Vehicle</option>
                                        <option value="Equipment">Equipment</option>
                                    </select>
                                    <small style={isMobile ? {
                                        fontSize: '10px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        display: 'block'
                                    } : {
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        display: 'block'
                                    }}>Icon used on manifest and booking views</small>
                                </div>
                            </div>

                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Number of Resources</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={resourceFormData.quantity}
                                    onChange={(e) => setResourceFormData({ ...resourceFormData, quantity: e.target.value })}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        height: '32px',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <small style={isMobile ? {
                                    fontSize: '10px',
                                    color: '#6b7280',
                                    marginTop: '4px',
                                    display: 'block'
                                } : {
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    marginTop: '4px',
                                    display: 'block'
                                }}>The number of resources you'd like to create.</small>
                            </div>

                            <div className="form-actions" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingTop: '12px',
                                marginTop: '12px',
                                borderTop: '1px solid #e5e7eb'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '20px'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowResourceForm(false)} style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}><Plus size={isMobile ? 14 : 16} /> Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Resource Form Modal */}
            {showEditResourceForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Edit Resource</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowEditResourceForm(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form 
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!selectedResource) return;
                                try {
                                    const payload = {
                                        name: resourceFormData.name,
                                        resource_group_id: resourceFormData.resource_group_id,
                                        experience_types: resourceFormData.experience_types,
                                        max_uses: Number(resourceFormData.max_uses) || 1,
                                        sort_order: Number(resourceFormData.sort_order) || 1,
                                        color: resourceFormData.color,
                                        icon: resourceFormData.icon
                                    };
                                    let success = false;
                                    try {
                                        const resp = await axios.put(`/api/resources/${selectedResource.id}`, payload);
                                        success = !!resp.data?.success;
                                    } catch (apiErr) {
                                        console.warn('Resources update API not available, mocking update');
                                    }
                                    if (!success) {
                                        const groupName = (resourceGroups.find(g => String(g.id) === String(payload.resource_group_id)) || {}).name || selectedResource.group;
                                        setResources(prev => prev.map(r => r.id === selectedResource.id ? {
                                            ...r,
                                            name: payload.name,
                                            group: groupName,
                                            experience_types: payload.experience_types,
                                            max_uses: payload.max_uses,
                                            sort_order: payload.sort_order,
                                            color: payload.color,
                                            icon: payload.icon
                                        } : r));
                                    } else {
                                        await fetchResources();
                                    }
                                    setShowEditResourceForm(false);
                                    setSelectedResource(null);
                                } catch (err) {
                                    alert('Error updating resource');
                                }
                            }}
                            className="voucher-form"
                        >
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Resource Name</label>
                                    <input
                                        type="text"
                                        value={resourceFormData.name}
                                        onChange={(e) => setResourceFormData({ ...resourceFormData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Display Color</label>
                                    <input
                                        type="color"
                                        value={resourceFormData.color}
                                        onChange={(e) => setResourceFormData({ ...resourceFormData, color: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Max Uses</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={resourceFormData.max_uses}
                                        onChange={(e) => setResourceFormData({ ...resourceFormData, max_uses: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Icon</label>
                                    <select
                                        value={resourceFormData.icon}
                                        onChange={(e) => setResourceFormData({ ...resourceFormData, icon: e.target.value })}
                                    >
                                        <option value="Generic">Generic</option>
                                        <option value="Anchor">Anchor</option>
                                        <option value="Balloon">Balloon</option>
                                        <option value="Vehicle">Vehicle</option>
                                        <option value="Equipment">Equipment</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Experience</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                        {experienceTypes.map(opt => (
                                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={resourceFormData.experience_types.includes(opt)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setResourceFormData(prev => {
                                                            const set = new Set(prev.experience_types);
                                                            if (checked) set.add(opt); else set.delete(opt);
                                                            return { ...prev, experience_types: Array.from(set) };
                                                        });
                                                    }}
                                                />
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Resource Group</label>
                                    <select
                                        value={resourceFormData.resource_group_id}
                                        onChange={(e) => setResourceFormData({ ...resourceFormData, resource_group_id: e.target.value })}
                                    >
                                        <option value="" disabled>Select group</option>
                                        {resourceGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Sort Order</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={resourceFormData.sort_order}
                                        onChange={(e) => setResourceFormData({ ...resourceFormData, sort_order: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <button
                                        type="button"
                                        className="btn btn-danger"
                                        onClick={async () => {
                                            if (!selectedResource) return;
                                            if (!window.confirm('Delete this resource?')) return;
                                            let success = false;
                                            try {
                                                const resp = await axios.delete(`/api/resources/${selectedResource.id}`);
                                                success = !!resp.data?.success;
                                            } catch (apiErr) {
                                                console.warn('Resources delete API not available, removing locally');
                                            }
                                            if (!success) {
                                                setResources(prev => prev.filter(r => r.id !== selectedResource.id));
                                            } else {
                                                await fetchResources();
                                            }
                                            setShowEditResourceForm(false);
                                            setSelectedResource(null);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                                <div>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditResourceForm(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Save</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Voucher Form Modal */}
            {(showCreateForm || showEditForm) && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 style={isMobile ? {
                                fontSize: '14px',
                                fontWeight: 600,
                                margin: 0
                            } : {
                                fontSize: '20px',
                                fontWeight: 600,
                                margin: 0,
                                color: '#1f2937'
                            }}>{showEditForm ? 'Edit Voucher Code' : 'Create New Voucher Code'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setShowEditForm(false);
                                    resetForm();
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {
                                    fontSize: '24px',
                                    width: '32px',
                                    height: '32px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="voucher-form" style={isMobile ? {
                            padding: '12px'
                        } : {
                            padding: '24px'
                        }}>
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Voucher Code *</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                                        placeholder="e.g., SUMMER2024"
                                        required
                                        disabled={showEditForm}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                        placeholder="e.g., Summer Special Discount"
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Valid From</label>
                                    <input
                                        type="date"
                                        value={formData.valid_from}
                                        onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '16px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Valid Until</label>
                                    <input
                                        type="date"
                                        value={formData.valid_until}
                                        onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '16px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Maximum Uses</label>
                                    <input
                                        type="number"
                                        value={formData.max_uses}
                                        onChange={(e) => setFormData({...formData, max_uses: e.target.value})}
                                        placeholder="Unlimited"
                                        min="1"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Status</label>
                                    <select
                                        value={formData.is_active}
                                        onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value={true}>Active</option>
                                        <option value={false}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-actions" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingTop: '12px',
                                marginTop: '12px',
                                borderTop: '1px solid #e5e7eb'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '20px'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowCreateForm(false);
                                    setShowEditForm(false);
                                    resetForm();
                                }} style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    {showEditForm ? 'Update Voucher Code' : 'Create Voucher Code'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Experience Form Modal */}
            {(showExperiencesForm || showEditExperienceForm) && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 style={isMobile ? {
                                fontSize: '14px',
                                fontWeight: 600,
                                margin: 0
                            } : {
                                fontSize: '20px',
                                fontWeight: 600,
                                margin: 0,
                                color: '#1f2937'
                            }}>{showEditExperienceForm ? 'Edit Experience' : 'Create New Experience'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowExperiencesForm(false);
                                    setShowEditExperienceForm(false);
                                    resetExperienceForm();
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {
                                    fontSize: '24px',
                                    width: '32px',
                                    height: '32px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleExperienceSubmit} className="experience-form" style={isMobile ? {
                            padding: '12px'
                        } : {
                            padding: '24px'
                        }}>
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Title *</label>
                                    <input
                                        type="text"
                                        value={experienceFormData.title}
                                        onChange={(e) => setExperienceFormData({...experienceFormData, title: e.target.value})}
                                        placeholder="e.g., Shared Flight"
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Max Passengers</label>
                                    <input
                                        type="number"
                                        value={experienceFormData.max_passengers}
                                        onChange={(e) => setExperienceFormData({...experienceFormData, max_passengers: parseInt(e.target.value)})}
                                        placeholder="8"
                                        min="1"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Description *</label>
                                <textarea
                                    value={experienceFormData.description}
                                    onChange={(e) => setExperienceFormData({...experienceFormData, description: e.target.value})}
                                    placeholder="Describe the experience..."
                                    rows={isMobile ? 3 : 4}
                                    required
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        minHeight: '70px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Experience Image</label>
                                <div style={isMobile ? {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    alignItems: 'stretch'
                                } : {
                                    display: 'flex',
                                    gap: '12px',
                                    alignItems: 'center',
                                    flexWrap: 'wrap'
                                }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setExperienceFormData({...experienceFormData, image_file: file});
                                            }
                                        }}
                                        style={isMobile ? {
                                            flex: 1,
                                            minWidth: '0',
                                            padding: '6px 8px',
                                            fontSize: '11px',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            flex: 1,
                                            minWidth: '200px',
                                            padding: '8px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {experienceFormData.image_url && (
                                        <>
                                            <div style={isMobile ? {
                                                fontSize: '10px',
                                                color: '#6b7280',
                                                wordBreak: 'break-word',
                                                padding: '6px',
                                                background: '#f9fafb',
                                                borderRadius: '4px'
                                            } : {
                                                fontSize: '12px',
                                                color: '#6b7280',
                                                flex: '1',
                                                minWidth: '200px',
                                                padding: '8px 12px',
                                                background: '#f9fafb',
                                                borderRadius: '6px',
                                                wordBreak: 'break-word'
                                            }}>
                                                Current: {experienceFormData.image_url}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
                                                        try {
                                                            await axios.delete(`/api/experiences/${selectedExperience.id}/image`);
                                                            setExperienceFormData({...experienceFormData, image_url: '', image_file: null});
                                                            alert('Image deleted successfully');
                                                            fetchExperiences();
                                                        } catch (error) {
                                                            console.error('Error deleting image:', error);
                                                            alert(error.response?.data?.message || 'Error deleting image');
                                                        }
                                                    }
                                                }}
                                                style={isMobile ? {
                                                    padding: '6px 10px',
                                                    backgroundColor: '#dc2626',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    fontWeight: '500',
                                                    width: '100%',
                                                    height: '32px',
                                                    boxSizing: 'border-box'
                                                } : {
                                                    padding: '8px 16px',
                                                    backgroundColor: '#dc2626',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseOver={!isMobile ? ((e) => e.target.style.backgroundColor = '#b91c1c') : undefined}
                                                onMouseOut={!isMobile ? ((e) => e.target.style.backgroundColor = '#dc2626') : undefined}
                                            >
                                                Delete Image
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Sort Order</label>
                                    <input
                                        type="number"
                                        value={experienceFormData.sort_order}
                                        onChange={(e) => setExperienceFormData({...experienceFormData, sort_order: parseInt(e.target.value)})}
                                        placeholder="0"
                                        min="0"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Status</label>
                                    <select
                                        value={experienceFormData.is_active}
                                        onChange={(e) => setExperienceFormData({...experienceFormData, is_active: e.target.value === 'true'})}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value={true}>Active</option>
                                        <option value={false}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-actions" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingTop: '12px',
                                marginTop: '12px',
                                borderTop: '1px solid #e5e7eb'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '20px'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowExperiencesForm(false);
                                    setShowEditExperienceForm(false);
                                    resetExperienceForm();
                                }} style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    {showEditExperienceForm ? 'Update Experience' : 'Create Experience'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Voucher Type Form Modal */}
            {(showVoucherTypesForm || showEditVoucherTypeForm) && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 style={isMobile ? {
                                fontSize: '14px',
                                fontWeight: 600,
                                margin: 0
                            } : {
                                fontSize: '20px',
                                fontWeight: 600,
                                margin: 0,
                                color: '#1f2937'
                            }}>{showEditVoucherTypeForm ? 'Edit Voucher Type' : 'Create New Voucher Type'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowVoucherTypesForm(false);
                                    setShowEditVoucherTypeForm(false);
                                    resetVoucherTypeForm();
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {
                                    fontSize: '24px',
                                    width: '32px',
                                    height: '32px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleVoucherTypeSubmit} className="voucher-type-form" style={isMobile ? {
                            padding: '12px'
                        } : {
                            padding: '24px'
                        }}>
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Title *</label>
                                    <input
                                        type="text"
                                        value={voucherTypeFormData.title}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, title: e.target.value})}
                                        placeholder="e.g., Weekday Morning"
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Description *</label>
                                    <textarea
                                        value={voucherTypeFormData.description}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, description: e.target.value})}
                                        placeholder="Detailed description of the voucher type..."
                                        rows={isMobile ? 2 : 3}
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            minHeight: '60px',
                                            resize: 'vertical',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            resize: 'vertical',
                                            boxSizing: 'border-box',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            </div>
                        
                        <div className="form-row" style={isMobile ? {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginBottom: '12px'
                        } : {
                            marginBottom: '20px'
                        }}>
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: 0
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Image Text Tag</label>
                                <input
                                    type="text"
                                    value={voucherTypeFormData.image_text_tag}
                                    onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, image_text_tag: e.target.value})}
                                    placeholder="e.g., 5★ on Google, TripAdvisor & Facebook"
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        height: '32px',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Max Passengers</label>
                                    <input
                                        type="number"
                                        value={voucherTypeFormData.max_passengers}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, max_passengers: e.target.value})}
                                        placeholder="8"
                                        min="1"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Validity (Months)</label>
                                    <input
                                        type="number"
                                        value={voucherTypeFormData.validity_months}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, validity_months: e.target.value})}
                                        placeholder="18"
                                        min="1"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Flight Days</label>
                                    <input
                                        type="text"
                                        value={voucherTypeFormData.flight_days}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, flight_days: e.target.value})}
                                        placeholder="e.g., Monday - Friday"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Flight Time</label>
                                    <select
                                        value={voucherTypeFormData.flight_time}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, flight_time: e.target.value})}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                        <option value="AM & PM">AM & PM</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Sort Order</label>
                                    <input
                                        type="number"
                                        value={voucherTypeFormData.sort_order}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, sort_order: e.target.value})}
                                        placeholder="0"
                                        min="0"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Status</label>
                                    <select
                                        value={voucherTypeFormData.is_active}
                                        onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, is_active: e.target.value === 'true'})}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value={true}>Active</option>
                                        <option value={false}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Features (JSON Array)</label>
                                <textarea
                                    value={voucherTypeFormData.features}
                                    onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, features: e.target.value})}
                                    placeholder='["Around 1 Hour of Air Time", "Complimentary Drink", "Inflight Photos and 3D Flight Track"]'
                                    rows={isMobile ? 2 : 2}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        minHeight: '60px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Terms & Conditions</label>
                                <textarea
                                    value={voucherTypeFormData.terms}
                                    onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, terms: e.target.value})}
                                    placeholder="Terms and conditions for this voucher type..."
                                    rows={isMobile ? 2 : 3}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        minHeight: '60px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setVoucherTypeFormData({...voucherTypeFormData, image_file: e.target.files[0]})}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '11px',
                                        height: '32px',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                {voucherTypeFormData.image_url && !voucherTypeFormData.image_file && (
                                    <div style={isMobile ? {
                                        fontSize: '10px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        wordBreak: 'break-word'
                                    } : {
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '8px',
                                        padding: '8px 12px',
                                        background: '#f9fafb',
                                        borderRadius: '6px',
                                        wordBreak: 'break-word'
                                    }}>
                                        Current image: {voucherTypeFormData.image_url}
                                    </div>
                                )}
                            </div>
                            
                            <div className="form-actions" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingTop: '12px',
                                marginTop: '12px',
                                borderTop: '1px solid #e5e7eb'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '20px'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowVoucherTypesForm(false);
                                    setShowEditVoucherTypeForm(false);
                                    resetVoucherTypeForm();
                                }} style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    {showEditVoucherTypeForm ? 'Update Voucher Type' : 'Create Voucher Type'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Private Charter Voucher Type Form Modal */}
            {(showPrivateCharterVoucherTypesForm || showEditPrivateCharterVoucherTypeForm) && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 style={isMobile ? {
                                fontSize: '14px',
                                fontWeight: 600,
                                margin: 0
                            } : {
                                fontSize: '20px',
                                fontWeight: 600,
                                margin: 0,
                                color: '#1f2937'
                            }}>{showEditPrivateCharterVoucherTypeForm ? 'Edit Private Charter Voucher Type' : 'Create New Private Charter Voucher Type'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowPrivateCharterVoucherTypesForm(false);
                                    setShowEditPrivateCharterVoucherTypeForm(false);
                                    resetPrivateCharterVoucherTypeForm();
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {
                                    fontSize: '24px',
                                    width: '32px',
                                    height: '32px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handlePrivateCharterVoucherTypeSubmit} className="private-charter-voucher-type-form" style={isMobile ? {
                            padding: '12px'
                        } : {
                            padding: '24px'
                        }}>
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Title *</label>
                                    <input
                                        type="text"
                                        value={privateCharterVoucherTypeFormData.title}
                                        onChange={(e) => setPrivateCharterVoucherTypeFormData({...privateCharterVoucherTypeFormData, title: e.target.value})}
                                        placeholder="e.g., Private Morning Charter"
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Max Passengers</label>
                                    <input
                                        type="number"
                                        value={privateCharterVoucherTypeFormData.max_passengers}
                                        onChange={(e) => setPrivateCharterVoucherTypeFormData({...privateCharterVoucherTypeFormData, max_passengers: parseInt(e.target.value)})}
                                        placeholder="8"
                                        min="1"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Validity (Months)</label>
                                    <input
                                        type="number"
                                        value={privateCharterVoucherTypeFormData.validity_months}
                                        onChange={(e) => setPrivateCharterVoucherTypeFormData({...privateCharterVoucherTypeFormData, validity_months: parseInt(e.target.value)})}
                                        placeholder="18"
                                        min="1"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Image Text Tag</label>
                                    <input
                                        type="text"
                                        value={privateCharterVoucherTypeFormData.image_text_tag}
                                        onChange={(e) => setPrivateCharterVoucherTypeFormData({ ...privateCharterVoucherTypeFormData, image_text_tag: e.target.value })}
                                        placeholder="e.g., 5★ on Google, TripAdvisor & Facebook"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Flight Days</label>
                                    <select
                                        value={privateCharterVoucherTypeFormData.flight_days}
                                        onChange={(e) => setPrivateCharterVoucherTypeFormData({...privateCharterVoucherTypeFormData, flight_days: e.target.value})}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="Any Day">Any Day</option>
                                        <option value="Monday - Friday">Monday - Friday</option>
                                        <option value="Weekends">Weekends</option>
                                        <option value="Monday - Sunday">Monday - Sunday</option>
                                    </select>
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Flight Time</label>
                                    <select
                                        value={privateCharterVoucherTypeFormData.flight_time}
                                        onChange={(e) => setPrivateCharterVoucherTypeFormData({...privateCharterVoucherTypeFormData, flight_time: e.target.value})}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="AM">AM (Morning)</option>
                                        <option value="PM">PM (Afternoon/Evening)</option>
                                        <option value="AM & PM">AM & PM (Flexible)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Sort Order</label>
                                    <input
                                        type="number"
                                        value={privateCharterVoucherTypeFormData.sort_order}
                                        onChange={(e) => setPrivateCharterVoucherTypeFormData({...privateCharterVoucherTypeFormData, sort_order: parseInt(e.target.value)})}
                                        placeholder="0"
                                        min="0"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Status</label>
                                    <select
                                        value={privateCharterVoucherTypeFormData.is_active ? 'true' : 'false'}
                                        onChange={(e) => {
                                            const newValue = e.target.value === 'true';
                                            console.log('Status changed from', privateCharterVoucherTypeFormData.is_active, 'to', newValue);
                                            setPrivateCharterVoucherTypeFormData({
                                                ...privateCharterVoucherTypeFormData, 
                                                is_active: newValue
                                            });
                                        }}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                    <div style={isMobile ? {
                                        fontSize: '10px',
                                        color: '#6b7280',
                                        marginTop: '4px'
                                    } : {
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '6px'
                                    }}>
                                        Current status: {privateCharterVoucherTypeFormData.is_active ? 'Active' : 'Inactive'}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Description *</label>
                                <textarea
                                    value={privateCharterVoucherTypeFormData.description}
                                    onChange={(e) => setPrivateCharterVoucherTypeFormData({...privateCharterVoucherTypeFormData, description: e.target.value})}
                                    placeholder="Describe the private charter experience..."
                                    rows={isMobile ? 3 : 4}
                                    required
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        minHeight: '70px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Features (JSON Array)</label>
                                <textarea
                                    value={privateCharterVoucherTypeFormData.features}
                                    onChange={(e) => setPrivateCharterVoucherTypeFormData({...privateCharterVoucherTypeFormData, features: e.target.value})}
                                    placeholder='["Private Balloon", "Flexible Timing", "Personalized Experience"]'
                                    rows={isMobile ? 2 : 2}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        minHeight: '60px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Terms & Conditions</label>
                                <textarea
                                    value={privateCharterVoucherTypeFormData.terms}
                                    onChange={(e) => setPrivateCharterVoucherTypeFormData({...privateCharterVoucherTypeFormData, terms: e.target.value})}
                                    placeholder="Terms and conditions for this private charter voucher type..."
                                    rows={isMobile ? 2 : 3}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        minHeight: '60px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setPrivateCharterVoucherTypeFormData({...privateCharterVoucherTypeFormData, image_file: e.target.files[0]})}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '11px',
                                        height: '32px',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                {privateCharterVoucherTypeFormData.image_url && !privateCharterVoucherTypeFormData.image_file && (
                                    <div style={isMobile ? {
                                        fontSize: '10px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        wordBreak: 'break-word'
                                    } : {
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '8px',
                                        padding: '8px 12px',
                                        background: '#f9fafb',
                                        borderRadius: '6px',
                                        wordBreak: 'break-word'
                                    }}>
                                        Current image: {privateCharterVoucherTypeFormData.image_url}
                                    </div>
                                )}
                            </div>
                            
                            <div className="form-actions" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingTop: '12px',
                                marginTop: '12px',
                                borderTop: '1px solid #e5e7eb'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '20px'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowPrivateCharterVoucherTypesForm(false);
                                    setShowEditPrivateCharterVoucherTypeForm(false);
                                    resetPrivateCharterVoucherTypeForm();
                                }} style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    {showEditPrivateCharterVoucherTypeForm ? 'Update Private Charter Voucher Type' : 'Create Private Charter Voucher Type'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Additional Information Question Form Modal */}
            {(showAdditionalInfoForm || showEditAdditionalInfoForm) && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 style={isMobile ? {
                                fontSize: '14px',
                                fontWeight: 600,
                                margin: 0
                            } : {
                                fontSize: '20px',
                                fontWeight: 600,
                                margin: 0,
                                color: '#1f2937'
                            }}>{showEditAdditionalInfoForm ? 'Edit Question' : 'Create New Question'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowAdditionalInfoForm(false);
                                    setShowEditAdditionalInfoForm(false);
                                    resetAdditionalInfoForm();
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {
                                    fontSize: '24px',
                                    width: '32px',
                                    height: '32px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleAdditionalInfoSubmit} className="additional-info-form" style={isMobile ? {
                            padding: '12px'
                        } : {
                            padding: '24px'
                        }}>
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Question Text *</label>
                                    <input
                                        type="text"
                                        value={additionalInfoFormData.question_text}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, question_text: e.target.value})}
                                        placeholder="e.g., How did you hear about us?"
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Question Type *</label>
                                    <select
                                        value={additionalInfoFormData.question_type}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, question_type: e.target.value})}
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="dropdown">Dropdown</option>
                                        <option value="text">Text Input</option>
                                        <option value="radio">Radio Buttons</option>
                                        <option value="checkbox">Checkbox</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Category</label>
                                    <select
                                        value={additionalInfoFormData.category}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, category: e.target.value})}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="General">General</option>
                                        <option value="Communication">Communication</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Experience">Experience</option>
                                        <option value="Special Requirements">Special Requirements</option>
                                    </select>
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Sort Order</label>
                                    <input
                                        type="number"
                                        value={additionalInfoFormData.sort_order}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, sort_order: e.target.value})}
                                        placeholder="0"
                                        min="0"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Required Field</label>
                                    <select
                                        value={additionalInfoFormData.is_required}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, is_required: e.target.value === 'true'})}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value={true}>Required</option>
                                    </select>
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Status</label>
                                    <select
                                        value={additionalInfoFormData.is_active}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, is_active: e.target.value === 'true'})}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value={true}>Active</option>
                                        <option value={false}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Journey Types *</label>
                                <div style={isMobile ? {
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '6px', 
                                    padding: '10px',
                                    background: '#f9fafb'
                                } : {
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '8px', 
                                    padding: '16px',
                                    background: '#f9fafb'
                                }}>
                                    <div style={isMobile ? {
                                        marginBottom: '8px',
                                        fontSize: '11px',
                                        color: '#374151'
                                    } : {
                                        marginBottom: '12px',
                                        fontSize: '14px',
                                        color: '#374151'
                                    }}>
                                        Select which journey types this question applies to:
                                    </div>
                                    {journeyTypes.map((journeyType) => (
                                        <label key={journeyType} style={isMobile ? {
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '6px',
                                            cursor: 'pointer'
                                        } : {
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
                                                style={isMobile ? {
                                                    marginRight: '6px',
                                                    width: '14px',
                                                    height: '14px'
                                                } : {
                                                    marginRight: '8px',
                                                    width: '18px',
                                                    height: '18px',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                            <span style={isMobile ? {
                                                fontSize: '11px',
                                                color: '#374151'
                                            } : {
                                                fontSize: '14px',
                                                color: '#374151'
                                            }}>{journeyType}</span>
                                        </label>
                                    ))}
                                    {additionalInfoFormData.journey_types.length === 0 && (
                                        <div style={isMobile ? {
                                            fontSize: '10px',
                                            color: '#ef4444',
                                            marginTop: '6px'
                                        } : {
                                            fontSize: '12px',
                                            color: '#ef4444',
                                            marginTop: '8px'
                                        }}>
                                            Please select at least one journey type.
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Locations *</label>
                                <div style={isMobile ? {
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '6px', 
                                    padding: '10px',
                                    background: '#f9fafb'
                                } : {
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '8px', 
                                    padding: '16px',
                                    background: '#f9fafb'
                                }}>
                                    <div style={isMobile ? {
                                        marginBottom: '8px',
                                        fontSize: '11px',
                                        color: '#374151'
                                    } : {
                                        marginBottom: '12px',
                                        fontSize: '14px',
                                        color: '#374151'
                                    }}>
                                        Select which locations this question applies to:
                                    </div>
                                    {activityLocations.map((location) => (
                                        <label key={location} style={isMobile ? {
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '6px',
                                            cursor: 'pointer'
                                        } : {
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '8px',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={additionalInfoFormData.locations.includes(location)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setAdditionalInfoFormData({
                                                            ...additionalInfoFormData,
                                                            locations: [...additionalInfoFormData.locations, location]
                                                        });
                                                    } else {
                                                        setAdditionalInfoFormData({
                                                            ...additionalInfoFormData,
                                                            locations: additionalInfoFormData.locations.filter(loc => loc !== location)
                                                        });
                                                    }
                                                }}
                                                style={isMobile ? {
                                                    marginRight: '6px',
                                                    width: '14px',
                                                    height: '14px'
                                                } : {
                                                    marginRight: '8px',
                                                    width: '18px',
                                                    height: '18px',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                            <span style={isMobile ? {
                                                fontSize: '11px',
                                                color: '#374151'
                                            } : {
                                                fontSize: '14px',
                                                color: '#374151'
                                            }}>{location}</span>
                                        </label>
                                    ))}
                                    {additionalInfoFormData.locations.length === 0 && (
                                        <div style={isMobile ? {
                                            fontSize: '10px',
                                            color: '#ef4444',
                                            marginTop: '6px'
                                        } : {
                                            fontSize: '12px',
                                            color: '#ef4444',
                                            marginTop: '8px'
                                        }}>
                                            Please select at least one location.
                                        </div>
                                            )}
                                </div>
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Experience Types *</label>
                                <div style={isMobile ? {
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '6px', 
                                    padding: '10px',
                                    background: '#f9fafb'
                                } : {
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '8px', 
                                    padding: '16px',
                                    background: '#f9fafb'
                                }}>
                                    <div style={isMobile ? {
                                        marginBottom: '8px',
                                        fontSize: '11px',
                                        color: '#374151'
                                    } : {
                                        marginBottom: '12px',
                                        fontSize: '14px',
                                        color: '#374151'
                                    }}>
                                        Select which experience types this question applies to:
                                    </div>
                                    {experienceTypes.map((experienceType) => (
                                        <label key={experienceType} style={isMobile ? {
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '6px',
                                            cursor: 'pointer'
                                        } : {
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '8px',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={additionalInfoFormData.experience_types.includes(experienceType)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setAdditionalInfoFormData({
                                                            ...additionalInfoFormData,
                                                            experience_types: [...additionalInfoFormData.experience_types, experienceType]
                                                        });
                                                    } else {
                                                        setAdditionalInfoFormData({
                                                            ...additionalInfoFormData,
                                                            experience_types: additionalInfoFormData.experience_types.filter(exp => exp !== experienceType)
                                                        });
                                                    }
                                                }}
                                                style={isMobile ? {
                                                    marginRight: '6px',
                                                    width: '14px',
                                                    height: '14px'
                                                } : {
                                                    marginRight: '8px',
                                                    width: '18px',
                                                    height: '18px',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                            <span style={isMobile ? {
                                                fontSize: '11px',
                                                color: '#374151'
                                            } : {
                                                fontSize: '14px',
                                                color: '#374151'
                                            }}>{experienceType}</span>
                                        </label>
                                    ))}
                                    {additionalInfoFormData.experience_types.length === 0 && (
                                        <div style={isMobile ? {
                                            fontSize: '10px',
                                            color: '#ef4444',
                                            marginTop: '6px'
                                        } : {
                                            fontSize: '12px',
                                            color: '#ef4444',
                                            marginTop: '8px'
                                        }}>
                                            Please select at least one experience type.
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {(additionalInfoFormData.question_type === 'dropdown' || additionalInfoFormData.question_type === 'radio' || additionalInfoFormData.question_type === 'checkbox') && (
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    marginBottom: '20px'
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Options (JSON array)</label>
                                    <textarea
                                        value={additionalInfoFormData.options}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, options: e.target.value})}
                                        placeholder='["Option 1", "Option 2", "Option 3"]'
                                        rows={isMobile ? 2 : 3}
                                        style={isMobile ? {
                                            fontFamily: 'monospace',
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            minHeight: '60px',
                                            resize: 'vertical',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            resize: 'vertical',
                                            fontFamily: 'monospace',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <div style={isMobile ? {
                                        fontSize: '10px',
                                        color: '#6b7280',
                                        marginTop: '4px'
                                    } : {
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '4px'
                                    }}>
                                        Enter options as a JSON array. Example: ["Yes", "No", "Maybe"]
                                    </div>
                                </div>
                            )}
                            
                            {additionalInfoFormData.question_type === 'text' && (
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    marginBottom: '20px'
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Placeholder Text</label>
                                    <input
                                        type="text"
                                        value={additionalInfoFormData.placeholder_text}
                                        onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, placeholder_text: e.target.value})}
                                        placeholder="e.g., Please enter your special requirements..."
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            )}
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Help Text</label>
                                <textarea
                                    value={additionalInfoFormData.help_text}
                                    onChange={(e) => setAdditionalInfoFormData({...additionalInfoFormData, help_text: e.target.value})}
                                    placeholder="Additional help text to display below the question..."
                                    rows={isMobile ? 2 : 2}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        minHeight: '60px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            
                            <div className="form-actions" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingTop: '12px',
                                marginTop: '12px',
                                borderTop: '1px solid #e5e7eb'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '20px'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowAdditionalInfoForm(false);
                                    setShowEditAdditionalInfoForm(false);
                                    resetAdditionalInfoForm();
                                }} style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    {showEditAdditionalInfoForm ? 'Update Question' : 'Create Question'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Add to Booking Item Form Modal */}
            {(showAddToBookingForm || showEditAddToBookingForm) && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 style={isMobile ? {
                                fontSize: '14px',
                                fontWeight: 600,
                                margin: 0
                            } : {
                                fontSize: '20px',
                                fontWeight: 600,
                                margin: 0,
                                color: '#1f2937'
                            }}>{showEditAddToBookingForm ? 'Edit Add to Booking Item' : 'Create New Add to Booking Item'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowAddToBookingForm(false);
                                    setShowEditAddToBookingForm(false);
                                    resetAddToBookingForm();
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {
                                    fontSize: '24px',
                                    width: '32px',
                                    height: '32px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddToBookingSubmit} className="add-to-booking-form" style={isMobile ? {
                            padding: '12px'
                        } : {
                            padding: '24px'
                        }}>
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Title *</label>
                                    <input
                                        type="text"
                                        value={addToBookingFormData.title}
                                        onChange={(e) => setAddToBookingFormData({...addToBookingFormData, title: e.target.value})}
                                        placeholder="e.g., FAB Cap, FAB Mug"
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Price *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={addToBookingFormData.price}
                                        onChange={(e) => setAddToBookingFormData({...addToBookingFormData, price: e.target.value})}
                                        placeholder="e.g., 20.00"
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Price Unit</label>
                                    <select
                                        value={addToBookingFormData.price_unit}
                                        onChange={(e) => setAddToBookingFormData({...addToBookingFormData, price_unit: e.target.value})}
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            width: '100%',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="fixed">Fixed Price</option>
                                        <option value="pp">Per Person</option>
                                    </select>
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Sort Order</label>
                                    <input
                                        type="number"
                                        value={addToBookingFormData.sort_order}
                                        onChange={(e) => setAddToBookingFormData({...addToBookingFormData, sort_order: e.target.value})}
                                        placeholder="0"
                                        min="0"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Description *</label>
                                <textarea
                                    value={addToBookingFormData.description}
                                    onChange={(e) => setAddToBookingFormData({...addToBookingFormData, description: e.target.value})}
                                    placeholder="Detailed description of the item..."
                                    rows={isMobile ? 3 : 4}
                                    required
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        minHeight: '70px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setAddToBookingFormData({...addToBookingFormData, image_file: e.target.files[0]})}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '11px',
                                        height: '32px',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                {addToBookingFormData.image_url && !addToBookingFormData.image_file && (
                                    <div style={isMobile ? {
                                        fontSize: '10px',
                                        color: '#6b7280',
                                        marginTop: '4px',
                                        wordBreak: 'break-word'
                                    } : {
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        marginTop: '8px',
                                        padding: '8px 12px',
                                        background: '#f9fafb',
                                        borderRadius: '6px',
                                        wordBreak: 'break-word'
                                    }}>
                                        Current image: {addToBookingFormData.image_url}
                                    </div>
                                )}
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Status</label>
                                <select
                                    value={addToBookingFormData.is_active}
                                    onChange={(e) => setAddToBookingFormData({...addToBookingFormData, is_active: e.target.value === 'true'})}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        width: '100%',
                                        height: '32px',
                                        boxSizing: 'border-box'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value={true}>Active</option>
                                    <option value={false}>Inactive</option>
                                </select>
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Journey Types *</label>
                                <div style={isMobile ? {
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '6px', 
                                    padding: '10px',
                                    background: '#f9fafb'
                                } : {
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '8px', 
                                    padding: '16px',
                                    background: '#f9fafb'
                                }}>
                                    <div style={isMobile ? {
                                        marginBottom: '8px',
                                        fontSize: '11px',
                                        color: '#374151'
                                    } : {
                                        marginBottom: '12px',
                                        fontSize: '14px',
                                        color: '#374151'
                                    }}>
                                        Select which journey types this item applies to:
                                    </div>
                                    {journeyTypes.map((journeyType) => (
                                        <label key={journeyType} style={isMobile ? {
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '6px',
                                            cursor: 'pointer'
                                        } : {
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
                                                style={isMobile ? {
                                                    marginRight: '6px',
                                                    width: '14px',
                                                    height: '14px'
                                                } : {
                                                    marginRight: '8px',
                                                    width: '18px',
                                                    height: '18px',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                            <span style={isMobile ? {
                                                fontSize: '11px',
                                                color: '#374151'
                                            } : {
                                                fontSize: '14px',
                                                color: '#374151'
                                            }}>{journeyType}</span>
                                        </label>
                                    ))}
                                    {addToBookingFormData.journey_types.length === 0 && (
                                        <div style={isMobile ? {
                                            fontSize: '10px',
                                            color: '#ef4444',
                                            marginTop: '6px'
                                        } : {
                                            fontSize: '12px',
                                            color: '#ef4444',
                                            marginTop: '8px'
                                        }}>
                                            Please select at least one journey type.
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Locations *</label>
                                <div style={isMobile ? {
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '6px', 
                                    padding: '10px',
                                    background: '#f9fafb'
                                } : {
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '8px', 
                                    padding: '16px',
                                    background: '#f9fafb'
                                }}>
                                    <div style={isMobile ? {
                                        marginBottom: '8px',
                                        fontSize: '11px',
                                        color: '#374151'
                                    } : {
                                        marginBottom: '12px',
                                        fontSize: '14px',
                                        color: '#374151'
                                    }}>
                                        Select which locations this item applies to:
                                    </div>
                                    {activityLocations.map((location) => (
                                        <label key={location} style={isMobile ? {
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '6px',
                                            cursor: 'pointer'
                                        } : {
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '8px',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={addToBookingFormData.locations.includes(location)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setAddToBookingFormData({
                                                            ...addToBookingFormData,
                                                            locations: [...addToBookingFormData.locations, location]
                                                        });
                                                    } else {
                                                        setAddToBookingFormData({
                                                            ...addToBookingFormData,
                                                            locations: addToBookingFormData.locations.filter(loc => loc !== location)
                                                        });
                                                    }
                                                }}
                                                style={isMobile ? {
                                                    marginRight: '6px',
                                                    width: '14px',
                                                    height: '14px'
                                                } : {
                                                    marginRight: '8px',
                                                    width: '18px',
                                                    height: '18px',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                            <span style={isMobile ? {
                                                fontSize: '11px',
                                                color: '#374151'
                                            } : {
                                                fontSize: '14px',
                                                color: '#374151'
                                            }}>{location}</span>
                                        </label>
                                    ))}
                                    {addToBookingFormData.locations.length === 0 && (
                                        <div style={isMobile ? {
                                            fontSize: '10px',
                                            color: '#ef4444',
                                            marginTop: '6px'
                                        } : {
                                            fontSize: '12px',
                                            color: '#ef4444',
                                            marginTop: '8px'
                                        }}>
                                            Please select at least one location.
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Experience Types Section */}
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Experience Types *</label>
                                <div style={isMobile ? {
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '6px', 
                                    padding: '10px',
                                    backgroundColor: '#f9fafb'
                                } : {
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '8px', 
                                    padding: '16px',
                                    backgroundColor: '#f9fafb'
                                }}>
                                    <div style={isMobile ? {
                                        fontSize: '11px',
                                        color: '#6b7280',
                                        marginBottom: '8px'
                                    } : {
                                        fontSize: '14px',
                                        color: '#6b7280',
                                        marginBottom: '12px'
                                    }}>
                                        Select which experience types this item applies to:
                                    </div>
                                    {experienceTypes.map((experienceType) => (
                                        <label key={experienceType} style={isMobile ? {
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '6px',
                                            cursor: 'pointer'
                                        } : {
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '8px',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={addToBookingFormData.experience_types.includes(experienceType)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setAddToBookingFormData({
                                                            ...addToBookingFormData,
                                                            experience_types: [...addToBookingFormData.experience_types, experienceType]
                                                        });
                                                    } else {
                                                        setAddToBookingFormData({
                                                            ...addToBookingFormData,
                                                            experience_types: addToBookingFormData.experience_types.filter(exp => exp !== experienceType)
                                                        });
                                                    }
                                                }}
                                                style={isMobile ? {
                                                    marginRight: '6px',
                                                    width: '14px',
                                                    height: '14px'
                                                } : {
                                                    marginRight: '8px',
                                                    width: '18px',
                                                    height: '18px',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                            <span style={isMobile ? {
                                                fontSize: '11px',
                                                color: '#374151'
                                            } : {
                                                fontSize: '14px',
                                                color: '#374151'
                                            }}>{experienceType}</span>
                                        </label>
                                    ))}
                                    {addToBookingFormData.experience_types.length === 0 && (
                                        <div style={isMobile ? {
                                            fontSize: '10px',
                                            color: '#ef4444',
                                            marginTop: '6px'
                                        } : {
                                            fontSize: '12px',
                                            color: '#ef4444',
                                            marginTop: '8px'
                                        }}>
                                            Please select at least one experience type.
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="form-actions" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingTop: '12px',
                                marginTop: '12px',
                                borderTop: '1px solid #e5e7eb'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '20px'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowAddToBookingForm(false);
                                    setShowEditAddToBookingForm(false);
                                    resetAddToBookingForm();
                                }} style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    {showEditAddToBookingForm ? 'Update Item' : 'Create Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Terms & Conditions Form Modal (includes Passenger Information terms) */}
            {(showTermsForm || showEditTermsForm || showPassengerTermsForm || showEditPassengerTermsForm) && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 style={isMobile ? {
                                fontSize: '14px',
                                fontWeight: 600,
                                margin: 0
                            } : {
                                fontSize: '20px',
                                fontWeight: 600,
                                margin: 0,
                                color: '#1f2937'
                            }}>{
                                showPassengerTermsForm
                                    ? 'Create Terms & Conditions for Passenger Information'
                                    : showEditPassengerTermsForm
                                        ? 'Edit Terms & Conditions for Passenger Information'
                                        : (showEditTermsForm ? 'Edit Terms & Conditions' : 'Create New Terms & Conditions')
                            }</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowTermsForm(false);
                                    setShowEditTermsForm(false);
                                    setShowPassengerTermsForm(false);
                                    setShowEditPassengerTermsForm(false);
                                    resetTermsForm();
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {
                                    fontSize: '24px',
                                    width: '32px',
                                    height: '32px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={(showPassengerTermsForm || showEditPassengerTermsForm) ? handlePassengerTermsSubmit : handleTermsSubmit} className="terms-form" style={isMobile ? {
                            padding: '12px'
                        } : {
                            padding: '24px'
                        }}>
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Title *</label>
                                    <input
                                        type="text"
                                        value={(showPassengerTermsForm || showEditPassengerTermsForm) ? passengerTermsFormData.title : termsFormData.title}
                                        onChange={(e) => {
                                            if (showPassengerTermsForm || showEditPassengerTermsForm) {
                                                setPassengerTermsFormData({ ...passengerTermsFormData, title: e.target.value });
                                            } else {
                                                setTermsFormData({ ...termsFormData, title: e.target.value });
                                            }
                                        }}
                                        placeholder="e.g., Weekday Morning Terms, Any Day Flight Terms"
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Sort Order</label>
                                    <input
                                        type="number"
                                        value={(showPassengerTermsForm || showEditPassengerTermsForm) ? passengerTermsFormData.sort_order : termsFormData.sort_order}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (showPassengerTermsForm || showEditPassengerTermsForm) {
                                                setPassengerTermsFormData({ ...passengerTermsFormData, sort_order: val });
                                            } else {
                                                setTermsFormData({ ...termsFormData, sort_order: val });
                                            }
                                        }}
                                        placeholder="0"
                                        min="0"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Content *</label>
                                <textarea
                                    value={(showPassengerTermsForm || showEditPassengerTermsForm) ? passengerTermsFormData.content : termsFormData.content}
                                    onChange={(e) => {
                                        if (showPassengerTermsForm || showEditPassengerTermsForm) {
                                            setPassengerTermsFormData({ ...passengerTermsFormData, content: e.target.value });
                                        } else {
                                            setTermsFormData({ ...termsFormData, content: e.target.value });
                                        }
                                    }}
                                    placeholder="Enter the terms and conditions text content..."
                                    rows={isMobile ? 5 : 8}
                                    required
                                    style={isMobile ? {
                                        fontFamily: 'inherit',
                                        lineHeight: '1.5',
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        minHeight: '120px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        width: '100%'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                        lineHeight: '1.5',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <div style={isMobile ? {
                                    fontSize: '10px',
                                    color: '#6b7280',
                                    marginTop: '4px'
                                } : {
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    marginTop: '4px'
                                }}>
                                    Use \n for line breaks. This content will be displayed in the balloning-book Terms & Conditions section.
                                </div>
                            </div>
                            
                            {!(showPassengerTermsForm || showEditPassengerTermsForm) ? (
                                // Original experiences/voucher type UI for regular Terms & Conditions
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    marginBottom: '20px'
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Experiences *</label>
                                    <div style={isMobile ? {
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        background: '#f9fafb'
                                    } : {
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        background: '#f9fafb'
                                    }}>
                                        <div style={isMobile ? {
                                            marginBottom: '8px',
                                            fontSize: '11px',
                                            color: '#374151'
                                        } : {
                                            marginBottom: '12px',
                                            fontSize: '14px',
                                            color: '#374151'
                                        }}>
                                            Select which experiences these terms apply to:
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '8px' }}>
                                            {experiences.map((experience) => (
                                                <label key={experience.id} style={isMobile ? {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    cursor: 'pointer'
                                                } : {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={termsFormData.experience_ids && termsFormData.experience_ids.includes(experience.id)}
                                                        onChange={(e) => {
                                                            const experienceId = experience.id;
                                                            const currentExperienceIds = termsFormData.experience_ids || [];
                                                            const newExperienceIds = e.target.checked
                                                                ? [...currentExperienceIds, experienceId]
                                                                : currentExperienceIds.filter(id => id !== experienceId);
                                                            setTermsFormData({ ...termsFormData, experience_ids: newExperienceIds });
                                                            if (experience.title === 'Shared Flight') {
                                                                setTermsFormData(prev => ({ ...prev, showVoucherTypes: e.target.checked }));
                                                            } else if (experience.title === 'Private Charter') {
                                                                setTermsFormData(prev => ({ ...prev, showPrivateVoucherTypes: e.target.checked }));
                                                            }
                                                        }}
                                                        style={isMobile ? {
                                                            width: '14px',
                                                            height: '14px'
                                                        } : {
                                                            width: '18px',
                                                            height: '18px',
                                                            cursor: 'pointer'
                                                        }}
                                                    />
                                                    <span style={isMobile ? {
                                                        fontSize: '11px',
                                                        color: '#374151'
                                                    } : {
                                                        fontSize: '14px',
                                                        color: '#374151'
                                                    }}>{experience.title}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {experiences.length === 0 && (
                                            <div style={isMobile ? {
                                                color: '#9ca3af',
                                                fontSize: '10px',
                                                fontStyle: 'italic',
                                                marginTop: '6px'
                                            } : {
                                                color: '#9ca3af',
                                                fontSize: '14px',
                                                fontStyle: 'italic',
                                                marginTop: '8px'
                                            }}>
                                                No experiences available. Please create experiences first.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // Passenger Information: Journey Types (Flight Types)
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    marginBottom: '20px'
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Flight Type *</label>
                                    <div style={isMobile ? {
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        background: '#f9fafb'
                                    } : {
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        background: '#f9fafb'
                                    }}>
                                        <div style={isMobile ? {
                                            marginBottom: '8px',
                                            fontSize: '11px',
                                            color: '#374151'
                                        } : {
                                            marginBottom: '12px',
                                            fontSize: '14px',
                                            color: '#374151'
                                        }}>
                                            Select which flight types these terms apply to:
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 8 }}>
                                            {journeyTypes.map((label) => (
                                                <label key={label} style={isMobile ? {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    cursor: 'pointer'
                                                } : {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={Array.isArray(passengerTermsFormData.journey_types) && passengerTermsFormData.journey_types.includes(label)}
                                                        onChange={(e) => {
                                                            const current = passengerTermsFormData.journey_types || [];
                                                            const updated = e.target.checked
                                                                ? [...current, label]
                                                                : current.filter((x) => x !== label);
                                                            setPassengerTermsFormData({ ...passengerTermsFormData, journey_types: updated });
                                                        }}
                                                        style={isMobile ? {
                                                            width: '14px',
                                                            height: '14px'
                                                        } : {
                                                            width: '18px',
                                                            height: '18px',
                                                            cursor: 'pointer'
                                                        }}
                                                    />
                                                    <span style={isMobile ? {
                                                        fontSize: '11px',
                                                        color: '#374151'
                                                    } : {
                                                        fontSize: '14px',
                                                        color: '#374151'
                                                    }}>{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Voucher Types - only show when Shared Flight is selected */}
                            {!(showPassengerTermsForm || showEditPassengerTermsForm) && termsFormData.showVoucherTypes && (
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    marginBottom: '20px'
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Voucher Types *</label>
                                    <div style={isMobile ? {
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        background: '#f9fafb'
                                    } : {
                                        border: '1px solid #d1d5db', 
                                        borderRadius: '8px', 
                                        padding: '16px',
                                        background: '#f9fafb'
                                    }}>
                                        <div style={isMobile ? {
                                            marginBottom: '8px',
                                            fontSize: '11px',
                                            color: '#374151'
                                        } : {
                                            marginBottom: '12px',
                                            fontSize: '14px',
                                            color: '#374151'
                                        }}>
                                            Select which voucher type these terms apply to:
                                        </div>
                                        <select
                                            value={Array.isArray(termsFormData.voucher_type_ids) && termsFormData.voucher_type_ids.length > 0 ? String(termsFormData.voucher_type_ids[0]) : ''}
                                            onChange={(e) => {
                                                const selectedId = e.target.value ? Number(e.target.value) : null;
                                                setTermsFormData({
                                                    ...termsFormData,
                                                    voucher_type_ids: selectedId ? [selectedId] : []
                                                });
                                            }}
                                            style={isMobile ? {
                                                width: '100%',
                                                padding: '6px 8px',
                                                fontSize: '13px',
                                                borderRadius: '4px',
                                                border: '1px solid #d1d5db',
                                                background: '#fff',
                                                height: '32px',
                                                boxSizing: 'border-box'
                                            } : {
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                backgroundColor: '#fff',
                                                cursor: 'pointer',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <option value="">Select a voucher type</option>
                                            {voucherTypes.map((voucherType) => (
                                                <option key={voucherType.id} value={String(voucherType.id)}>
                                                    {voucherType.title}
                                                </option>
                                            ))}
                                        </select>
                                        {voucherTypes.length === 0 && (
                                            <div style={isMobile ? {
                                                color: '#9ca3af',
                                                fontSize: '10px',
                                                fontStyle: 'italic',
                                                marginTop: '6px'
                                            } : {
                                                color: '#9ca3af',
                                                fontSize: '14px',
                                                fontStyle: 'italic',
                                                marginTop: '8px'
                                            }}>
                                                No voucher types available. Please create voucher types first.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Private Voucher Types - only show when Private Charter is selected */}
                            {!(showPassengerTermsForm || showEditPassengerTermsForm) && termsFormData.showPrivateVoucherTypes && (
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    marginBottom: '20px'
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Private Voucher Types</label>
                                    <div style={isMobile ? {
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        background: '#f9fafb'
                                    } : {
                                        border: '1px solid #d1d5db', 
                                        borderRadius: '8px', 
                                        padding: '16px',
                                        background: '#f9fafb'
                                    }}>
                                        <div style={isMobile ? {
                                            marginBottom: '8px',
                                            fontSize: '11px',
                                            color: '#374151'
                                        } : {
                                            marginBottom: '12px',
                                            fontSize: '14px',
                                            color: '#374151'
                                        }}>
                                            Select which private charter voucher types these terms apply to:
                                        </div>
                                        <select
                                            value={Array.isArray(termsFormData.private_voucher_type_ids) && termsFormData.private_voucher_type_ids.length > 0 ? String(termsFormData.private_voucher_type_ids[0]) : ''}
                                            onChange={(e) => {
                                                const selectedId = e.target.value ? Number(e.target.value) : null;
                                                console.log('Private Voucher Types dropdown changed:', {
                                                    selectedId,
                                                    currentValue: e.target.value,
                                                    currentState: termsFormData.private_voucher_type_ids
                                                });
                                                setTermsFormData({
                                                    ...termsFormData,
                                                    private_voucher_type_ids: selectedId ? [selectedId] : []
                                                });
                                            }}
                                            style={isMobile ? {
                                                width: '100%',
                                                padding: '6px 8px',
                                                fontSize: '13px',
                                                borderRadius: '4px',
                                                border: '1px solid #d1d5db',
                                                background: '#fff',
                                                height: '32px',
                                                boxSizing: 'border-box'
                                            } : {
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                backgroundColor: '#fff',
                                                cursor: 'pointer',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <option value="">Select a private charter voucher type</option>
                                            {privateCharterVoucherTypes.map((voucherType) => (
                                                <option key={voucherType.id} value={String(voucherType.id)}>
                                                    {voucherType.title}
                                                </option>
                                            ))}
                                        </select>
                                        {privateCharterVoucherTypes.length === 0 && (
                                            <div style={isMobile ? {
                                                color: '#9ca3af',
                                                fontSize: '10px',
                                                fontStyle: 'italic',
                                                marginTop: '6px'
                                            } : {
                                                color: '#9ca3af',
                                                fontSize: '14px',
                                                fontStyle: 'italic',
                                                marginTop: '8px'
                                            }}>
                                                No private charter voucher types available. Please create private charter voucher types first.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Status</label>
                                <select
                                    value={termsFormData.is_active}
                                    onChange={(e) => setTermsFormData({...termsFormData, is_active: e.target.value === 'true'})}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        width: '100%',
                                        height: '32px',
                                        boxSizing: 'border-box'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value={true}>Active</option>
                                    <option value={false}>Inactive</option>
                                </select>
                            </div>
                            
                            <div className="form-actions" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingTop: '12px',
                                marginTop: '12px',
                                borderTop: '1px solid #e5e7eb'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '20px'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowTermsForm(false);
                                    setShowEditTermsForm(false);
                                    resetTermsForm();
                                }} style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    {showEditTermsForm ? 'Update Terms' : 'Create Terms'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Crew Form Modal */}
            {(showCrewForm || showEditCrewForm) && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 style={isMobile ? {
                                fontSize: '14px',
                                fontWeight: 600,
                                margin: 0
                            } : {
                                fontSize: '20px',
                                fontWeight: 600,
                                margin: 0,
                                color: '#1f2937'
                            }}>{showEditCrewForm ? 'Edit Crew Member' : 'Add New Crew Member'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowCrewForm(false);
                                    setShowEditCrewForm(false);
                                    resetCrewForm();
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {
                                    fontSize: '24px',
                                    width: '32px',
                                    height: '32px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleCrewSubmit} className="crew-form" style={isMobile ? {
                            padding: '12px'
                        } : {
                            padding: '24px'
                        }}>
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>First Name *</label>
                                    <input
                                        type="text"
                                        value={crewFormData.first_name}
                                        onChange={(e) => setCrewFormData({...crewFormData, first_name: e.target.value})}
                                        placeholder="e.g., John"
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Last Name *</label>
                                    <input
                                        type="text"
                                        value={crewFormData.last_name}
                                        onChange={(e) => setCrewFormData({...crewFormData, last_name: e.target.value})}
                                        placeholder="e.g., Smith"
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Email</label>
                                    <input
                                        type="email"
                                        value={crewFormData.email}
                                        onChange={(e) => setCrewFormData({...crewFormData, email: e.target.value})}
                                        placeholder="e.g., john.smith@example.com"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={crewFormData.phone}
                                        onChange={(e) => setCrewFormData({...crewFormData, phone: e.target.value})}
                                        placeholder="e.g., +44 123 456 7890"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Status</label>
                                <select
                                    value={crewFormData.is_active}
                                    onChange={(e) => setCrewFormData({...crewFormData, is_active: e.target.value === 'true'})}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        width: '100%',
                                        height: '32px',
                                        boxSizing: 'border-box'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value={true}>Active</option>
                                    <option value={false}>Inactive</option>
                                </select>
                            </div>
                            
                            <div className="form-actions" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingTop: '12px',
                                marginTop: '12px',
                                borderTop: '1px solid #e5e7eb'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '20px'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowCrewForm(false);
                                    setShowEditCrewForm(false);
                                    resetCrewForm();
                                }} style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    {showEditCrewForm ? 'Update Crew Member' : 'Add Crew Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pilot Form Modal */}
            {(showPilotForm || showEditPilotForm) && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 style={isMobile ? {
                                fontSize: '14px',
                                fontWeight: 600,
                                margin: 0
                            } : {
                                fontSize: '20px',
                                fontWeight: 600,
                                margin: 0,
                                color: '#1f2937'
                            }}>{showEditPilotForm ? 'Edit Pilot Member' : 'Add New Pilot Member'}</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowPilotForm(false);
                                    setShowEditPilotForm(false);
                                    resetPilotForm();
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {
                                    fontSize: '24px',
                                    width: '32px',
                                    height: '32px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handlePilotSubmit} className="crew-form" style={isMobile ? {
                            padding: '12px'
                        } : {
                            padding: '24px'
                        }}>
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>First Name *</label>
                                    <input
                                        type="text"
                                        value={pilotFormData.first_name}
                                        onChange={(e) => setPilotFormData({...pilotFormData, first_name: e.target.value})}
                                        placeholder="e.g., John"
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Last Name *</label>
                                    <input
                                        type="text"
                                        value={pilotFormData.last_name}
                                        onChange={(e) => setPilotFormData({...pilotFormData, last_name: e.target.value})}
                                        placeholder="e.g., Smith"
                                        required
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '12px'
                            } : {
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Email</label>
                                    <input
                                        type="email"
                                        value={pilotFormData.email}
                                        onChange={(e) => setPilotFormData({...pilotFormData, email: e.target.value})}
                                        placeholder="e.g., john.smith@example.com"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                
                                <div className="form-group" style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    flex: 1,
                                    marginBottom: 0
                                }}>
                                    <label style={isMobile ? {
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: '14px'
                                    }}>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={pilotFormData.phone}
                                        onChange={(e) => setPilotFormData({...pilotFormData, phone: e.target.value})}
                                        placeholder="e.g., +44 123 456 7890"
                                        style={isMobile ? {
                                            padding: '6px 8px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            height: '32px',
                                            boxSizing: 'border-box',
                                            width: '100%'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group" style={isMobile ? {
                                marginBottom: '12px'
                            } : {
                                marginBottom: '20px'
                            }}>
                                <label style={isMobile ? {
                                    fontSize: '11px',
                                    marginBottom: '4px',
                                    fontWeight: 600
                                } : {
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    fontSize: '14px'
                                }}>Status</label>
                                <select
                                    value={pilotFormData.is_active}
                                    onChange={(e) => setPilotFormData({...pilotFormData, is_active: e.target.value === 'true'})}
                                    style={isMobile ? {
                                        padding: '6px 8px',
                                        fontSize: '13px',
                                        borderRadius: '4px',
                                        width: '100%',
                                        height: '32px',
                                        boxSizing: 'border-box'
                                    } : {
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value={true}>Active</option>
                                    <option value={false}>Inactive</option>
                                </select>
                            </div>
                            
                            <div className="form-actions" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingTop: '12px',
                                marginTop: '12px',
                                borderTop: '1px solid #e5e7eb'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                marginTop: '20px'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => {
                                    setShowPilotForm(false);
                                    setShowEditPilotForm(false);
                                    resetPilotForm();
                                }} style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                }}>
                                    {showEditPilotForm ? 'Update Pilot Member' : 'Add Pilot Member'}
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

            {/* Create Email Template Modal */}
            {showEmailTemplateForm && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '1200px',
                        width: '95%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {}}>
                            <h3 style={isMobile ? {
                                margin: 0,
                                fontSize: '14px',
                                fontWeight: 600
                            } : {
                                margin: 0,
                                fontSize: '24px',
                                fontWeight: 600
                            }}>Message Template</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowEmailTemplateForm(false);
                                    setEmailTemplateFormData({
                                        name: '',
                                        subject: '',
                                        body: getDefaultTemplateBody('Booking Confirmation'),
                                        category: 'User Defined Message'
                                    });
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {}}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const response = await axios.post('/api/email-templates', emailTemplateFormData);
                                if (response.data?.success) {
                                    fetchEmailTemplates();
                                    setShowEmailTemplateForm(false);
                                    setEmailTemplateFormData({
                                        name: '',
                                        subject: '',
                                        body: getDefaultTemplateBody('Booking Confirmation'),
                                        category: 'User Defined Message'
                                    });
                                    alert('Email template created successfully!');
                                }
                            } catch (error) {
                                alert('Error creating template: ' + (error.response?.data?.message || error.message));
                            }
                        }}>
                            <div className="modal-body" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                padding: '12px'
                            } : {
                                display: 'flex',
                                gap: '24px',
                                padding: '24px'
                            }}>
                                {/* Left Column - Form */}
                                <div style={isMobile ? {
                                    flex: '1 1 auto',
                                    width: '100%'
                                } : {
                                    flex: '0 0 350px'
                                }}>
                                    <div className="form-group" style={isMobile ? {
                                        marginBottom: '12px'
                                    } : {
                                        marginBottom: '20px'
                                    }}>
                                        <label style={isMobile ? {
                                            display: 'block',
                                            marginBottom: '4px',
                                            fontWeight: 600,
                                            color: '#374151',
                                            fontSize: '11px'
                                        } : {
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}>Name</label>
                                        <input
                                            type="text"
                                            value={emailTemplateFormData.name}
                                            onChange={(e) => setEmailTemplateFormData({ ...emailTemplateFormData, name: e.target.value })}
                                            placeholder="test"
                                            required
                                            style={isMobile ? {
                                                width: '100%',
                                                padding: '6px 8px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '4px',
                                                fontSize: '13px',
                                                height: '32px',
                                                boxSizing: 'border-box'
                                            } : {
                                                width: '100%',
                                                padding: '8px 12px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                        <p style={isMobile ? {
                                            fontSize: '10px',
                                            color: '#6b7280',
                                            marginTop: '4px',
                                            marginBottom: 0,
                                            lineHeight: '1.3'
                                        } : {
                                            fontSize: '12px',
                                            color: '#6b7280',
                                            marginTop: '4px',
                                            marginBottom: 0
                                        }}>
                                            This will help you identify this message when choosing from your list of messages. Not visible to the recipient.
                                        </p>
                                    </div>
                                </div>

                                {/* Right Column - Email Preview */}
                                <div style={isMobile ? {
                                    flex: '1 1 auto',
                                    width: '100%',
                                    minWidth: 0
                                } : {
                                    flex: 1,
                                    minWidth: 0
                                }}>
                                    {/* Email Preview Container */}
                                    <div style={isMobile ? {
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        backgroundColor: '#f9fafb',
                                        overflow: 'hidden'
                                    } : {
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        backgroundColor: '#f9fafb',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Email Header */}
                                        <div style={isMobile ? {
                                            padding: '10px',
                                            borderBottom: '1px solid #e5e7eb',
                                            backgroundColor: '#fff'
                                        } : {
                                            padding: '16px',
                                            borderBottom: '1px solid #e5e7eb',
                                            backgroundColor: '#fff'
                                        }}>
                                            <div style={isMobile ? {
                                                display: 'flex',
                                                gap: '4px',
                                                marginBottom: '8px'
                                            } : {
                                                display: 'flex',
                                                gap: '6px',
                                                marginBottom: '12px'
                                            }}>
                                                <div style={isMobile ? {
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#ef4444'
                                                } : {
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#ef4444'
                                                }}></div>
                                                <div style={isMobile ? {
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#fbbf24'
                                                } : {
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#fbbf24'
                                                }}></div>
                                                <div style={isMobile ? {
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#10b981'
                                                } : {
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#10b981'
                                                }}></div>
                                            </div>
                                            <div style={isMobile ? {
                                                fontSize: '9px',
                                                color: '#6b7280',
                                                marginBottom: '2px',
                                                wordBreak: 'break-word'
                                            } : {
                                                fontSize: '11px',
                                                color: '#6b7280',
                                                marginBottom: '4px'
                                            }}>
                                                From "Hugo Hall" &lt;info@flyawayballooning.com&gt;
                                            </div>
                                            <div style={isMobile ? {
                                                fontSize: '9px',
                                                color: '#9ca3af'
                                            } : {
                                                fontSize: '11px',
                                                color: '#9ca3af'
                                            }}>
                                                Sent at Nov 09, 2025 4:00pm
                                            </div>
                                        </div>

                                        {/* Email Subject */}
                                        <div style={isMobile ? {
                                            padding: '10px',
                                            backgroundColor: '#fff',
                                            borderBottom: '1px solid #e5e7eb'
                                        } : {
                                            padding: '16px',
                                            backgroundColor: '#fff',
                                            borderBottom: '1px solid #e5e7eb'
                                        }}>
                                            <input
                                                type="text"
                                                value={emailTemplateFormData.subject}
                                                onChange={(e) => setEmailTemplateFormData({ ...emailTemplateFormData, subject: e.target.value })}
                                                placeholder="Enter subject..."
                                                required
                                                style={isMobile ? {
                                                    width: '100%',
                                                    border: 'none',
                                                    outline: 'none',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    padding: '2px 0',
                                                    color: '#111827'
                                                } : {
                                                    width: '100%',
                                                    border: 'none',
                                                    outline: 'none',
                                                    fontSize: '16px',
                                                    fontWeight: 500,
                                                    padding: '4px 0',
                                                    color: '#111827'
                                                }}
                                            />
                                            <div style={isMobile ? {
                                                display: 'flex',
                                                gap: '6px',
                                                marginTop: '6px',
                                                alignItems: 'center'
                                            } : {
                                                display: 'flex',
                                                gap: '8px',
                                                marginTop: '8px',
                                                alignItems: 'center'
                                            }}>
                                                <span style={isMobile ? {
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#10b981',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontSize: '10px'
                                                } : {
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#10b981',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontSize: '12px'
                                                }}>✓</span>
                                                <span style={isMobile ? {
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#10b981',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontSize: '10px'
                                                } : {
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#10b981',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontSize: '12px'
                                                }}>W</span>
                                            </div>
                                        </div>

                                        {/* Email Body */}
                                        <div style={{ padding: '0' }}>
                                            {/* Editable Content Area */}
                                            <div style={isMobile ? {
                                                padding: '12px',
                                                backgroundColor: '#fff',
                                                minHeight: '150px'
                                            } : {
                                                padding: '24px',
                                                backgroundColor: '#fff',
                                                minHeight: '200px'
                                            }}>
                                                <RichTextEditor
                                                    value={emailTemplateFormData.body}
                                                    onChange={(html) => setEmailTemplateFormData({ ...emailTemplateFormData, body: html })}
                                                    placeholder="Enter your message here..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions" style={isMobile ? {
                                borderTop: '1px solid #e5e7eb',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px'
                            }}>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowEmailTemplateForm(false);
                                        setEmailTemplateFormData({
                                            name: '',
                                            subject: '',
                                            body: '',
                                            category: 'User Defined Message',
                                        });
                                    }}
                                    style={isMobile ? {
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        width: '100%',
                                        borderRadius: '4px',
                                        height: '36px'
                                    } : {
                                        padding: '8px 20px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px'
                                }}>
                                    Create Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create SMS Template Modal */}
            {showSmsTemplateForm && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '1200px',
                        width: '95%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {}}>
                            <h3 style={isMobile ? {
                                margin: 0,
                                fontSize: '14px',
                                fontWeight: 600
                            } : {
                                margin: 0,
                                fontSize: '24px',
                                fontWeight: 600
                            }}>SMS Message Template</h3>
                            <button 
                                className="close-btn"
                                onClick={() => {
                                    setShowSmsTemplateForm(false);
                                    setSmsTemplateFormData({
                                        name: '',
                                        message: '',
                                        category: 'User Defined Message'
                                    });
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {}}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const response = await axios.post('/api/sms-templates', smsTemplateFormData);
                                if (response.data?.success) {
                                    fetchSmsTemplates();
                                    setShowSmsTemplateForm(false);
                                    setSmsTemplateFormData({
                                        name: '',
                                        message: '',
                                        category: 'User Defined Message'
                                    });
                                    alert('SMS template created successfully!');
                                }
                            } catch (error) {
                                alert('Error creating template: ' + (error.response?.data?.message || error.message));
                            }
                        }}>
                            <div className="modal-body" style={isMobile ? {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                padding: '12px'
                            } : {
                                display: 'flex',
                                gap: '24px',
                                padding: '24px'
                            }}>
                                {/* Left Column - Form */}
                                <div style={isMobile ? {
                                    flex: '1 1 auto',
                                    width: '100%'
                                } : {
                                    flex: '0 0 350px'
                                }}>
                                    <div className="form-group" style={isMobile ? {
                                        marginBottom: '12px'
                                    } : {
                                        marginBottom: '20px'
                                    }}>
                                        <label style={isMobile ? {
                                            display: 'block',
                                            marginBottom: '4px',
                                            fontWeight: 600,
                                            color: '#374151',
                                            fontSize: '11px'
                                        } : {
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}>Name</label>
                                        <input
                                            type="text"
                                            value={smsTemplateFormData.name}
                                            onChange={(e) => setSmsTemplateFormData({ ...smsTemplateFormData, name: e.target.value })}
                                            placeholder="Booking Confirmation SMS"
                                            required
                                            style={isMobile ? {
                                                width: '100%',
                                                padding: '6px 8px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '4px',
                                                fontSize: '13px',
                                                height: '32px',
                                                boxSizing: 'border-box'
                                            } : {
                                                width: '100%',
                                                padding: '8px 12px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                        <p style={isMobile ? {
                                            fontSize: '10px',
                                            color: '#6b7280',
                                            marginTop: '4px',
                                            marginBottom: 0,
                                            lineHeight: '1.3'
                                        } : {
                                            fontSize: '12px',
                                            color: '#6b7280',
                                            marginTop: '4px',
                                            marginBottom: 0
                                        }}>
                                            This will help you identify this message when choosing from your list of messages. Not visible to the recipient.
                                        </p>
                                    </div>
                                    <div className="form-group" style={isMobile ? {
                                        marginBottom: '12px'
                                    } : {
                                        marginBottom: '20px'
                                    }}>
                                        <label style={isMobile ? {
                                            display: 'block',
                                            marginBottom: '4px',
                                            fontWeight: 600,
                                            color: '#374151',
                                            fontSize: '11px'
                                        } : {
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}>Category</label>
                                        <select
                                            value={smsTemplateFormData.category}
                                            onChange={(e) => setSmsTemplateFormData({ ...smsTemplateFormData, category: e.target.value })}
                                            style={isMobile ? {
                                                width: '100%',
                                                padding: '6px 8px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '4px',
                                                fontSize: '13px',
                                                height: '32px',
                                                boxSizing: 'border-box'
                                            } : {
                                                width: '100%',
                                                padding: '8px 12px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        >
                                            <option value="User Defined Message">User Defined Message</option>
                                            <option value="Confirmation">Confirmation</option>
                                            <option value="Rebooked">Rebooked</option>
                                            <option value="Event Followup">Event Followup</option>
                                            <option value="Cancellation">Cancellation</option>
                                            <option value="Refund">Refund</option>
                                            <option value="Event Reminder">Event Reminder</option>
                                            <option value="Payment Request">Payment Request</option>
                                            <option value="Abandon Cart">Abandon Cart</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={isMobile ? {
                                        marginBottom: '12px'
                                    } : {
                                        marginBottom: '20px'
                                    }}>
                                        <label style={isMobile ? {
                                            display: 'block',
                                            marginBottom: '4px',
                                            fontWeight: 600,
                                            color: '#374151',
                                            fontSize: '11px'
                                        } : {
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}>Message</label>
                                        <div style={isMobile ? {
                                            marginBottom: '6px',
                                            display: 'flex',
                                            gap: '4px',
                                            flexWrap: 'wrap'
                                        } : {
                                            marginBottom: '8px',
                                            display: 'flex',
                                            gap: '6px',
                                            flexWrap: 'wrap'
                                        }}>
                                            {['[First Name]', '[Last Name]', '[Full Name]', '[Company Name]', '[Booking ID]', '[Customer Portal Link]', '[Email]', '[Phone]', '[Experience Data]'].map((placeholder) => (
                                                <button
                                                    key={placeholder}
                                                    type="button"
                                                    onClick={() => {
                                                        const textarea = document.querySelector(`textarea[data-sms-message-create]`);
                                                        if (textarea) {
                                                            const start = textarea.selectionStart;
                                                            const end = textarea.selectionEnd;
                                                            const text = smsTemplateFormData.message;
                                                            const newText = text.substring(0, start) + placeholder + text.substring(end);
                                                            setSmsTemplateFormData({ ...smsTemplateFormData, message: newText });
                                                            setTimeout(() => {
                                                                textarea.focus();
                                                                textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
                                                            }, 0);
                                                        }
                                                    }}
                                                    style={isMobile ? {
                                                        padding: '3px 6px',
                                                        fontSize: '9px',
                                                        backgroundColor: placeholder.includes('Company Name') || placeholder.includes('Customer Portal Link') || placeholder.includes('Experience Data') ? '#dbeafe' : '#f3f4f6',
                                                        color: placeholder.includes('Company Name') || placeholder.includes('Customer Portal Link') || placeholder.includes('Experience Data') ? '#1d4ed8' : '#6366f1',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '3px',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap'
                                                    } : {
                                                        padding: '4px 8px', 
                                                        fontSize: '11px', 
                                                        backgroundColor: placeholder.includes('Company Name') || placeholder.includes('Customer Portal Link') || placeholder.includes('Experience Data') ? '#dbeafe' : '#f3f4f6', 
                                                        color: placeholder.includes('Company Name') || placeholder.includes('Customer Portal Link') || placeholder.includes('Experience Data') ? '#1d4ed8' : '#6366f1',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {placeholder}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            data-sms-message-create
                                            value={smsTemplateFormData.message}
                                            onChange={(e) => setSmsTemplateFormData({ ...smsTemplateFormData, message: e.target.value })}
                                            placeholder="Enter your SMS message here..."
                                            required
                                            rows={isMobile ? 4 : 8}
                                            style={isMobile ? {
                                                width: '100%',
                                                padding: '6px 8px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '4px',
                                                fontSize: '13px',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                                lineHeight: '1.5',
                                                minHeight: '70px',
                                                boxSizing: 'border-box'
                                            } : {
                                                width: '100%', 
                                                padding: '12px', 
                                                border: '1px solid #d1d5db', 
                                                borderRadius: '6px', 
                                                fontSize: '14px',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                                lineHeight: '1.5'
                                            }}
                                        />
                                        <p style={isMobile ? {
                                            fontSize: '10px',
                                            color: '#6b7280',
                                            marginTop: '4px',
                                            marginBottom: 0,
                                            lineHeight: '1.3'
                                        } : {
                                            fontSize: '12px',
                                            color: '#6b7280',
                                            marginTop: '4px',
                                            marginBottom: 0
                                        }}>
                                            Click placeholder buttons above to insert dynamic data into your message.
                                        </p>
                                    </div>
                                </div>

                                {/* Right Column - Mobile Preview */}
                                <div style={isMobile ? {
                                    flex: '1 1 auto',
                                    width: '100%',
                                    minWidth: 0,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'flex-start'
                                } : {
                                    flex: 1,
                                    minWidth: 0,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'flex-start'
                                }}>
                                    {/* Mobile Device Preview */}
                                    <div style={isMobile ? {
                                        width: '240px',
                                        maxWidth: '100%',
                                        background: '#000',
                                        borderRadius: '18px',
                                        padding: '8px',
                                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
                                    } : {
                                        width: '320px',
                                        maxWidth: '100%',
                                        background: '#000',
                                        borderRadius: '24px',
                                        padding: '12px',
                                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
                                    }}>
                                        {/* Phone Screen */}
                                        <div style={isMobile ? {
                                            background: '#f5f5f5',
                                            borderRadius: '14px',
                                            padding: '6px',
                                            minHeight: '280px'
                                        } : {
                                            background: '#f5f5f5',
                                            borderRadius: '20px',
                                            padding: '8px',
                                            minHeight: '500px'
                                        }}>
                                            {/* Status Bar */}
                                            <div style={isMobile ? {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '6px 8px',
                                                fontSize: '8px',
                                                color: '#000',
                                                background: '#fff',
                                                borderRadius: '8px 8px 0 0'
                                            } : {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 12px',
                                                fontSize: '10px',
                                                color: '#000',
                                                background: '#fff',
                                                borderRadius: '12px 12px 0 0'
                                            }}>
                                                <span>9:41</span>
                                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: isMobile ? '10px' : '12px' }}>🔗</span>
                                                    <span style={{ fontSize: isMobile ? '10px' : '12px' }}>⌨️</span>
                                                </div>
                                            </div>

                                            {/* Message Preview */}
                                            <div style={isMobile ? {
                                                padding: '12px',
                                                background: '#fff',
                                                borderRadius: '0 0 8px 8px',
                                                minHeight: '200px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'flex-start'
                                            } : {
                                                padding: '16px',
                                                background: '#fff',
                                                borderRadius: '0 0 12px 12px',
                                                minHeight: '400px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'flex-start'
                                            }}>
                                                {/* Message Bubble */}
                                                <div style={isMobile ? {
                                                    background: '#e5e7eb',
                                                    borderRadius: '12px',
                                                    padding: '8px 12px',
                                                    marginBottom: '6px',
                                                    maxWidth: '85%',
                                                    alignSelf: 'flex-start',
                                                    wordWrap: 'break-word',
                                                    fontSize: '12px',
                                                    lineHeight: '1.5',
                                                    color: '#111827',
                                                    whiteSpace: 'pre-wrap'
                                                } : {
                                                    background: '#e5e7eb',
                                                    borderRadius: '16px',
                                                    padding: '12px 16px',
                                                    marginBottom: '8px',
                                                    maxWidth: '85%',
                                                    alignSelf: 'flex-start',
                                                    wordWrap: 'break-word',
                                                    fontSize: '14px',
                                                    lineHeight: '1.5',
                                                    color: '#111827',
                                                    whiteSpace: 'pre-wrap'
                                                }}>
                                                    {smsTemplateFormData.message || 'Your message will appear here...'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions" style={isMobile ? {
                                borderTop: '1px solid #e5e7eb',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px'
                            }}>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowSmsTemplateForm(false);
                                        setSmsTemplateFormData({
                                            name: '',
                                            message: '',
                                            category: 'User Defined Message'
                                        });
                                    }}
                                    style={isMobile ? {
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        width: '100%',
                                        borderRadius: '4px',
                                        height: '36px'
                                    } : {
                                        padding: '8px 20px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px'
                                }}>
                                    Create Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit SMS Template Modal */}
            {showEditSmsTemplateForm && selectedSmsTemplate && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '1200px', width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>SMS Message Template</h3>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    setShowEditSmsTemplateForm(false);
                                    setSelectedSmsTemplate(null);
                                    setSmsTemplateFormData({
                                        name: '',
                                        message: '',
                                        category: 'User Defined Message'
                                    });
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const response = await axios.put(`/api/sms-templates/${selectedSmsTemplate.id}`, smsTemplateFormData);
                                if (response.data?.success) {
                                    fetchSmsTemplates();
                                    setShowEditSmsTemplateForm(false);
                                    setSelectedSmsTemplate(null);
                                    setSmsTemplateFormData({
                                        name: '',
                                        message: '',
                                        category: 'User Defined Message'
                                    });
                                    alert('SMS template updated successfully!');
                                }
                            } catch (error) {
                                alert('Error updating template: ' + (error.response?.data?.message || error.message));
                            }
                        }}>
                            <div className="modal-body" style={{ display: 'flex', gap: '24px', padding: '24px' }}>
                                {/* Left Column - Form */}
                                <div style={{ flex: '0 0 350px' }}>
                                    <div className="form-group" style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>Name</label>
                                        <input
                                            type="text"
                                            value={smsTemplateFormData.name}
                                            onChange={(e) => setSmsTemplateFormData({ ...smsTemplateFormData, name: e.target.value })}
                                            placeholder="Booking Confirmation SMS"
                                            required
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                                        />
                                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
                                            This will help you identify this message when choosing from your list of messages. Not visible to the recipient.
                                        </p>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>Category</label>
                                        <select
                                            value={smsTemplateFormData.category}
                                            onChange={(e) => setSmsTemplateFormData({ ...smsTemplateFormData, category: e.target.value })}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                                        >
                                            <option value="User Defined Message">User Defined Message</option>
                                            <option value="Confirmation">Confirmation</option>
                                            <option value="Rebooked">Rebooked</option>
                                            <option value="Event Followup">Event Followup</option>
                                            <option value="Cancellation">Cancellation</option>
                                            <option value="Refund">Refund</option>
                                            <option value="Event Reminder">Event Reminder</option>
                                            <option value="Payment Request">Payment Request</option>
                                            <option value="Abandon Cart">Abandon Cart</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>Message</label>
                                        <div style={{ marginBottom: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {['[First Name]', '[Last Name]', '[Full Name]', '[Company Name]', '[Booking ID]', '[Customer Portal Link]', '[Email]', '[Phone]', '[Experience Data]'].map((placeholder) => (
                                                <button
                                                    key={placeholder}
                                                    type="button"
                                                    onClick={() => {
                                                        const textarea = document.querySelector(`textarea[data-sms-message-edit]`);
                                                        if (textarea) {
                                                            const start = textarea.selectionStart;
                                                            const end = textarea.selectionEnd;
                                                            const text = smsTemplateFormData.message;
                                                            const newText = text.substring(0, start) + placeholder + text.substring(end);
                                                            setSmsTemplateFormData({ ...smsTemplateFormData, message: newText });
                                                            setTimeout(() => {
                                                                textarea.focus();
                                                                textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
                                                            }, 0);
                                                        }
                                                    }}
                                                    style={{ 
                                                        padding: '4px 8px', 
                                                        fontSize: '11px', 
                                                        backgroundColor: placeholder.includes('Company Name') || placeholder.includes('Customer Portal Link') || placeholder.includes('Experience Data') ? '#dbeafe' : '#f3f4f6', 
                                                        color: placeholder.includes('Company Name') || placeholder.includes('Customer Portal Link') || placeholder.includes('Experience Data') ? '#1d4ed8' : '#6366f1',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {placeholder}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            data-sms-message-edit
                                            value={smsTemplateFormData.message}
                                            onChange={(e) => setSmsTemplateFormData({ ...smsTemplateFormData, message: e.target.value })}
                                            placeholder="Enter your SMS message here..."
                                            required
                                            rows={8}
                                            style={{ 
                                                width: '100%', 
                                                padding: '12px', 
                                                border: '1px solid #d1d5db', 
                                                borderRadius: '6px', 
                                                fontSize: '14px',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                                lineHeight: '1.5'
                                            }}
                                        />
                                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
                                            Click placeholder buttons above to insert dynamic data into your message.
                                        </p>
                                    </div>
                                </div>

                                {/* Right Column - Mobile Preview */}
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                                    {/* Mobile Device Preview */}
                                    <div style={{ 
                                        width: '320px',
                                        maxWidth: '100%',
                                        background: '#000',
                                        borderRadius: '24px',
                                        padding: '12px',
                                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
                                    }}>
                                        {/* Phone Screen */}
                                        <div style={{
                                            background: '#f5f5f5',
                                            borderRadius: '20px',
                                            padding: '8px',
                                            minHeight: '500px'
                                        }}>
                                            {/* Status Bar */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 12px',
                                                fontSize: '10px',
                                                color: '#000',
                                                background: '#fff',
                                                borderRadius: '12px 12px 0 0'
                                            }}>
                                                <span>9:41</span>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '12px' }}>🔗</span>
                                                    <span style={{ fontSize: '12px' }}>⌨️</span>
                                                </div>
                                            </div>

                                            {/* Message Preview */}
                                            <div style={{
                                                padding: '16px',
                                                background: '#fff',
                                                borderRadius: '0 0 12px 12px',
                                                minHeight: '400px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'flex-start'
                                            }}>
                                                {/* Message Bubble */}
                                                <div style={{
                                                    background: '#e5e7eb',
                                                    borderRadius: '16px',
                                                    padding: '12px 16px',
                                                    marginBottom: '8px',
                                                    maxWidth: '85%',
                                                    alignSelf: 'flex-start',
                                                    wordWrap: 'break-word',
                                                    fontSize: '14px',
                                                    lineHeight: '1.5',
                                                    color: '#111827',
                                                    whiteSpace: 'pre-wrap'
                                                }}>
                                                    {smsTemplateFormData.message || 'Your message will appear here...'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions" style={{ borderTop: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowEditSmsTemplateForm(false);
                                        setSelectedSmsTemplate(null);
                                        setSmsTemplateFormData({
                                            name: '',
                                            message: '',
                                            category: 'User Defined Message'
                                        });
                                    }}
                                    style={{ padding: '8px 20px' }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px' }}>
                                    Update Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Customer Portal Section */}
            <div className="settings-card" style={{ marginBottom: '24px' }}>
                <div 
                    className="card-header"
                    onClick={() => setCustomerPortalExpanded(!customerPortalExpanded)}
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
                        <h2 style={{ margin: 0, color: '#1f2937' }}>Customer Portal</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                            Manage header and body content sections displayed on the Customer Portal page.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            className="btn btn-primary"
                            onClick={(e) => { e.stopPropagation(); setShowCustomerPortalForm(true); }}
                            style={{ margin: 0 }}
                        >
                            <Plus size={20} />
                            New Content
                        </button>
                        {customerPortalExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>

                {customerPortalExpanded && (
                    <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
                        {customerPortalContents.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '40px 20px', 
                                color: '#6b7280',
                                background: '#fff',
                                borderRadius: '8px',
                                border: '1px dashed #d1d5db'
                            }}>
                                <p style={{ margin: 0, fontSize: '15px' }}>No customer portal content yet. Create your first content section!</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>HEADER</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BODY PREVIEW</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIVE</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SORT ORDER</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerPortalContents
                                            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                                            .map((content) => (
                                            <tr key={content.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{ fontWeight: 500, color: '#1f2937' }}>{content.header || 'N/A'}</span>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{ color: '#475569' }}>
                                                        {content.body ? (content.body.length > 100 ? content.body.substring(0, 100) + '...' : content.body) : 'N/A'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                                    <div style={{ 
                                                        width: '24px', 
                                                        height: '24px', 
                                                        borderRadius: '50%', 
                                                        border: '2px solid #d1d5db',
                                                        margin: '0 auto',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: content.is_active ? '#10b981' : '#f3f4f6',
                                                        borderColor: content.is_active ? '#10b981' : '#d1d5db'
                                                    }}>
                                                        {content.is_active ? <CheckCircle size={16} color="#fff" /> : <XCircle size={16} color="#9ca3af" />}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                                    <span style={{ color: '#475569' }}>{content.sort_order || 0}</span>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => {
                                                                setSelectedCustomerPortalContent(content);
                                                                setCustomerPortalFormData({
                                                                    header: content.header || '',
                                                                    body: content.body || '',
                                                                    sort_order: content.sort_order || 0,
                                                                    is_active: content.is_active !== undefined ? content.is_active : true
                                                                });
                                                                setShowEditCustomerPortalForm(true);
                                                            }}
                                                            style={{ padding: '6px 12px', fontSize: '13px' }}
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            className="btn btn-danger"
                                                            onClick={async () => {
                                                                if (window.confirm('Are you sure you want to delete this content?')) {
                                                                    try {
                                                                        await axios.delete(`/api/customer-portal-contents/${content.id}`);
                                                                        fetchCustomerPortalContents();
                                                                    } catch (error) {
                                                                        alert('Error deleting content: ' + (error.response?.data?.message || error.message));
                                                                    }
                                                                }
                                                            }}
                                                            style={{ padding: '6px 12px', fontSize: '13px' }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Customer Portal Content Modal */}
            {showCustomerPortalForm && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '95%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {}}>
                            <h3 style={isMobile ? {
                                margin: 0,
                                fontSize: '14px',
                                fontWeight: 600
                            } : {
                                margin: 0,
                                fontSize: '24px',
                                fontWeight: 600
                            }}>Create Customer Portal Content</h3>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    setShowCustomerPortalForm(false);
                                    setCustomerPortalFormData({
                                        header: '',
                                        body: '',
                                        sort_order: 0,
                                        is_active: true
                                    });
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {}}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const response = await axios.post('/api/customer-portal-contents', customerPortalFormData);
                                if (response.data?.success) {
                                    fetchCustomerPortalContents();
                                    setShowCustomerPortalForm(false);
                                    setCustomerPortalFormData({
                                        header: '',
                                        body: '',
                                        sort_order: 0,
                                        is_active: true
                                    });
                                    alert('Customer portal content created successfully!');
                                }
                            } catch (error) {
                                alert('Error creating content: ' + (error.response?.data?.message || error.message));
                            }
                        }}>
                            <div style={isMobile ? {
                                padding: '12px'
                            } : {
                                padding: '24px'
                            }}>
                                <div style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    marginBottom: '20px'
                                }}>
                                    <label style={isMobile ? {
                                        display: 'block',
                                        marginBottom: '4px',
                                        fontWeight: 600,
                                        color: '#374151',
                                        fontSize: '11px'
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151'
                                    }}>
                                        Header <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={customerPortalFormData.header}
                                        onChange={(e) => setCustomerPortalFormData({ ...customerPortalFormData, header: e.target.value })}
                                        placeholder="Enter header text..."
                                        required
                                        style={isMobile ? {
                                            width: '100%',
                                            padding: '6px 8px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    marginBottom: '20px'
                                }}>
                                    <label style={isMobile ? {
                                        display: 'block',
                                        marginBottom: '4px',
                                        fontWeight: 600,
                                        color: '#374151',
                                        fontSize: '11px'
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151'
                                    }}>
                                        Body <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <div style={isMobile ? {
                                        fontSize: '13px'
                                    } : {}}>
                                    <RichTextEditor
                                        value={customerPortalFormData.body}
                                        onChange={(html) => setCustomerPortalFormData({ ...customerPortalFormData, body: html })}
                                        placeholder="Enter body content..."
                                    />
                                    </div>
                                </div>

                                <div style={isMobile ? {
                                    marginBottom: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                } : {
                                    marginBottom: '20px',
                                    display: 'flex',
                                    gap: '20px'
                                }}>
                                    <div style={isMobile ? {
                                        width: '100%'
                                    } : {
                                        flex: 1
                                    }}>
                                        <label style={isMobile ? {
                                            display: 'block',
                                            marginBottom: '4px',
                                            fontWeight: 600,
                                            color: '#374151',
                                            fontSize: '11px'
                                        } : {
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}>
                                            Sort Order
                                        </label>
                                        <input
                                            type="number"
                                            value={customerPortalFormData.sort_order}
                                            onChange={(e) => setCustomerPortalFormData({ ...customerPortalFormData, sort_order: parseInt(e.target.value) || 0 })}
                                            min="0"
                                            style={isMobile ? {
                                                width: '100%',
                                                padding: '6px 8px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '4px',
                                                fontSize: '13px',
                                                height: '32px',
                                                boxSizing: 'border-box'
                                            } : {
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                    <div style={isMobile ? {
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginTop: '0'
                                    } : {
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginTop: '28px'
                                    }}>
                                        <label style={isMobile ? {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer'
                                        } : {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={customerPortalFormData.is_active}
                                                onChange={(e) => setCustomerPortalFormData({ ...customerPortalFormData, is_active: e.target.checked })}
                                                style={isMobile ? {
                                                    width: '14px',
                                                    height: '14px',
                                                    cursor: 'pointer'
                                                } : {
                                                    width: '18px',
                                                    height: '18px',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                            <span style={isMobile ? {
                                                color: '#374151',
                                                fontSize: '11px'
                                            } : {
                                                color: '#374151',
                                                fontSize: '14px'
                                            }}>Active</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions" style={isMobile ? {
                                borderTop: '1px solid #e5e7eb',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px'
                            }}>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowCustomerPortalForm(false);
                                        setCustomerPortalFormData({
                                            header: '',
                                            body: '',
                                            sort_order: 0,
                                            is_active: true
                                        });
                                    }}
                                    style={isMobile ? {
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        width: '100%',
                                        borderRadius: '4px',
                                        height: '36px'
                                    } : {
                                        padding: '8px 20px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px'
                                }}>
                                    Create Content
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Customer Portal Content Modal */}
            {showEditCustomerPortalForm && selectedCustomerPortalContent && (
                <div className="modal-overlay" style={isMobile ? {
                    padding: '8px',
                    alignItems: 'flex-start',
                    overflowY: 'auto'
                } : {}}>
                    <div className="modal-content" style={isMobile ? {
                        maxWidth: 'calc(100vw - 16px)',
                        width: '100%',
                        maxHeight: 'calc(100vh - 16px)',
                        margin: '0',
                        borderRadius: '8px'
                    } : {
                        maxWidth: '800px',
                        width: '95%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div className="modal-header" style={isMobile ? {
                            padding: '10px 12px',
                            borderBottom: '1px solid #e5e7eb'
                        } : {}}>
                            <h3 style={isMobile ? {
                                margin: 0,
                                fontSize: '14px',
                                fontWeight: 600
                            } : {
                                margin: 0,
                                fontSize: '24px',
                                fontWeight: 600
                            }}>Edit Customer Portal Content</h3>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    setShowEditCustomerPortalForm(false);
                                    setSelectedCustomerPortalContent(null);
                                    setCustomerPortalFormData({
                                        header: '',
                                        body: '',
                                        sort_order: 0,
                                        is_active: true
                                    });
                                }}
                                style={isMobile ? {
                                    fontSize: '18px',
                                    width: '24px',
                                    height: '24px'
                                } : {}}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const response = await axios.put(`/api/customer-portal-contents/${selectedCustomerPortalContent.id}`, customerPortalFormData);
                                if (response.data?.success) {
                                    fetchCustomerPortalContents();
                                    setShowEditCustomerPortalForm(false);
                                    setSelectedCustomerPortalContent(null);
                                    setCustomerPortalFormData({
                                        header: '',
                                        body: '',
                                        sort_order: 0,
                                        is_active: true
                                    });
                                    alert('Customer portal content updated successfully!');
                                }
                            } catch (error) {
                                alert('Error updating content: ' + (error.response?.data?.message || error.message));
                            }
                        }}>
                            <div style={isMobile ? {
                                padding: '12px'
                            } : {
                                padding: '24px'
                            }}>
                                <div style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    marginBottom: '20px'
                                }}>
                                    <label style={isMobile ? {
                                        display: 'block',
                                        marginBottom: '4px',
                                        fontWeight: 600,
                                        color: '#374151',
                                        fontSize: '11px'
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151'
                                    }}>
                                        Header <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={customerPortalFormData.header}
                                        onChange={(e) => setCustomerPortalFormData({ ...customerPortalFormData, header: e.target.value })}
                                        placeholder="Enter header text..."
                                        required
                                        style={isMobile ? {
                                            width: '100%',
                                            padding: '6px 8px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            height: '32px',
                                            boxSizing: 'border-box'
                                        } : {
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div style={isMobile ? {
                                    marginBottom: '12px'
                                } : {
                                    marginBottom: '20px'
                                }}>
                                    <label style={isMobile ? {
                                        display: 'block',
                                        marginBottom: '4px',
                                        fontWeight: 600,
                                        color: '#374151',
                                        fontSize: '11px'
                                    } : {
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontWeight: 500,
                                        color: '#374151'
                                    }}>
                                        Body <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <div style={isMobile ? {
                                        fontSize: '13px'
                                    } : {}}>
                                    <RichTextEditor
                                        value={customerPortalFormData.body}
                                        onChange={(html) => setCustomerPortalFormData({ ...customerPortalFormData, body: html })}
                                        placeholder="Enter body content..."
                                    />
                                    </div>
                                </div>

                                <div style={isMobile ? {
                                    marginBottom: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                } : {
                                    marginBottom: '20px',
                                    display: 'flex',
                                    gap: '20px'
                                }}>
                                    <div style={isMobile ? {
                                        width: '100%'
                                    } : {
                                        flex: 1
                                    }}>
                                        <label style={isMobile ? {
                                            display: 'block',
                                            marginBottom: '4px',
                                            fontWeight: 600,
                                            color: '#374151',
                                            fontSize: '11px'
                                        } : {
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}>
                                            Sort Order
                                        </label>
                                        <input
                                            type="number"
                                            value={customerPortalFormData.sort_order}
                                            onChange={(e) => setCustomerPortalFormData({ ...customerPortalFormData, sort_order: parseInt(e.target.value) || 0 })}
                                            min="0"
                                            style={isMobile ? {
                                                width: '100%',
                                                padding: '6px 8px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '4px',
                                                fontSize: '13px',
                                                height: '32px',
                                                boxSizing: 'border-box'
                                            } : {
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                    <div style={isMobile ? {
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginTop: '0'
                                    } : {
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginTop: '28px'
                                    }}>
                                        <label style={isMobile ? {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer'
                                        } : {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={customerPortalFormData.is_active}
                                                onChange={(e) => setCustomerPortalFormData({ ...customerPortalFormData, is_active: e.target.checked })}
                                                style={isMobile ? {
                                                    width: '14px',
                                                    height: '14px',
                                                    cursor: 'pointer'
                                                } : {
                                                    width: '18px',
                                                    height: '18px',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                            <span style={isMobile ? {
                                                color: '#374151',
                                                fontSize: '11px'
                                            } : {
                                                color: '#374151',
                                                fontSize: '14px'
                                            }}>Active</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions" style={isMobile ? {
                                borderTop: '1px solid #e5e7eb',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            } : {
                                borderTop: '1px solid #e5e7eb',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px'
                            }}>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowEditCustomerPortalForm(false);
                                        setSelectedCustomerPortalContent(null);
                                        setCustomerPortalFormData({
                                            header: '',
                                            body: '',
                                            sort_order: 0,
                                            is_active: true
                                        });
                                    }}
                                    style={isMobile ? {
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        width: '100%',
                                        borderRadius: '4px',
                                        height: '36px'
                                    } : {
                                        padding: '8px 20px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={isMobile ? {
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    width: '100%',
                                    borderRadius: '4px',
                                    height: '36px'
                                } : {
                                    padding: '8px 20px'
                                }}>
                                    Update Content
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Email Template Modal */}
            {showEditEmailTemplateForm && selectedEmailTemplate && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '1200px', width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Message Template</h3>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    setShowEditEmailTemplateForm(false);
                                    setSelectedEmailTemplate(null);
                                    setEmailTemplateFormData({
                                        name: '',
                                        subject: '',
                                        body: getDefaultTemplateBody('Booking Confirmation'),
                                        category: 'User Defined Message'
                                    });
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const response = await axios.put(`/api/email-templates/${selectedEmailTemplate.id}`, emailTemplateFormData);
                                if (response.data?.success) {
                                    fetchEmailTemplates();
                                    setShowEditEmailTemplateForm(false);
                                    setSelectedEmailTemplate(null);
                                    setEmailTemplateFormData({
                                        name: '',
                                        subject: '',
                                        body: '',
                                        category: 'User Defined Message',
                                    });
                                    alert('Email template updated successfully!');
                                }
                            } catch (error) {
                                alert('Error updating template: ' + (error.response?.data?.message || error.message));
                            }
                        }}>
                            <div className="modal-body" style={{ display: 'flex', gap: '24px', padding: '24px' }}>
                                {/* Left Column - Form */}
                                <div style={{ flex: '0 0 350px' }}>
                                    <div className="form-group" style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>Name</label>
                                        <input
                                            type="text"
                                            value={emailTemplateFormData.name}
                                            onChange={(e) => setEmailTemplateFormData({ ...emailTemplateFormData, name: e.target.value })}
                                            placeholder="test"
                                            required
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                                        />
                                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
                                            This will help you identify this message when choosing from your list of messages. Not visible to the recipient.
                                        </p>
                                    </div>
                                </div>

                                {/* Right Column - Email Preview */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Email Preview Container */}
                                    <div style={{
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        backgroundColor: '#f9fafb',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Email Header */}
                                        <div style={{
                                            padding: '16px',
                                            borderBottom: '1px solid #e5e7eb',
                                            backgroundColor: '#fff'
                                        }}>
                                            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fbbf24' }}></div>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                                                From "Hugo Hall" &lt;info@flyawayballooning.com&gt;
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                Sent at Nov 09, 2025 4:00pm
                                            </div>
                                        </div>

                                        {/* Email Subject */}
                                        <div style={{ padding: '16px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                                            <input
                                                type="text"
                                                value={emailTemplateFormData.subject}
                                                onChange={(e) => setEmailTemplateFormData({ ...emailTemplateFormData, subject: e.target.value })}
                                                placeholder="Enter subject..."
                                                required
                                                style={{
                                                    width: '100%',
                                                    border: 'none',
                                                    outline: 'none',
                                                    fontSize: '16px',
                                                    fontWeight: 500,
                                                    padding: '4px 0',
                                                    color: '#111827'
                                                }}
                                            />
                                            <div style={{
                                                display: 'flex',
                                                gap: '8px',
                                                marginTop: '8px',
                                                alignItems: 'center'
                                            }}>
                                                <span style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#10b981',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontSize: '12px'
                                                }}>✓</span>
                                                <span style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#10b981',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontSize: '12px'
                                                }}>W</span>
                                            </div>
                                        </div>

                                        {/* Email Body */}
                                        <div style={{ padding: '0' }}>
                                            {/* Editable Content Area */}
                                            <div style={{
                                                padding: '24px',
                                                backgroundColor: '#fff',
                                                minHeight: '200px'
                                            }}>
                                                <RichTextEditor
                                                    value={emailTemplateFormData.body}
                                                    onChange={(html) => setEmailTemplateFormData({ ...emailTemplateFormData, body: html })}
                                                    placeholder="Enter your message here..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions" style={{ borderTop: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowEditEmailTemplateForm(false);
                                        setSelectedEmailTemplate(null);
                                        setEmailTemplateFormData({
                                            name: '',
                                            subject: '',
                                            body: '',
                                            category: 'User Defined Message',
                                        });
                                    }}
                                    style={{ padding: '8px 20px' }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px' }}>
                                    Update Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings; 
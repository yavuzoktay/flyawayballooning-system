const axios = require('axios');

// Test voucher creation with additional information
async function testVoucherCreation() {
    console.log('=== TESTING VOUCHER CREATION WITH ADDITIONAL INFO ===');
    
    // Sample additional information data (what should be sent from frontend)
    const additionalInfo = {
        notes: "Test notes from API test",
        question_13: "Google",
        question_14: "Yes", 
        question_16: "Champagne"
    };
    
    // Test the additional info endpoint first
    console.log('\n1. Testing additional info endpoint...');
    try {
        const testResponse = await axios.post('http://localhost:3002/api/testAdditionalInfo', {
            additionalInfo: additionalInfo
        });
        console.log('✅ Test endpoint response:', testResponse.data);
    } catch (error) {
        console.error('❌ Test endpoint error:', error.response?.data || error.message);
    }
    
    // Test voucher creation with additional info
    console.log('\n2. Testing voucher creation...');
    const voucherData = {
        voucher_type: "Flight Voucher",
        voucher_type_detail: "Any Day Flight",
        numberOfPassengers: 1,
        additionalInfo: additionalInfo
    };
    
    try {
        const response = await axios.post('http://localhost:3002/api/create-checkout-session', {
            type: 'voucher',
            voucherData: voucherData
        });
        console.log('✅ Voucher creation response:', response.data);
    } catch (error) {
        console.error('❌ Voucher creation error:', error.response?.data || error.message);
    }
    
    // Check current voucher data
    console.log('\n3. Checking current voucher data...');
    try {
        const voucherResponse = await axios.get('http://localhost:3002/api/getAllVoucherData');
        const vouchers = voucherResponse.data.data;
        const latestVoucher = vouchers[0]; // Most recent voucher
        
        console.log('Latest voucher ID:', latestVoucher.id);
        console.log('Latest voucher additional_information:', latestVoucher.additional_information);
        console.log('Latest voucher additional_information_json:', latestVoucher.additional_information_json);
        
        if (latestVoucher.additional_information_json) {
            console.log('✅ Latest voucher has additional information!');
        } else {
            console.log('❌ Latest voucher missing additional information');
        }
    } catch (error) {
        console.error('❌ Error checking voucher data:', error.response?.data || error.message);
    }
}

// Run the test
testVoucherCreation().catch(console.error);

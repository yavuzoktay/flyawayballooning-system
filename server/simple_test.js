const axios = require('axios');

async function testAdditionalInfo() {
    console.log('=== TESTING ADDITIONAL INFO ENDPOINT ===');
    
    const additionalInfo = {
        notes: "Test notes from API test",
        question_13: "Google",
        question_14: "Yes", 
        question_16: "Champagne"
    };
    
    try {
        const response = await axios.post('http://localhost:3002/api/testAdditionalInfo', {
            additionalInfo: additionalInfo
        });
        console.log('✅ Test endpoint response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Test endpoint error:', error.response?.data || error.message);
    }
}

testAdditionalInfo().catch(console.error);

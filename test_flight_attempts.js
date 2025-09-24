const axios = require('axios');

async function testFlightAttempts() {
    try {
        console.log('Testing flight attempts functionality...');
        
        // First, let's get a list of bookings to find one with a voucher
        const response = await axios.get('http://localhost:5000/api/getAllBookingData');
        const bookings = response.data.data;
        
        console.log('Found bookings:', bookings.length);
        
        // Find a booking with a voucher code
        const bookingWithVoucher = bookings.find(b => b.voucher_code && b.voucher_code.trim() !== '');
        
        if (!bookingWithVoucher) {
            console.log('No booking with voucher code found');
            return;
        }
        
        console.log('Found booking with voucher:', {
            id: bookingWithVoucher.id,
            name: bookingWithVoucher.name,
            voucher_code: bookingWithVoucher.voucher_code,
            status: bookingWithVoucher.status,
            flight_attempts: bookingWithVoucher.flight_attempts
        });
        
        // Test cancelling this booking
        console.log('Testing cancellation...');
        const cancelResponse = await axios.patch('http://localhost:5000/api/updateBookingField', {
            booking_id: bookingWithVoucher.id,
            field: 'status',
            value: 'Cancelled'
        });
        
        console.log('Cancel response:', cancelResponse.data);
        
        // Wait a moment and check the updated booking
        setTimeout(async () => {
            try {
                const updatedResponse = await axios.get('http://localhost:5000/api/getAllBookingData');
                const updatedBookings = updatedResponse.data.data;
                const updatedBooking = updatedBookings.find(b => b.id === bookingWithVoucher.id);
                
                console.log('Updated booking after cancellation:', {
                    id: updatedBooking.id,
                    name: updatedBooking.name,
                    status: updatedBooking.status,
                    flight_attempts: updatedBooking.flight_attempts
                });
            } catch (error) {
                console.error('Error checking updated booking:', error.message);
            }
        }, 2000);
        
    } catch (error) {
        console.error('Test error:', error.message);
    }
}

testFlightAttempts();

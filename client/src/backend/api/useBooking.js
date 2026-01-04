import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const useBooking = () => {
  const [booking, setBooking] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFlights = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching booking data from:', axios.defaults.baseURL + '/api/getAllBookingData');
      const response = await axios.get("/api/getAllBookingData");
      console.log('API response:', response);
      console.log('Response data:', response.data);
      setBooking(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      console.error("Error fetching flights:", error);
      console.error("Error details:", error.response);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  return { booking, loading, refetch: fetchFlights };
};

export default useBooking;

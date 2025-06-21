import { useState, useEffect } from "react";
import axios from "axios";

const useBooking = () => {
  const [booking, setBooking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        const response = await axios.get("/api/getAllBookingData");
        setBooking(Array.isArray(response.data.data) ? response.data.data : []);
      } catch (error) {
        console.error("Error fetching flights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();
  }, []);

  return { booking, loading };
};

export default useBooking;

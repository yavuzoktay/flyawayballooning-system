import { useState, useEffect } from "react";
import axios from "axios";

const useBooking = () => {
  const [booking, setBooking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        const response = await axios.get("http://54.164.254.222:3000/api/getAllBookingData");
        setBooking(response.data.data);
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

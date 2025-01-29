import { useState, useEffect } from "react";
import axios from "axios";

const usePessanger = () => {
  const [passenger, setPassenger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        const response = await axios.get("/api/getAllPassengers");
        setPassenger(response.data.data);
      } catch (error) {
        console.error("Error fetching flights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();
  }, []);

  return { passenger, loading };
};

export default usePessanger;

import { useState, useEffect } from "react";
import axios from "axios";

const useActivity = () => {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await axios.get("/api/getAllActivity");
        setActivity(Array.isArray(response.data.data) ? response.data.data : []);
      } catch (error) {
        console.error("Error fetching flights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  return { activity, loading };
};

export default useActivity;

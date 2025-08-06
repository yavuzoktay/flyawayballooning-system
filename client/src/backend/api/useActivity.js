import { useState, useEffect } from "react";
import axios from "axios";

const useActivity = () => {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await axios.get("/api/activities");
        if (response.data.success && Array.isArray(response.data.data)) {
          setActivity(response.data.data);
        } else {
          console.error("Invalid response format:", response.data);
          setActivity([]);
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
        setActivity([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  return { activity, loading };
};

export default useActivity;

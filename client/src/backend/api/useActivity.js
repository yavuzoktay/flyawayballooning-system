import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const useActivity = () => {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get("/api/activities");
      console.log("useActivity API Response:", response.data);

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setActivity(response.data.data);
      } else {
        console.error("Invalid response format:", response.data);
        setActivity([]);
        setError("Invalid response format from API");
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      setActivity([]);
      setError("Failed to fetch activities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const safeActivity = Array.isArray(activity) ? activity : [];

  return { activity: safeActivity, loading, error, setActivity, refetch: fetchActivity };
};

export default useActivity;

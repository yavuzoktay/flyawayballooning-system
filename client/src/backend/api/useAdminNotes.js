import { useState, useEffect } from "react";
import axios from "axios";

const useAdminNotes = () => {
  const [adminNotes, setAdminNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await axios.get("/api/getAdminNotes");        
        setAdminNotes(response.data.data);
      } catch (error) {
        console.error("Error fetching flights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  return { adminNotes, loading };
};

export default useAdminNotes;

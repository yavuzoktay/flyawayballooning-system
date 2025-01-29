import { useState, useEffect } from "react";
import axios from "axios";

const useVoucher = () => {
  const [voucher, setVoucher] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVoucher = async () => {
      try {
        const response = await axios.get("/api/getAllVoucher");
        setVoucher(response.data.data);
      } catch (error) {
        console.error("Error fetching flights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVoucher();
  }, []);

  return { voucher, loading };
};

export default useVoucher;

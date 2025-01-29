import React from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

const TimeSlotSelect = ({ timeSlot, setTimeSlot }) => {
  // Function to generate time slots
  const generateTimeSlots = () => {
    const slots = [];
    let date = new Date();
    date.setHours(0, 0, 0, 0); // Start at 00:00 (midnight)

    for (let i = 0; i < 48; i++) {
      let hour = date.getHours();
      let minutes = date.getMinutes();
      const timeLabel = `${hour % 12 || 12}:${minutes === 0 ? "00" : minutes} ${
        hour < 12 ? "AM" : "PM"
      }`;
      slots.push(timeLabel);
      date.setMinutes(date.getMinutes() + 30); // Increment by 30 minutes
    }

    return slots;
  };

  // Handle change in selected time slot
  const handleTimeSlotChange = (event) => {
    setTimeSlot(event.target.value);
  };

  return (
    <FormControl fullWidth>
      <InputLabel id="time-slot-select-label">Select Time Slot</InputLabel>
      <Select
        labelId="time-slot-select-label"
        id="time-slot-select"
        value={timeSlot || ""}
        label="Select Time Slot"
        onChange={handleTimeSlotChange}
      >
        {generateTimeSlots().map((time, index) => (
          <MenuItem key={index} value={time}>
            {time}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default TimeSlotSelect;

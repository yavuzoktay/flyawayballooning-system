import { FormControl, InputLabel, MenuItem, OutlinedInput, Select } from "@mui/material";
import React from "react";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

const SpecificLocation = ({ defaultLocation, setDefaultLocation }) => {
    const locations = ["Bath", "Somerset", "Devon", "Bristol Fiesta"];

    // Handle Default Location Change
    const handleDefaultLocationChange = (event) => {
        const {
            target: { value },
        } = event;
        setDefaultLocation(
            // On autofill, we get a stringified value.
            typeof value === "string" ? value.split(",") : value
        );
    };

    return (
        <FormControl sx={{ m: 1, width: 300 }}>
            <InputLabel id="default-location-label">Select Default Location</InputLabel>
            <Select
                labelId="default-location-label"
                id="default-location"
                multiple
                value={defaultLocation}
                onChange={handleDefaultLocationChange}
                input={<OutlinedInput label="Select Default Location" />}
                MenuProps={MenuProps}
            >
                {locations.map((item) => (
                    <MenuItem key={item} value={item}>
                        {item}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default SpecificLocation;

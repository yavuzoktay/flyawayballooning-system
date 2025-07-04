import { Container } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useActivity from "../api/useActivity";
import SpecificActivityPage from "../components/SpecificActivityPage/SpecificActivityPage";

const SpecificActivity = () => {
    const { name, location, type } = useParams();
    const {activity, loading: activityLoading} = useActivity();
    const [activityData, setActivityData] = useState(null);

    useEffect(() => {
        if(!activityLoading){
            const data = activity.filter((item) => item.activity_name === name && item.location === location && item.flight_type === type);
            setActivityData(data);
        }
    }, [activity, activityLoading, name, location, type]);
     
    return (
        <div className="specific-activity-page-wrap">
            <Container maxWidth="xl">
                <div className="heading-wrap">
                    <h2>
                        SPECIFIC ACTIVITY
                    </h2>
                    <hr />
                </div>
                <div className="specific-activity-body-wrap">
                    <SpecificActivityPage activityData={activityData} />
                </div>
            </Container>
        </div>
    )
}

export default SpecificActivity;
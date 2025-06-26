import { Container } from "@mui/material";
import React from "react";
import ActivityList from "../components/ActivityPage/ActivityList";
import useActivity from "../api/useActivity";

const Activity = () => {
    const {activity, loading: activityLoading} = useActivity();

    return (
        <div className="activity-page-wrap">
            <Container maxWidth="xl">
                <div className="heading-wrap">
                    <h2>
                        ACTIVITY
                    </h2>
                    <hr />
                </div>
                <div className="activity-body-wrap">
                    <ActivityList activity={activity} />
                </div>
            </Container>
        </div>
    )
}

export default Activity;
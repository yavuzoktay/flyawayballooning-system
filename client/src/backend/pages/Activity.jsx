import { Container } from "@mui/material";
import React from "react";
import ActivityList from "../components/ActivityPage/ActivityList";
import useActivity from "../api/useActivity";

const Activity = () => {
    const {activity, loading, error} = useActivity();

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
                    {error ? (
                        <div style={{ color: 'red', padding: '20px' }}>
                            Error: {error}
                        </div>
                    ) : (
                        <ActivityList activity={activity} />
                    )}
                </div>
            </Container>
        </div>
    )
}

export default Activity;
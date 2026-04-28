import { Box, CircularProgress, Container, Paper, Typography } from "@mui/material";
import React from "react";
import ActivityList from "../components/ActivityPage/ActivityList";
import useActivity from "../api/useActivity";

const Activity = () => {
    const { activity, loading, error, setActivity } = useActivity();

    return (
        <div className="activity-page-wrap">
            <Container maxWidth={false}>
                <Box sx={{ mb: 3 }}>
                    <Typography
                        variant="h3"
                        sx={{
                            fontSize: { xs: "28px", md: "32px" },
                            fontWeight: 700,
                            letterSpacing: "0.01em",
                            color: "#111827",
                            mb: 1
                        }}
                    >
                        ACTIVITY
                    </Typography>
                    <Box sx={{ height: 1, bgcolor: "#dbe4f0", borderRadius: 999 }} />
                </Box>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, md: 4 },
                        background: "linear-gradient(180deg, #f7faff 0%, #f4f7fc 100%)",
                        borderRadius: "24px",
                        border: "1px solid rgba(148, 163, 184, 0.18)",
                        boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)"
                    }}
                    className="activity-body-wrap"
                >
                    {loading && !error ? (
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <div style={{ color: 'red', padding: '20px' }}>
                            Error: {error}
                        </div>
                    ) : (
                        <ActivityList activity={activity} setActivity={setActivity} />
                    )}
                </Paper>
            </Container>
        </div>
    )
}

export default Activity;

import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    TextField,
    Typography
} from '@mui/material';

const createEmptyPassengers = (count) =>
    Array.from({ length: Math.max(1, count || 1) }, () => ({
        first_name: '',
        last_name: '',
        weight: ''
    }));

const CustomerPortalUpsellModal = ({
    open,
    offer,
    submitting = false,
    onClose,
    onSubmit
}) => {
    const requiredPassengerCount = Math.max(1, offer?.requiredPassengerCount || 1);
    const [passengers, setPassengers] = useState(() => createEmptyPassengers(requiredPassengerCount));
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (open) {
            setPassengers(createEmptyPassengers(requiredPassengerCount));
            setFormError('');
        }
    }, [open, requiredPassengerCount, offer?.mode]);

    const summaryRows = useMemo(() => {
        if (!offer) return [];

        if (offer.mode === 'private_upgrade') {
            return [
                { label: 'Seats to fill', value: String(offer.requiredPassengerCount || requiredPassengerCount) },
                { label: 'Current booking total', value: `£${Number(offer.currentBookingBaseTotal || 0).toFixed(2)}` },
                { label: 'Private balloon total', value: `£${Number(offer.privateEightPrice || 0).toFixed(2)}` },
                { label: 'Amount to pay now', value: `£${Number(offer.totalCharge || 0).toFixed(2)}` }
            ];
        }

        return [
            { label: 'Standard seat price', value: `£${Number(offer.regularSeatPrice || 0).toFixed(2)}` },
            { label: 'Portal saving', value: `-£${Number(offer.discountAmount || 0).toFixed(2)}` },
            { label: 'Amount to pay now', value: `£${Number(offer.totalCharge || 0).toFixed(2)}` }
        ];
    }, [offer, requiredPassengerCount]);

    const updatePassenger = (index, field, value) => {
        setPassengers((current) =>
            current.map((passenger, passengerIndex) =>
                passengerIndex === index
                    ? {
                        ...passenger,
                        [field]: value
                    }
                    : passenger
            )
        );
    };

    const handleSubmit = async () => {
        const normalizedPassengers = passengers.map((passenger) => ({
            first_name: String(passenger.first_name || '').trim(),
            last_name: String(passenger.last_name || '').trim(),
            weight: String(passenger.weight || '').trim()
        }));

        const hasInvalidPassenger = normalizedPassengers.some((passenger) => {
            const parsedWeight = Number(passenger.weight);
            return (
                !passenger.first_name ||
                !passenger.last_name ||
                !passenger.weight ||
                !Number.isFinite(parsedWeight) ||
                parsedWeight <= 0
            );
        });

        if (hasInvalidPassenger) {
            setFormError('Please complete first name, last name and weight for every passenger.');
            return;
        }

        setFormError('');
        await onSubmit?.(normalizedPassengers);
    };

    return (
        <Dialog
            open={open}
            onClose={submitting ? undefined : onClose}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle sx={{ fontWeight: 700 }}>
                {offer?.mode === 'private_upgrade' ? 'Upgrade Your Balloon' : 'Add Passenger'}
            </DialogTitle>
            <DialogContent dividers>
                {offer?.description && (
                    <Typography variant="body1" sx={{ mb: 2, color: '#334155' }}>
                        {offer.description}
                    </Typography>
                )}

                <Paper
                    elevation={0}
                    sx={{
                        mb: 3,
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid #dbe3ef',
                        background: 'linear-gradient(180deg, rgba(248,250,252,0.95) 0%, rgba(239,246,255,0.95) 100%)'
                    }}
                >
                    {summaryRows.map((row, index) => (
                        <Box
                            key={row.label}
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 2,
                                py: 0.75,
                                borderBottom: index < summaryRows.length - 1 ? '1px solid #e2e8f0' : 'none'
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                {row.label}
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                {row.value}
                            </Typography>
                        </Box>
                    ))}
                </Paper>

                {formError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {formError}
                    </Alert>
                )}

                <Box sx={{ display: 'grid', gap: 2 }}>
                    {passengers.map((passenger, index) => (
                        <Paper
                            key={`upsell-passenger-${index}`}
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                border: '1px solid #e5e7eb',
                                backgroundColor: '#fff'
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                                Passenger {index + 1}
                            </Typography>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                                    gap: 1.5
                                }}
                            >
                                <TextField
                                    label="First Name"
                                    value={passenger.first_name}
                                    onChange={(event) => updatePassenger(index, 'first_name', event.target.value)}
                                    fullWidth
                                    size="small"
                                />
                                <TextField
                                    label="Last Name"
                                    value={passenger.last_name}
                                    onChange={(event) => updatePassenger(index, 'last_name', event.target.value)}
                                    fullWidth
                                    size="small"
                                />
                                <TextField
                                    label="Weight (kg)"
                                    value={passenger.weight}
                                    onChange={(event) => updatePassenger(index, 'weight', event.target.value.replace(/[^0-9.]/g, ''))}
                                    fullWidth
                                    size="small"
                                    inputProps={{ inputMode: 'decimal', pattern: '[0-9.]*' }}
                                />
                            </Box>
                        </Paper>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={submitting} color="inherit">
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    {submitting ? 'Redirecting...' : `Pay £${Number(offer?.totalCharge || 0).toFixed(2)}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CustomerPortalUpsellModal;

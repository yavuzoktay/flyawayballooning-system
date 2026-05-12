import React, { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Radio,
    Typography
} from '@mui/material';

const formatCurrency = (amount) => `£${Number(amount || 0).toFixed(2)}`;

const CustomerPortalVoucherUpgradeModal = ({
    open,
    currentLabel,
    options = [],
    submitting = false,
    onClose,
    onSubmit
}) => {
    const [selectedType, setSelectedType] = useState('');
    const [formError, setFormError] = useState('');

    const selectedOption = useMemo(() => {
        if (!selectedType) return options[0] || null;
        return options.find((option) => option.targetType === selectedType) || options[0] || null;
    }, [options, selectedType]);

    React.useEffect(() => {
        if (open) {
            setSelectedType(options[0]?.targetType || '');
            setFormError('');
        }
    }, [open, options]);

    const handleSubmit = async () => {
        const option = selectedOption;
        if (!option?.targetType) {
            setFormError('Please select an upgrade option.');
            return;
        }

        setFormError('');
        await onSubmit?.(option);
    };

    return (
        <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 700 }}>
                Upgrade Voucher
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="body1" sx={{ mb: 2, color: '#334155' }}>
                    {currentLabel ? `${currentLabel} voucher` : 'Your voucher'}
                </Typography>

                {formError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {formError}
                    </Alert>
                )}

                <Box sx={{ display: 'grid', gap: 1.5 }}>
                    {options.map((option) => {
                        const isSelected = selectedOption?.targetType === option.targetType;

                        return (
                            <Paper
                                key={option.targetType}
                                elevation={0}
                                onClick={() => !submitting && setSelectedType(option.targetType)}
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: isSelected ? '#2e7d32' : '#dbe3ef',
                                    backgroundColor: isSelected ? '#f0fdf4' : '#fff',
                                    cursor: submitting ? 'default' : 'pointer'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Radio
                                        checked={isSelected}
                                        value={option.targetType}
                                        onChange={() => setSelectedType(option.targetType)}
                                        disabled={submitting}
                                        sx={{ p: 0.25, mt: 0.25 }}
                                    />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                            {option.currentLabel} to {option.targetLabel}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                                            {option.passengerCount} passenger{Number(option.passengerCount) === 1 ? '' : 's'} x {formatCurrency(Number(option.targetUnitPrice || 0) - Number(option.currentUnitPrice || 0))}
                                        </Typography>
                                    </Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#14532d' }}>
                                        {formatCurrency(option.totalCharge)}
                                    </Typography>
                                </Box>
                            </Paper>
                        );
                    })}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={submitting} color="inherit">
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting || options.length === 0}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    {submitting ? 'Redirecting...' : `Pay ${formatCurrency(selectedOption?.totalCharge || 0)}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CustomerPortalVoucherUpgradeModal;

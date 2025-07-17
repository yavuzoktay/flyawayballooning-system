import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Table, TableHead, TableRow, TableCell, TableBody, Container, Chip } from '@mui/material';
import CreateAvailabilitiesModal from './CreateAvailabilitiesModal';
import axios from 'axios';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import Checkbox from '@mui/material/Checkbox';

const columns = [
    { key: 'schedule', label: 'Schedule' },
    { key: 'date', label: 'Date' },
    { key: 'day_of_week', label: 'Day of Week' },
    { key: 'time', label: 'Time' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'available', label: 'Available' },
    { key: 'status', label: 'Status' },
    { key: 'channels', label: 'Channels' },
];

const ActivityAvailabilitiesPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const activityName = 'Somerset Private'; // İleride API'den çekilebilir
    const [modalOpen, setModalOpen] = useState(false);
    const [availabilities, setAvailabilities] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);
    const [editDate, setEditDate] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);

    useEffect(() => {
        axios.get(`/api/activity/${id}/availabilities`).then(res => {
            if (res.data.success) setAvailabilities(res.data.data);
        });
    }, [id]);

    const handleRowClick = (row) => {
        setSelectedRow(row);
        setEditDate(row.date);
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        await axios.put(`/api/availability/${selectedRow.id}`, { date: editDate });
        setEditOpen(false);
        // Tabloyu güncelle
        axios.get(`/api/activity/${id}/availabilities`).then(res => {
            if (res.data.success) setAvailabilities(res.data.data);
        });
    };

    const handleDelete = async () => {
        await axios.delete(`/api/availability/${selectedRow.id}`);
        setEditOpen(false);
        // Tabloyu güncelle
        axios.get(`/api/activity/${id}/availabilities`).then(res => {
            if (res.data.success) setAvailabilities(res.data.data);
        });
    };

    const handleStatusToggle = async (availabilityId, currentStatus, event) => {
        event.stopPropagation(); // Prevent row click
        const newStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
        
        try {
            await axios.patch(`/api/availability/${availabilityId}/status`, { status: newStatus });
            // Update local state immediately for better UX
            setAvailabilities(prev => prev.map(avail => 
                avail.id === availabilityId ? { ...avail, status: newStatus } : avail
            ));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status. Please try again.');
        }
    };

    const handleCheckboxChange = (id) => {
        setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
    };
    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedRows(availabilities.map(row => row.id));
        } else {
            setSelectedRows([]);
        }
    };
    const handleBulkDelete = async () => {
        await Promise.all(selectedRows.map(id => axios.delete(`/api/availability/${id}`)));
        setSelectedRows([]);
        // Refresh table
        axios.get(`/api/activity/${id}/availabilities`).then(res => {
            if (res.data.success) setAvailabilities(res.data.data);
        });
    };

    return (
        <Container maxWidth="lg" style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Button variant="outlined" onClick={() => navigate(-1)}>&larr; Back</Button>
                    <h2 style={{ margin: 0 }}>Availabilities</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={selectedRows.length === 0}
                        onClick={handleBulkDelete}
                    >
                        Delete
                    </Button>
                    <Button variant="contained" color="primary" onClick={() => setModalOpen(true)}>Create</Button>
                </div>
            </div>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell padding="checkbox">
                            <Checkbox
                                indeterminate={selectedRows.length > 0 && selectedRows.length < availabilities.length}
                                checked={availabilities.length > 0 && selectedRows.length === availabilities.length}
                                onChange={handleSelectAll}
                            />
                        </TableCell>
                        {columns.map(col => <TableCell key={col.key}>{col.label}</TableCell>)}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {availabilities.map(row => (
                        <TableRow key={row.id} hover style={{ cursor: 'pointer' }} onClick={() => handleRowClick(row)}>
                            <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                                <Checkbox
                                    checked={selectedRows.includes(row.id)}
                                    onChange={() => handleCheckboxChange(row.id)}
                                />
                            </TableCell>
                            <TableCell>{row.schedule || ''}</TableCell>
                            <TableCell>
                                {row.date ? (
                                    <a
                                        href={`http://44.202.155.45:3002/manifest?date=${dayjs(row.date).format('YYYY-MM-DD')}`}
                                        style={{ color: '#3274b4', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {new Date(row.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}
                                    </a>
                                ) : ''}
                            </TableCell>
                            <TableCell>{row.day_of_week}</TableCell>
                            <TableCell>{row.time ? row.time.slice(0,5) : ''}</TableCell>
                            <TableCell>{row.capacity}</TableCell>
                            <TableCell>{row.available}</TableCell>
                            <TableCell>
                                <Chip 
                                    label={row.status} 
                                    color={row.status === 'Open' ? 'success' : 'default'} 
                                    size="small"
                                    onClick={(e) => handleStatusToggle(row.id, row.status, e)}
                                    style={{ cursor: 'pointer' }}
                                />
                            </TableCell>
                            <TableCell>
                                <Chip label={row.channels} color="success" size="small" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <CreateAvailabilitiesModal open={modalOpen} onClose={() => setModalOpen(false)} activityName={activityName} activityId={id} onCreated={() => {
                axios.get(`/api/activity/${id}/availabilities`).then(res => {
                    if (res.data.success) setAvailabilities(res.data.data);
                });
            }} />
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    Availability for {selectedRow ? `${dayjs(selectedRow.date).format('DD/MM/YYYY')} at ${selectedRow.time ? selectedRow.time.slice(0,5) : ''}` : ''}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        label="Start Date"
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Back</Button>
                    <IconButton onClick={handleDelete} color="error"><DeleteIcon /></IconButton>
                    <Button onClick={handleEditSave} variant="contained" color="primary">Save</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ActivityAvailabilitiesPage; 
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Refresh as RefreshIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import axios from 'axios';
import dayjs from 'dayjs';

const Logs = () => {
  // Mobile detection
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    level: 'all',
    search: '',
  });
  const [filteredLogs, setFilteredLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchLogs();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/logs');
      if (response.data.success) {
        // Get last 24 hours of logs (errors, warnings, and Google Ads info logs)
        const last24Hours = dayjs().subtract(24, 'hours');
        const errorLogs = response.data.data.filter(log => {
          const logDate = dayjs(log.created_at);
          const isRecent = logDate.isAfter(last24Hours);
          const isErrorOrWarning = log.level === 'error' || log.level === 'warning';
          const isGoogleAdsInfo = log.level === 'info' && log.source && log.source.includes('googleAds');
          return isRecent && (isErrorOrWarning || isGoogleAdsInfo);
        });
        setLogs(errorLogs);
      } else {
        setError('Failed to fetch logs');
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Error fetching logs: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Filter by level
    if (filter.level !== 'all') {
      filtered = filtered.filter(log => log.level === filter.level);
    }

    // Filter by search term
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(log => 
        (log.message && log.message.toLowerCase().includes(searchLower)) ||
        (log.source && log.source.toLowerCase().includes(searchLower)) ||
        (log.stack && log.stack.toLowerCase().includes(searchLower))
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = dayjs(a.created_at);
      const dateB = dayjs(b.created_at);
      return dateB.isAfter(dateA) ? 1 : -1;
    });

    setFilteredLogs(filtered);
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return dayjs(dateString).format('DD/MM/YYYY HH:mm:ss');
  };

  return (
    <div className="logs-page-wrap">
      <Container maxWidth={false}>
        <div className="heading-wrap">
          <h2>LOGS</h2>
          <hr />
        </div>
        <Box sx={{ padding: isMobile ? 1 : 2, background: "#f9f9f9", borderRadius: isMobile ? "12px" : "20px" }}>
          {/* Header with filters */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isMobile ? 2 : 3, flexWrap: 'wrap', gap: isMobile ? 1 : 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, fontSize: isMobile ? '16px' : undefined }}>
              Error Logs (Last 24 Hours)
            </Typography>
            <Box sx={{ display: 'flex', gap: isMobile ? 1 : 2, alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
              <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 120, width: isMobile ? '100%' : 'auto' }}>
                <InputLabel>Level</InputLabel>
                <Select
                  value={filter.level}
                  label="Level"
                  onChange={(e) => setFilter({ ...filter, level: e.target.value })}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                placeholder="Search logs..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                sx={{ minWidth: isMobile ? '100%' : 200, width: isMobile ? '100%' : 'auto' }}
              />
              <Tooltip title="Refresh logs">
                <IconButton onClick={fetchLogs} color="primary" sx={{ flexShrink: 0 }}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <CircularProgress />
            </Box>
          ) : filteredLogs.length === 0 ? (
            <Box sx={{ textAlign: 'center', padding: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No logs found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {filter.level !== 'all' || filter.search ? 'Try adjusting your filters' : 'No error logs in the last 24 hours'}
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: isMobile ? '60vh' : '70vh', overflow: 'auto' }} className="logs-table-container">
              <Table stickyHeader sx={{ minWidth: isMobile ? 800 : 'auto' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, minWidth: isMobile ? 120 : 150 }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: isMobile ? 70 : 100 }}>Level</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: isMobile ? 100 : 150 }}>Source</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: isMobile ? 200 : 'auto' }}>Message</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: isMobile ? 150 : 200 }}>Stack Trace</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLogs.map((log, index) => (
                    <TableRow key={index} hover>
                      <TableCell sx={{ fontSize: isMobile ? '9px' : undefined }}>{formatDate(log.created_at)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={log.level || 'unknown'} 
                          color={getLevelColor(log.level)} 
                          size="small"
                          sx={{ fontSize: isMobile ? '9px' : undefined, height: isMobile ? '20px' : undefined }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: isMobile ? '9px' : undefined, wordBreak: 'break-all' }}>{log.source || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ maxWidth: isMobile ? '100%' : 400, wordBreak: 'break-word', fontSize: isMobile ? '9px' : undefined }}>
                          {log.message || '-'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ maxWidth: isMobile ? '100%' : 500, wordBreak: 'break-word', fontSize: isMobile ? '8px' : '0.85rem', fontFamily: 'monospace' }}>
                          {log.stack ? (
                            <details>
                              <summary style={{ cursor: 'pointer', color: '#3274b4', fontSize: isMobile ? '9px' : undefined }}>
                                Show stack trace
                              </summary>
                              <pre style={{ marginTop: isMobile ? 4 : 8, whiteSpace: 'pre-wrap', fontSize: isMobile ? '7px' : undefined, padding: isMobile ? '4px' : undefined }}>
                                {log.stack}
                              </pre>
                            </details>
                          ) : '-'}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {!loading && filteredLogs.length > 0 && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredLogs.length} of {logs.length} logs
              </Typography>
            </Box>
          )}
        </Box>
      </Container>
    </div>
  );
};

export default Logs;





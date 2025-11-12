import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simple hardcoded credentials for now
        if (username === 'Flyawayballooning' && password === 'cevcov-5FABys-kaafds') {
            localStorage.setItem('fab_admin_auth', 'true');
            const redirectTo = location.state?.from || '/';
            navigate(redirectTo, { replace: true });
        } else {
            setError('Invalid username or password');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f3f4f6'
        }}>
            <form onSubmit={handleSubmit} style={{
                width: '100%',
                maxWidth: 380,
                background: '#fff',
                padding: 24,
                borderRadius: 12,
                boxShadow: '0 6px 24px rgba(0,0,0,0.08)'
            }}>
                <h2 style={{ margin: 0, marginBottom: 16, fontSize: 22, color: '#111827' }}>Admin Login</h2>
                <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Flyawayballooning"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••••"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}
                    />
                </div>
                {error && (
                    <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>{error}</div>
                )}
                <button type="submit" style={{
                    width: '100%',
                    background: '#2563eb',
                    color: '#fff',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600
                }}>Login</button>
            </form>
        </div>
    );
};

export default Login;



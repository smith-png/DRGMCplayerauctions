import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socket';
import './Login.css';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'player' });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);

    const { login, register, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => { setIsLogin(location.pathname === '/login'); }, [location]);
    useEffect(() => { if (user) navigate('/'); }, [user, navigate]);

    useEffect(() => {
        const fetchInitialState = async () => {
            try {
                const res = await auctionAPI.getAuctionState();
                setIsRegistrationClosed(!res.data.isRegistrationOpen);
            } catch (err) { console.error('Failed to fetch auction state'); }
        };
        fetchInitialState();

        socketService.connect();
        socketService.on('registration-state-change', (data) => {
            setIsRegistrationClosed(!data.isOpen);
        });

        return () => {
            socketService.off('registration-state-change');
        };
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                await login(formData.email, formData.password);
            } else {
                await register(formData.name, formData.email, formData.password, formData.role);
            }
            navigate('/');
        } catch (err) {
            // Check for specific backend "Lockout" code
            if (err.response?.data?.code === 'REGISTRATION_CLOSED') {
                setIsRegistrationClosed(true);
            } else {
                setError(err.response?.data?.error || 'Authentication failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-viewport">
            <div className="login-visual-side">
                <div className="pan-image-container"></div>
                <div className="visual-overlay">
                    <h1 className="visual-brand">PLAYER<br />AUCTION<br />SYSTEM</h1>
                </div>
            </div>
            <div className="login-form-side">
                <div className="form-container">
                    {(isRegistrationClosed && !isLogin) ? (
                        <div className="lockout-container">
                            <h3 className="lockout-title">SYSTEM<br />LOCKED</h3>
                            <p className="lockout-message">NEW USER REGISTRATION IS CURRENTLY DISABLED BY ADMINISTRATION.</p>
                            <button onClick={() => navigate('/login')} className="lockout-btn">
                                RETURN TO LOGIN
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="form-header">
                                <span className="form-subtitle">PLAYER AUCTION SYSTEM</span>
                                <h2 className="form-title">{isLogin ? 'MEMBER LOGIN' : 'RECRUITMENT'}</h2>
                            </div>

                            {error && <div className="error-message">{error}</div>}

                            <form onSubmit={handleSubmit} className="registration-form">
                                {!isLogin && (
                                    <div className="input-group">
                                        <label className="input-label">FULL NAME</label>
                                        <input type="text" name="name" placeholder="E.G. JOHN DOE" value={formData.name} onChange={handleChange} required className="input" />
                                    </div>
                                )}
                                <div className="input-group">
                                    <label className="input-label">EMAIL ADDRESS</label>
                                    <input type="email" name="email" placeholder="USER@EXAMPLE.COM" value={formData.email} onChange={handleChange} required className="input" />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">SECURE PASSWORD</label>
                                    <div className="input-wrapper">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            className="input"
                                        />
                                        <button
                                            type="button"
                                            className="password-seek-btn"
                                            style={{ color: '#1A1A1A', opacity: 0.5, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', fontWeight: 800 }}
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? "HIDE" : "SHOW"}
                                        </button>
                                    </div>
                                </div>

                                {!isLogin && (
                                    <div className="role-selector">
                                        <label className="input-label">ACCESS ROLE</label>
                                        <div className="role-options">
                                            {['player', 'viewer'].map((role) => (
                                                <button key={role} type="button" className={`role-btn ${formData.role === role ? 'active' : ''}`} onClick={() => setFormData({ ...formData, role })}>
                                                    {role}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'AUTHORIZING...' : (isLogin ? 'ENTER TERMINAL' : 'RECRUIT ME')}
                                </button>
                            </form>

                            <div className="form-footer">
                                {isLogin ? (
                                    <p>NEW USER? <span onClick={() => navigate('/register')} className="link-text">SIGN UP</span></p>
                                ) : (
                                    <p>ALREADY A MEMBER? <span onClick={() => navigate('/login')} className="link-text">ACCESS TERMINAL</span></p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

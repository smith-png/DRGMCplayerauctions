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
                <div className="visual-overlay">
                    <h1 className="visual-brand">DRGMC<br />ARCHIVE</h1>
                    <div className="visual-meta"><span>EST. 2026</span><span>OFFICIAL AUCTION TERMINAL</span></div>
                </div>
            </div>
            <div className="login-form-side">
                <div className="form-container">
                    {(isRegistrationClosed && !isLogin) ? (
                        <div className="lockout-container">
                            <div className="lockout-icon">✕</div>
                            <h3 className="lockout-title">SYSTEM LOCKED</h3>
                            <p className="lockout-message">NEW USER REGISTRATION IS CURRENTLY DISABLED BY ADMINISTRATION.</p>
                            <button onClick={() => navigate('/login')} className="lockout-btn">
                                RETURN TO LOGIN
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="form-header">
                                <span className="form-subtitle">WELCOME BACK</span>
                                <h2 className="form-title">{isLogin ? 'MEMBER ACCESS' : 'NEW REGISTRATION'}</h2>
                            </div>
                            {error && <div className="error-message">{error}</div>}
                            <form onSubmit={handleSubmit} className="editorial-form">
                                {!isLogin && (
                                    <div className="input-group">
                                        <input type="text" name="name" placeholder="FULL NAME" value={formData.name} onChange={handleChange} required className="editorial-input" />
                                        <div className="input-underline"></div>
                                    </div>
                                )}
                                <div className="input-group">
                                    <input type="email" name="email" placeholder="EMAIL ADDRESS" value={formData.email} onChange={handleChange} required className="editorial-input" />
                                    <div className="input-underline"></div>
                                </div>
                                <div className="input-group">
                                    <div className="input-wrapper">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="PASSWORD"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            className="editorial-input"
                                        />
                                        <button
                                            type="button"
                                            className="password-seek-btn"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? "HIDE" : "SHOW"}
                                        </button>
                                    </div>
                                    <div className="input-underline"></div>
                                </div>
                                {!isLogin && (
                                    <div className="role-selector">
                                        <span className="role-label">I AM REGISTERING AS:</span>
                                        <div className="role-options">
                                            {['player', 'viewer'].map((role) => (
                                                <button key={role} type="button" className={`role-btn ${formData.role === role ? 'active' : ''}`} onClick={() => setFormData({ ...formData, role })}>
                                                    {role}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <button type="submit" className="submit-btn" disabled={loading}>
                                    {loading ? 'PROCESSING...' : (isLogin ? 'ENTER TERMINAL' : 'SUBMIT APPLICATION')}
                                </button>
                            </form>
                            <div className="form-footer">
                                {isLogin ? <p>New User? <span onClick={() => navigate('/register')} className="link-text">Sign UP</span></p> : <p>Already a Member? <span onClick={() => navigate('/login')} className="link-text">Access Terminal</span></p>}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

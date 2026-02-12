import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { playerAPI, auctionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './PlayerRegistration.css';

// Design Migration Confirmed
export default function PlayerRegistration() {
    const [formData, setFormData] = useState({
        name: '',
        sport: 'cricket',
        year: '1st',
        stats: {}
    });
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
    const [checkingStatus, setCheckingStatus] = useState(true);

    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await auctionAPI.getAuctionState();
                setIsRegistrationOpen(response.data.isRegistrationOpen ?? true);
            } catch (err) {
                console.error('Failed to check registration status', err);
            } finally {
                setCheckingStatus(false);
            }
        };
        checkStatus();
    }, []);

    const sportStats = {
        cricket: ['Batting Average', 'Bowling Average', 'Matches Played', 'Highest Score'],
        futsal: ['Goals Scored', 'Assists', 'Matches Played', 'Position'],
        volleyball: ['Spikes', 'Blocks', 'Matches Played', 'Position']
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleStatChange = (statName, value) => {
        setFormData(prevData => ({
            ...prevData,
            stats: {
                ...prevData.stats,
                [statName]: value
            }
        }));
    };

    const handleStatsChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            stats: {
                ...prev.stats,
                [name]: value
            }
        }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('sport', formData.sport);
            data.append('year', formData.year);
            data.append('stats', JSON.stringify(formData.stats));
            if (photo) {
                data.append('photo', photo);
            }

            await playerAPI.createPlayer(data);
            setSuccess('Player registered successfully! Awaiting admin approval.');

            // Reset form
            setFormData({
                name: '',
                sport: 'cricket',
                year: '1st',
                stats: {}
            });
            setPhoto(null);
            setPhotoPreview(null);

            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to register player');
        } finally {
            setLoading(false);
        }
    };

    if (checkingStatus) {
        return (
            <div className="player-registration-page">
                <div className="container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (!isRegistrationOpen) {
        return (
            <div className="player-registration-page">
                <div className="container">
                    <div className="registration-closed-card card text-center" style={{ padding: '4rem 2rem', marginTop: '4rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
                        <h1>Registration Closed</h1>
                        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            Player registration is currently paused by the administrator.
                            <br />Please check back later or contact the auction committee.
                        </p>
                        <button onClick={() => navigate('/')} className="btn btn-primary">Return to Home</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="player-registration-page">
            <div className="registration-visual-side">
                <div className="pan-image-container"></div>
                <div className="visual-overlay">
                    <h1 className="visual-brand">PLAYER<br />AUCTION<br />SYSTEM</h1>
                </div>
            </div>
            <div className="registration-form-side">
                <div className="registration-container">
                    <div className="registration-header">
                        <h1>PLAYER AUCTION SYSTEM</h1>
                        <p>OFFICIAL SCOUTING REGISTRATION // 2025</p>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    <form onSubmit={handleSubmit} className="registration-form">
                        <div className="form-section">
                            <h3>01 // IDENTIFICATION</h3>

                            <div className="input-group">
                                <label className="input-label">LEGAL NAME</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="E.G. ALEX JOHNSON"
                                    required
                                />
                            </div>

                            <div className="dropdowns-row">
                                <div className="input-group">
                                    <label className="input-label">SPORT CATEGORY</label>
                                    <select
                                        name="sport"
                                        value={formData.sport}
                                        onChange={handleChange}
                                        className="input"
                                        required
                                    >
                                        <option value="cricket">CRICKET</option>
                                        <option value="futsal">FUTSAL</option>
                                        <option value="volleyball">VOLLEYBALL</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">ACADEMIC YEAR</label>
                                    <select
                                        name="year"
                                        value={formData.year}
                                        onChange={handleChange}
                                        className="input"
                                        required
                                    >
                                        <option value="1st">1ST MBBS</option>
                                        <option value="2nd">2ND MBBS</option>
                                        <option value="3rd">3RD MBBS</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>02 // TECHNICAL SPECS</h3>
                            <div className="dropdowns-row">
                                {formData.sport === 'cricket' && (
                                    <div className="stats-grid-row fade-in" style={{ gridColumn: 'span 2' }}>
                                        {/* role */}
                                        <div className="form-group-minimal">
                                            <label>PRIMARY ROLE</label>
                                            <select
                                                name="role"
                                                value={formData.stats.role || ''}
                                                onChange={handleStatsChange}
                                                className="input-sage-minimal"
                                                required
                                            >
                                                <option value="">SELECT ROLE</option>
                                                <option value="Batsman">Batsman</option>
                                                <option value="Bowler">Bowler</option>
                                                <option value="All-Rounder">All-Rounder</option>
                                            </select>
                                        </div>

                                        {/* Wicketkeeper */}
                                        <div className="form-group-minimal">
                                            <label>WICKETKEEPER</label>
                                            <select
                                                name="wicketkeeper"
                                                value={formData.stats.wicketkeeper || ''}
                                                onChange={handleStatsChange}
                                                className="input-sage-minimal"
                                                required
                                            >
                                                <option value="">SELECT...</option>
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>

                                        {/* Batting Style */}
                                        <div className="form-group-minimal">
                                            <label>BATTING STYLE</label>
                                            <select
                                                name="battingStyle"
                                                value={formData.stats.battingStyle || ''}
                                                onChange={handleStatsChange}
                                                className="input-sage-minimal"
                                                required
                                            >
                                                <option value="">SELECT STYLE</option>
                                                <option value="Right-Hand">Right-Hand Bat</option>
                                                <option value="Left-Hand">Left-Hand Bat</option>
                                            </select>
                                        </div>

                                        {/* Bowling Style */}
                                        <div className="form-group-minimal">
                                            <label>BOWLING STYLE</label>
                                            <select
                                                name="bowlingStyle"
                                                value={formData.stats.bowlingStyle || ''}
                                                onChange={handleStatsChange}
                                                className="input-sage-minimal"
                                                required
                                            >
                                                <option value="">SELECT STYLE</option>
                                                <option value="None">None</option>
                                                <option value="Right-Arm Fast">Right-Arm Fast</option>
                                                <option value="Right-Arm Medium">Right-Arm Medium</option>
                                                <option value="Right-Arm Spin">Right-Arm Spin</option>
                                                <option value="Left-Arm Fast">Left-Arm Fast</option>
                                                <option value="Left-Arm Medium">Left-Arm Medium</option>
                                                <option value="Left-Arm Spin">Left-Arm Spin</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {formData.sport === 'futsal' && (
                                    <div className="input-group">
                                        <label className="input-label">POSITION</label>
                                        <select
                                            value={formData.stats.playingRole || ''}
                                            onChange={(e) => handleStatChange('playingRole', e.target.value)}
                                            className="input"
                                            required
                                        >
                                            <option value="">SELECT</option>
                                            <option value="Goalkeeper">GK</option>
                                            <option value="Defender">DF</option>
                                            <option value="Mid-fielder">MF</option>
                                            <option value="Attacker">AT</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>03 // VISUAL ID</h3>

                            <div className="photo-upload">
                                <input
                                    type="file"
                                    id="photo"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="photo-input"
                                />
                                <label htmlFor="photo" className="photo-label">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" className="photo-preview" />
                                    ) : (
                                        <div className="photo-placeholder">
                                            <span className="upload-icon">📷</span>
                                            <span>UPLOAD BIOMETRIC PHOTO</span>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>

                        <button type="submit" className="btn-submit-scout" disabled={loading}>
                            {loading ? 'PROCESSING...' : 'SUBMIT ENROLLMENT'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

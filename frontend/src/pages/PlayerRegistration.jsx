import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { playerAPI, auctionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './PlayerRegistration.css';

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
            <div className="container">
                <div className="registration-container">
                    <div className="registration-header">
                        <h1>Register as Player</h1>
                        <p>Fill in your details to participate in the auction</p>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    <form onSubmit={handleSubmit} className="registration-form card">
                        <div className="form-section">
                            <h3>Basic Information</h3>

                            <div className="basic-info-container">
                                <div className="input-group name-field">
                                    <label className="input-label">Player Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Enter player name"
                                        required
                                    />
                                </div>

                                <div className="dropdowns-row">
                                    <div className="input-group sport-field">
                                        <label className="input-label">Sport *</label>
                                        <select
                                            name="sport"
                                            value={formData.sport}
                                            onChange={handleChange}
                                            className="input"
                                            required
                                        >
                                            <option value="cricket">Cricket</option>
                                            <option value="futsal">Futsal</option>
                                            <option value="volleyball">Volleyball</option>
                                        </select>
                                    </div>

                                    <div className="input-group year-field">
                                        <label className="input-label">Year *</label>
                                        <select
                                            name="year"
                                            value={formData.year}
                                            onChange={handleChange}
                                            className="input"
                                            required
                                        >
                                            <option value="1st">1st MBBS</option>
                                            <option value="2nd">2nd MBBS</option>
                                            <option value="3rd">3rd MBBS</option>
                                            <option value="4th">4th MBBS</option>
                                            <option value="Intern">Intern</option>
                                        </select>
                                    </div>

                                    {formData.sport === 'cricket' && (
                                        <div className="input-group role-field">
                                            <label className="input-label">Playing Role *</label>
                                            <select
                                                value={formData.stats.playingRole || ''}
                                                onChange={(e) => {
                                                    const newRole = e.target.value;
                                                    handleStatChange('playingRole', newRole);
                                                    if (newRole === 'Wicketkeeper Batsman') {
                                                        handleStatChange('bowlingStyle', 'None');
                                                    }
                                                }}
                                                className="input"
                                                required
                                            >
                                                <option value="">Select Role</option>
                                                <option value="Batsman">Batsman</option>
                                                <option value="Wicketkeeper Batsman">Wicketkeeper Batsman</option>
                                                <option value="Bowler">Bowler</option>
                                                <option value="All Rounder">All Rounder</option>
                                            </select>
                                        </div>
                                    )}

                                    {formData.sport === 'volleyball' && (
                                        <div className="input-group role-field">
                                            <label className="input-label">Preference *</label>
                                            <select
                                                value={formData.stats.playingRole || ''}
                                                onChange={(e) => handleStatChange('playingRole', e.target.value)}
                                                className="input"
                                                required
                                            >
                                                <option value="">Select Preference</option>
                                                <option value="Setter">Setter</option>
                                                <option value="Centre">Centre</option>
                                                <option value="Striker (Right)">Striker (Right)</option>
                                                <option value="Striker (Left)">Striker (Left)</option>
                                                <option value="Defence (Right)">Defence (Right)</option>
                                                <option value="Defence (Left)">Defence (Left)</option>
                                            </select>
                                        </div>
                                    )}

                                    {formData.sport === 'futsal' && (
                                        <div className="input-group role-field">
                                            <label className="input-label">Position *</label>
                                            <select
                                                value={formData.stats.playingRole || ''}
                                                onChange={(e) => handleStatChange('playingRole', e.target.value)}
                                                className="input"
                                                required
                                            >
                                                <option value="">Select Position</option>
                                                <option value="Goalkeeper">Goalkeeper</option>
                                                <option value="Defender">Defender</option>
                                                <option value="Mid-fielder">Mid-fielder</option>
                                                <option value="Attacker">Attacker</option>
                                            </select>
                                        </div>
                                    )}

                                    {formData.sport === 'cricket' && (
                                        <>
                                            <div className="input-group role-field">
                                                <label className="input-label">Batting Style *</label>
                                                <select
                                                    value={formData.stats.battingStyle || ''}
                                                    onChange={(e) => handleStatChange('battingStyle', e.target.value)}
                                                    className="input"
                                                    required
                                                >
                                                    <option value="">Select Batting Style</option>
                                                    <option value="Right Handed">Right Handed</option>
                                                    <option value="Left Handed">Left Handed</option>
                                                </select>
                                            </div>

                                            <div className="input-group role-field">
                                                <label className="input-label">Bowling Style *</label>
                                                <select
                                                    value={formData.stats.bowlingStyle || ''}
                                                    onChange={(e) => handleStatChange('bowlingStyle', e.target.value)}
                                                    className="input"
                                                    required
                                                >
                                                    <option value="">Select Bowling Style</option>
                                                    <option value="None">None</option>
                                                    <option value="Right Arm Pace">Right Arm Pace</option>
                                                    <option value="Right Arm Spin">Right Arm Spin</option>
                                                    <option value="Left Arm Pace">Left Arm Pace</option>
                                                    <option value="Left Arm Spin">Left Arm Spin</option>
                                                    <option value="Slow Left Arm Orthodox">Slow Left Arm Orthodox</option>
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Player Photo</h3>

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
                                            <span>Click to upload photo</span>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>



                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                            {loading ? 'Registering...' : 'Register Player'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

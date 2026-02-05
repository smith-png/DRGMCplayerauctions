import { useState, useEffect } from 'react';
import { playerAPI, teamsAPI } from '../services/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './Teams.css';

export default function Teams() {
    const [activeSport, setActiveSport] = useState('cricket');
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [activeSport]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [teamsRes, playersRes] = await Promise.all([
                teamsAPI.getAllTeams(),
                playerAPI.getAllPlayers()
            ]);

            // Filter teams by sport
            const sportTeams = teamsRes.data.teams.filter(t => t.sport === activeSport);
            setTeams(sportTeams);

            // Get all players (we'll filter sold ones)
            setPlayers(playersRes.data.players || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTeamPlayers = (teamId) => {
        return players.filter(p => p.team_id === teamId && p.status === 'sold');
    };

    const downloadTeamPDF = (team) => {
        const doc = new jsPDF();
        const teamPlayers = getTeamPlayers(team.id);

        // Add team name as title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(team.name, 14, 20);

        // Add team info
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Sport: ${team.sport.charAt(0).toUpperCase() + team.sport.slice(1)}`, 14, 30);
        doc.text(`Remaining Budget: ${team.remaining_budget || team.budget} Pts`, 14, 36);
        if (team.owner_name) {
            doc.text(`Owner: ${team.owner_name}`, 14, 42);
        }

        // Add players table
        const tableData = teamPlayers.map(player => [
            player.name,
            player.year,
            player.stats || 'Player',
            `${player.final_price || player.base_price} Pts`
        ]);

        doc.autoTable({
            startY: team.owner_name ? 48 : 42,
            head: [['Player Name', 'Year', 'Role', 'Price']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: [102, 126, 234],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 10,
                cellPadding: 3
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            }
        });

        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(
                `Generated on ${new Date().toLocaleDateString()}`,
                14,
                doc.internal.pageSize.height - 10
            );
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.width - 30,
                doc.internal.pageSize.height - 10
            );
        }

        // Download
        doc.save(`${team.name.replace(/\s+/g, '_')}_Roster.pdf`);
    };

    return (
        <div className="teams-page">
            <div className="teams-header">
                <h1 className="teams-title">Team Rosters</h1>
                <p className="teams-subtitle">View all teams and their secured players</p>
            </div>

            <div className="sport-tabs">
                <button
                    className={`sport-tab ${activeSport === 'cricket' ? 'active' : ''}`}
                    onClick={() => setActiveSport('cricket')}
                >
                    Cricket
                </button>
                <button
                    className={`sport-tab ${activeSport === 'futsal' ? 'active' : ''}`}
                    onClick={() => setActiveSport('futsal')}
                >
                    Futsal
                </button>
                <button
                    className={`sport-tab ${activeSport === 'volleyball' ? 'active' : ''}`}
                    onClick={() => setActiveSport('volleyball')}
                >
                    Volleyball
                </button>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            ) : teams.length === 0 ? (
                <div className="empty-state">
                    <h3>No teams registered for {activeSport}</h3>
                    <p>Teams will appear here once they are created</p>
                </div>
            ) : (
                <div className="teams-grid">
                    {teams.map(team => {
                        const teamPlayers = getTeamPlayers(team.id);

                        return (
                            <div key={team.id} className="team-card">
                                <div className="team-header">
                                    {team.logo_url && (
                                        <img
                                            src={team.logo_url}
                                            alt={team.name}
                                            className="team-logo"
                                            loading="lazy"
                                        />
                                    )}
                                    <h2 className="team-name">{team.name}</h2>
                                    <div className="team-budget">
                                        <span className="budget-label">Remaining Budget:</span>
                                        <span className="budget-value">{team.remaining_budget || team.budget} Pts</span>
                                    </div>

                                    {/* Download PDF Button */}
                                    <button
                                        className="btn-download-pdf"
                                        onClick={() => downloadTeamPDF(team)}
                                        title="Download Team Roster PDF"
                                    >
                                        Download PDF
                                    </button>
                                </div>

                                <div className="team-players">
                                    <h3 className="players-section-title">
                                        Squad ({teamPlayers.length} Players)
                                    </h3>
                                    {teamPlayers.length === 0 ? (
                                        <div className="no-players">
                                            <p>No players secured yet</p>
                                        </div>
                                    ) : (
                                        <div className="players-list">
                                            {teamPlayers.map(player => (
                                                <div key={player.id} className="player-mini-card">
                                                    {player.photo_url && (
                                                        <img
                                                            src={player.photo_url}
                                                            alt={player.name}
                                                            className="player-photo"
                                                            loading="lazy"
                                                        />
                                                    )}
                                                    <div className="player-info">
                                                        <h4 className="player-name">{player.name}</h4>
                                                        <div className="player-details">
                                                            <span className="player-role">{player.stats || 'Player'}</span>
                                                            <span className="player-divider">•</span>
                                                            <span className="player-year">{player.year}</span>
                                                        </div>
                                                        <div className="player-price">
                                                            {player.final_price || player.base_price} Pts
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

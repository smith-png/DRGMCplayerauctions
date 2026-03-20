import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuctionStats() {
    const navigate = useNavigate();

    useEffect(() => {
        loadUserAndData();
        loadAuctionStateAndCurrent();

        // Connect to Socket.IO
        socketService.connect();

        // If already connected, join immediately
        if (socketService.connected) {
            socketService.joinAuction();
            setIsConnected(true);
        }

        if (socketService.socket) {
            socketService.socket.on('connect', () => {
                setIsConnected(true);
                socketService.joinAuction();
            });
            socketService.socket.on('disconnect', () => setIsConnected(false));
        }

        // Listen for leaderboard refresh
        socketService.onRefreshLeaderboard(() => {
            loadUserAndData();
        });

        // Listen for bid updates (updates local state immediately)
        socketService.on('bid-update', (data) => {
            setCurrentAuction(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    current_bid: data.amount,
                    current_team_id: data.teamId,
                    current_team_name: data.teamName
                };
            });

            // Also refresh owner data if it's my team
            if (user?.role === 'team_owner' && myTeam && data.teamId === myTeam.id) {
                loadTeamOwnerData();
            }
        });

        // Listen for auction updates (start, end, sold)
        socketService.onAuctionUpdate((data) => {
            if (data.type === 'started') {
                loadAuctionStateAndCurrent();
            } else if (data.type === 'sold' || data.type === 'unsold') {
                setCurrentAuction(null);
                loadUserAndData(); // Refresh budget/players
            }
        });

        // Listen for generic refresh data (wallet reset, sold player, etc.)
        socketService.on('refresh-data', () => {
            loadUserAndData();
            loadAuctionStateAndCurrent();
        });

        return () => {
            socketService.off('refresh-leaderboard');
            socketService.off('bid-update');
            socketService.off('auction-update');
            socketService.off('refresh-data');
            socketService.socket.off('connect');
            socketService.socket.off('disconnect');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.role, myTeam?.id]); // Re-bind if user role or team changes

    const loadAuctionStateAndCurrent = async () => {
        try {
            const [stateRes, currentRes] = await Promise.all([
                auctionAPI.getAuctionState(),
                auctionAPI.getCurrentAuction()
            ]);

            if (stateRes.data.bidIncrementRules) {
                setBidIncrementRules(stateRes.data.bidIncrementRules);
            }

            const data = currentRes.data.currentAuction;
            if (data) {
                setCurrentAuction({
                    ...data.player,
                    current_bid: data.highestBid ? Math.round(data.highestBid.amount) : Math.round(data.player.base_price || 0),
                    current_team_id: data.highestBid ? data.highestBid.team_id : null,
                });
                // Reset bidding state if a new bid comes in (might be from us or someone else)
                setIsBidding(false);
            } else {
                setCurrentAuction(null);
            }
        } catch (err) {
            console.error("Failed to load auction state/current", err);
        }
    };

    const calculateNextBid = (currentBid) => {
        // Default rules if none provided
        const rules = bidIncrementRules.length > 0 ? bidIncrementRules : [
            { threshold: 0, increment: 10 },
            { threshold: 200, increment: 50 },
            { threshold: 500, increment: 100 }
        ];

        // Find applicable rule: highest threshold <= currentBid
        // We sort rules descending by threshold to find the first match easily
        const sortedRules = [...rules].sort((a, b) => b.threshold - a.threshold);
        const applicableRule = sortedRules.find(r => currentBid >= r.threshold);

        const increment = applicableRule ? applicableRule.increment : 10;
        return currentBid + increment;
    };

    const handleTeamOwnerBid = async () => {
        if (!currentAuction || !myTeam || isBidding) return;

        setIsBidding(true);
        const nextBid = calculateNextBid(currentAuction.current_bid || 0);

        // Optimistic update (optional, but safer to wait for ack or just fire and forget)
        // We will just fire request.
        try {
            await auctionAPI.placeBid(currentAuction.id, myTeam.id, nextBid);
            // Success - socket will update UI
        } catch (err) {
            console.error("Bid failed", err);
            alert(err.response?.data?.error || "Failed to place bid");
        } finally {
            // Add a small delay to ensure the loading state is visible and enforce a min cooldown
            setTimeout(() => {
                setIsBidding(false);
            }, 500);
        }
    };

    const loadUserAndData = async () => {
        // Safety timeout for whole page
        const safetyTimeout = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.warn('AuctionStats: Loading safety timeout triggered.');
                    return false;
                }
                return prev;
            });
        }, 10000);

        try {
            const userResponse = await authAPI.getCurrentUser();
            setUser(userResponse.data.user);

            if (userResponse.data.user.role === 'team_owner') {
                await loadTeamOwnerData();
            } else if (userResponse.data.user.role === 'admin') {
                await loadLeaderboard();
            }
            // Viewers don't load data
        } catch (err) {
            console.error('Failed to load user:', err);
        } finally {
            setLoading(false);
            clearTimeout(safetyTimeout);
        }
    };

    const loadTeamOwnerData = async () => {
        try {
            const [teamRes, playersRes, bidsRes] = await Promise.all([
                teamOwnerAPI.getMyTeam(),
                teamOwnerAPI.getMyTeamPlayers(),
                teamOwnerAPI.getMyTeamBids()
            ]);

            setMyTeam(teamRes.data.team);
            setMyPlayers(playersRes.data.players);
            setMyBids(bidsRes.data.bids);

            // Fetch eligible players for queue preview
            try {
                const eligibleRes = await playerAPI.getEligiblePlayers();
                setEligiblePlayers(eligibleRes.data.players || []);
            } catch (e) {
                console.error("Failed to load eligible players", e);
            }
        } catch (err) {
            console.error('Failed to load team owner data:', err);
        }
    };

    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [budgetAmount, setBudgetAmount] = useState('');
    const [budgetAction, setBudgetAction] = useState('add'); // 'add' or 'remove'
    const [message, setMessage] = useState('');

    const handleOpenBudgetModal = (team) => {
        setSelectedTeam(team);
        setBudgetAmount('');
        setMessage('');
        setShowBudgetModal(true);
    };

    const handleResetWallet = async () => {
        if (!window.confirm(`DANGER: This will reset ${selectedTeam.name}'s wallet to 2000 and UNSOLD all their players. Continue?`)) return;

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a1a',
            color: '#3E5B4E',
            fontFamily: 'monospace'
        }}>
            REDIRECTING TO TEAMS...
        </div>
    );
}

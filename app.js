// ============================================================================
// 1. CONEXÃO DIRETA COM O SEU BANCO DE DADOS (Aqui o site liga ao Firebase!)
// ============================================================================
import { initializeApp } from "https://gstatic.com";
import { getDatabase, ref, set, onValue } from "https://gstatic.com";

// Suas credenciais exatas que ligam o site à sua conta do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDG18Mso3FlacBWhUtEqMvEwpqvIvIeNdM",
  authDomain: "://firebaseapp.com",
  databaseURL: "https://firebaseio.com",
  projectId: "sorteadordetimes-6f78a",
  storageBucket: "://appspot.com",
  messagingSenderId: "1006706049499",
  appId: "1:1006706049499:web:68963f06534f8699c8be7e"
};

// Ativa a conexão com a internet usando as credenciais acima
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ============================================================================
// 2. O SEU CÓDIGO ORIGINAL (Ajustado para salvar na nuvem)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // ===========================
    // DOM Elements
    // ===========================
    const navManage = document.getElementById('nav-manage');
    const navDraw = document.getElementById('nav-draw');
    const viewManage = document.getElementById('view-manage');
    const viewDraw = document.getElementById('view-draw');

    // Squad Manager
    const squadSelect = document.getElementById('squad-select');
    const btnNewSquad = document.getElementById('btn-new-squad');
    const btnRenameSquad = document.getElementById('btn-rename-squad');
    const btnDeleteSquad = document.getElementById('btn-delete-squad');

    // Manage
    const playerNameInput = document.getElementById('player-name');
    const addPosPrimary = document.getElementById('add-pos-primary');
    const addPosSecondary = document.getElementById('add-pos-secondary');
    const btnAddPlayer = document.getElementById('btn-add-player');
    const stars = document.querySelectorAll('#star-rating .star');
    const ratingDisplay = document.getElementById('rating-display');
    const searchManage = document.getElementById('search-manage');
    const playersListUl = document.getElementById('players-list');
    const playerCountSpan = document.getElementById('player-count');
    const btnClearAll = document.getElementById('btn-clear-all');

    // Edit Modal
    const editOverlay = document.getElementById('edit-overlay');
    const editPlayerName = document.getElementById('edit-player-name');
    const editPosPrimary = document.getElementById('edit-pos-primary');
    const editPosSecondary = document.getElementById('edit-pos-secondary');
    const editStars = document.querySelectorAll('#edit-star-rating .star');
    const editRatingDisplay = document.getElementById('edit-rating-display');
    const btnSaveEdit = document.getElementById('btn-save-edit');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');

    // Draw
    const searchDraw = document.getElementById('search-draw');
    const selectPlayersListUl = document.getElementById('select-players-list');
    const selectedCountSpan = document.getElementById('selected-count');
    const btnSelectAll = document.getElementById('btn-select-all');
    const drawStep1 = document.getElementById('draw-step-1');
    const drawStep2 = document.getElementById('draw-step-2');
    const btnAdvanceDraw = document.getElementById('btn-advance-draw');
    const btnBackDraw = document.getElementById('btn-back-draw');
    const numTeamsInput = document.getElementById('num-teams-input');
    const startersLimitInput = document.getElementById('starters-limit');
    const balancePositionsCheck = document.getElementById('balance-positions');
    const btnDrawTeams = document.getElementById('btn-draw-teams');

    // Result
    const resultOverlay = document.getElementById('result-overlay');
    const teamsContainer = document.getElementById('teams-container');
    const btnCloseResult = document.getElementById('btn-close-result');
    const btnCopyResult = document.getElementById('btn-copy-result');

    // ===========================
    // State
    // ===========================
    let currentRating = 5;
    let editCurrentRating = 5;
    let editingPlayerId = null;
    let players = [];
    let limitPerTeamGlobal = 5;
    let showPositions = true;

    const FILLER_PLAYERS = [
        { id: 'filler-1', name: 'Completar Time (1)', rating: 5, selected: false, primaryPos: 'GER', secondaryPos: '', isFiller: true },
        { id: 'filler-2', name: 'Completar Time (2)', rating: 5, selected: false, primaryPos: 'GER', secondaryPos: '', isFiller: true },
        { id: 'filler-3', name: 'Completar Time (3)', rating: 5, selected: false, primaryPos: 'GER', secondaryPos: '', isFiller: true },
        { id: 'filler-4', name: 'Completar Time (4)', rating: 5, selected: false, primaryPos: 'GER', secondaryPos: '', isFiller: true },
    ];
    let fillerIndex = 0;

    // ===========================
    // Squad Management (Conectado à nuvem!)
    // ===========================
    const SQUADS_KEY = 'sorteador_squads';
    const ACTIVE_SQUAD_KEY = 'sorteador_active_squad';

    function getSquads() {
        return JSON.parse(localStorage.getItem(SQUADS_KEY)) || [];
    }

    function saveSquads(squads) {
        localStorage.setItem(SQUADS_KEY, JSON.stringify(squads));
    }

    function getActiveSquadId() {
        return localStorage.getItem(ACTIVE_SQUAD_KEY);
    }

    function setActiveSquadId(id) {
        localStorage.setItem(ACTIVE_SQUAD_KEY, id);
    }

    // MODIFICADO: Agora envia os jogadores direto para o Firebase na nuvem
    function savePlayers() {
        const id = getActiveSquadId();
        if (!id) return;
        
        // Envia o array de jogadores para a "pasta" desse elenco no Firebase
        set(ref(db, `squads/${id}/players`), players)
            .catch((error) => console.error("Erro ao salvar no Firebase:", error));
    }

    // NOVA FUNÇÃO: Cria um ouvinte para atualizar a tela sozinho quando alguém mexer
    let firebaseUnsubscribe = null;
    function listenToSquadPlayers(squadId) {
        if (firebaseUnsubscribe) firebaseUnsubscribe();

        const squadPlayersRef = ref(db, `squads/${squadId}/players`);
        
        firebaseUnsubscribe = onValue(squadPlayersRef, (snapshot) => {
            const raw = snapshot.val() || [];
            
            players = raw.map(p => {
                if (p.selected === undefined) p.selected = true;
                if (Array.isArray(p.positions)) {
                    p.primaryPos = p.positions[0] || '';
                    p.secondaryPos = p.positions[1] || '';
                    delete p.positions;
                }
                if (p.primaryPos === undefined) p.primaryPos = '';
                if (p.secondaryPos === undefined) p.secondaryPos = '';
                return p;
            });

            // Se o banco iniciar vazio, gera os jogadores de teste automáticos
            if (players.length === 0) {
                for (let i = 1; i <= 21; i++) {
                    players.push({
                        id: Date.now() + i,
                        name: `Jogador Teste ${i}`,
                        rating: Math.floor(Math.random() * 10) + 1,
                        selected: true,
                        primaryPos: '',
                        secondaryPos: ''
                    });
                }
                savePlayers();
            }

            // Atualiza o visual das listas na tela instantaneamente
            if (typeof renderPlayers === 'function') renderPlayers(searchManage.value);
            if (typeof renderSelectPlayersList === 'function') renderSelectPlayersList(searchDraw.value);
        });
    }

    function initSquads() {
        let squads = getSquads();

        const legacyPlayers = localStorage.getItem('sorteador_jogadores');
        if (legacyPlayers && squads.length === 0) {
            const firstId = Date.now().toString();
            squads = [{ id: firstId, name: 'Elenco Principal' }];
            saveSquads(squads);
            localStorage.setItem(`sorteador_players_${firstId}`, legacyPlayers);
            localStorage.removeItem('sorteador_jogadores');
            setActiveSquadId(firstId);
        }

        if (squads.length === 0) {
            const firstId = Date.now().toString();
            squads = [{ id: firstId, name: 'Elenco Principal' }];
            saveSquads(squads);
            setActiveSquadId(firstId);
        }

        let activeId = getActiveSquadId();
        if (!squads.find(s => s.id === activeId)) {
            activeId = squads[0].id;
            setActiveSquadId(activeId);
        }

        renderSquadSelect(squads, activeId);
        
        // Liga o ouvinte em tempo real para o elenco atual
        listenToSquadPlayers(activeId);
    }

    function renderSquadSelect(squads, activeId) {
        squadSelect.innerHTML = '';
        squads.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            if (s.id === activeId) opt.selected = true;
            squadSelect.appendChild(opt);
        });
    }

    squadSelect.addEventListener('change', () => {
        const newId = squadSelect.value;
        setActiveSquadId(newId);
        listenToSquadPlayers(newId); // Muda a conexão para o novo elenco escolhido
    });

    btnNewSquad.addEventListener('click', () => {
        const name = prompt('Nome do novo elenco:');
        if (!name || !name.trim()) return;

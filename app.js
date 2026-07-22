import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

console.log("Firebase conectado!", db);

// ===========================
// Verificação de conexão (opcional, para debug)
// ===========================
async function testarFirebase() {
    try {
        const snapshot = await getDocs(collection(db, "teste"));
        console.log("Conexão com Firestore OK!");
        console.log(snapshot.size);
    } catch (erro) {
        console.error("Erro ao conectar:", erro);
    }
}

testarFirebase();

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

    // Jogadores fictícios para completar times (não aparecem no elenco nem no sorteio)
    const FILLER_PLAYERS = [
        { id: 'filler-1', name: 'Completar Time (1)', rating: 5, selected: false, primaryPos: 'GER', secondaryPos: '', isFiller: true },
        { id: 'filler-2', name: 'Completar Time (2)', rating: 5, selected: false, primaryPos: 'GER', secondaryPos: '', isFiller: true },
        { id: 'filler-3', name: 'Completar Time (3)', rating: 5, selected: false, primaryPos: 'GER', secondaryPos: '', isFiller: true },
        { id: 'filler-4', name: 'Completar Time (4)', rating: 5, selected: false, primaryPos: 'GER', secondaryPos: '', isFiller: true },
    ];
    let fillerIndex = 0;

    // ===========================
    // Squad Management (Firestore)
    // ===========================

    function getActiveSquadId() {
        return localStorage.getItem('sorteador_active_squad');
    }

    function setActiveSquadId(id) {
        localStorage.setItem('sorteador_active_squad', id);
    }

    async function loadSquadsFromFirestore() {
        try {
            const snapshot = await getDocs(collection(db, "squads"));
            const squads = [];
            snapshot.forEach(docSnap => {
                squads.push({ id: docSnap.id, ...docSnap.data() });
            });
            return squads;
        } catch (erro) {
            console.error("Erro ao carregar elencos:", erro);
            return [];
        }
    }

    async function loadPlayersFromFirestore(squadId) {
        try {
            const snapshot = await getDocs(collection(db, "players"));
            const allPlayers = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.squadId === squadId) {
                    allPlayers.push({ id: parseInt(docSnap.id), ...data });
                }
            });
            return allPlayers;
        } catch (erro) {
            console.error("Erro ao carregar jogadores:", erro);
            return [];
        }
    }

    async function savePlayerToFirestore(player) {
        try {
            await setDoc(doc(db, "players", player.id.toString()), {
                squadId: getActiveSquadId(),
                name: player.name,
                rating: player.rating,
                selected: player.selected,
                primaryPos: player.primaryPos || '',
                secondaryPos: player.secondaryPos || ''
            });
        } catch (erro) {
            console.error("Erro ao salvar jogador:", erro);
        }
    }

    async function deletePlayerFromFirestore(id) {
        try {
            await deleteDoc(doc(db, "players", id.toString()));
        } catch (erro) {
            console.error("Erro ao excluir jogador:", erro);
        }
    }

    async function deleteAllPlayersOfSquad(squadId) {
        try {
            const snapshot = await getDocs(collection(db, "players"));
            const deletePromises = [];
            snapshot.forEach(docSnap => {
                if (docSnap.data().squadId === squadId) {
                    deletePromises.push(deleteDoc(docSnap.ref));
                }
            });
            await Promise.all(deletePromises);
        } catch (erro) {
            console.error("Erro ao limpar jogadores:", erro);
        }
    }

    async function saveSquadToFirestore(squad) {
        try {
            await setDoc(doc(db, "squads", squad.id), { name: squad.name });
        } catch (erro) {
            console.error("Erro ao salvar elenco:", erro);
        }
    }

    async function deleteSquadFromFirestore(squadId) {
        try {
            await deleteDoc(doc(db, "squads", squadId));
        } catch (erro) {
            console.error("Erro ao excluir elenco:", erro);
        }
    }

    async function initSquads() {
        let squads = await loadSquadsFromFirestore();

        const legacySquadsRaw = localStorage.getItem('sorteador_squads');
        if (legacySquadsRaw && squads.length === 0) {
            const legacySquads = JSON.parse(legacySquadsRaw);
            for (const squad of legacySquads) {
                await saveSquadToFirestore(squad);
                const legacyPlayersKey = `sorteador_players_${squad.id}`;
                const legacyPlayersRaw = localStorage.getItem(legacyPlayersKey);
                if (legacyPlayersRaw) {
                    const legacyPlayers = JSON.parse(legacyPlayersRaw);
                    for (const p of legacyPlayers) {
                        if (p.selected === undefined) p.selected = true;
                        if (Array.isArray(p.positions)) {
                            p.primaryPos = p.positions[0] || '';
                            p.secondaryPos = p.positions[1] || '';
                            delete p.positions;
                        }
                        if (p.primaryPos === undefined) p.primaryPos = '';
                        if (p.secondaryPos === undefined) p.secondaryPos = '';
                        await savePlayerToFirestore({ ...p, squadId: squad.id });
                    }
                }
            }
            localStorage.removeItem('sorteador_squads');
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('sorteador_players_')) {
                    localStorage.removeItem(key);
                }
            });
            squads = await loadSquadsFromFirestore();
        }

        const legacyPlayers = localStorage.getItem('sorteador_jogadores');
        if (legacyPlayers && squads.length === 0) {
            const firstId = Date.now().toString();
            const firstSquad = { id: firstId, name: 'Elenco Principal' };
            await saveSquadToFirestore(firstSquad);
            const oldPlayers = JSON.parse(legacyPlayers);
            for (const p of oldPlayers) {
                if (p.selected === undefined) p.selected = true;
                if (Array.isArray(p.positions)) {
                    p.primaryPos = p.positions[0] || '';
                    p.secondaryPos = p.positions[1] || '';
                    delete p.positions;
                }
                if (p.primaryPos === undefined) p.primaryPos = '';
                if (p.secondaryPos === undefined) p.secondaryPos = '';
                await savePlayerToFirestore({ ...p, squadId: firstId });
            }
            localStorage.removeItem('sorteador_jogadores');
            squads = await loadSquadsFromFirestore();
        }

        if (squads.length === 0) {
            const firstId = Date.now().toString();
            const firstSquad = { id: firstId, name: 'Elenco Principal' };
            await saveSquadToFirestore(firstSquad);
            squads = [firstSquad];
        }

        let activeId = getActiveSquadId();
        if (!squads.find(s => s.id === activeId)) {
            activeId = squads[0].id;
            setActiveSquadId(activeId);
        }

        renderSquadSelect(squads, activeId);
        players = await loadPlayersFromFirestore(activeId);

        if (players.length === 0) {
            for (let i = 1; i <= 21; i++) {
                const player = {
                    id: Date.now() + i,
                    name: `Jogador Teste ${i}`,
                    rating: Math.floor(Math.random() * 10) + 1,
                    selected: true,
                    primaryPos: '',
                    secondaryPos: ''
                };
                players.push(player);
                await savePlayerToFirestore(player);
            }
        }
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

    squadSelect.addEventListener('change', async () => {
        const newId = squadSelect.value;
        setActiveSquadId(newId);
        players = await loadPlayersFromFirestore(newId);
        renderPlayers(searchManage.value);
        renderSelectPlayersList(searchDraw.value);
    });

    btnNewSquad.addEventListener('click', async () => {
        const name = prompt('Nome do novo elenco:');
        if (!name || !name.trim()) return;
        const newId = Date.now().toString();
        const newSquad = { id: newId, name: name.trim() };
        await saveSquadToFirestore(newSquad);
        setActiveSquadId(newId);
        players = [];
        const squads = await loadSquadsFromFirestore();
        renderSquadSelect(squads, newId);
        renderPlayers();
        renderSelectPlayersList();
    });

    btnRenameSquad.addEventListener('click', async () => {
        const pwd = prompt('Digite a senha para acessar o elenco:');
        if (pwd !== '010203') {
            alert('Senha incorreta.');
            return;
        }
        const activeId = getActiveSquadId();
        const squads = await loadSquadsFromFirestore();
        const squad = squads.find(s => s.id === activeId);
        if (!squad) return;
        const newName = prompt('Novo nome para o elenco:', squad.name);
        if (!newName || !newName.trim()) return;
        squad.name = newName.trim();
        await saveSquadToFirestore(squad);
        renderSquadSelect(squads, activeId);
    });

    btnDeleteSquad.addEventListener('click', async () => {
        const pwd = prompt('Digite a senha para acessar o elenco:');
        if (pwd !== '010203') {
            alert('Senha incorreta.');
            return;
        }
        const squads = await loadSquadsFromFirestore();
        if (squads.length <= 1) {
            alert('Você precisa ter ao menos um elenco!');
            return;
        }
        const activeId = getActiveSquadId();
        const squad = squads.find(s => s.id === activeId);
        if (!squad) return;
        if (!confirm(`Excluir o elenco "${squad.name}" e todos os seus jogadores? Esta ação não pode ser desfeita.`)) return;
        await deleteAllPlayersOfSquad(activeId);
        await deleteSquadFromFirestore(activeId);
        const newSquads = squads.filter(s => s.id !== activeId);
        const newActiveId = newSquads[0].id;
        setActiveSquadId(newActiveId);
        players = await loadPlayersFromFirestore(newActiveId);
        renderSquadSelect(newSquads, newActiveId);
        renderPlayers();
        renderSelectPlayersList();
    });

    // ===========================
    // Navigation
    // ===========================
    function switchView(view) {
        if (view === 'manage') {
            navManage.classList.add('active');
            navDraw.classList.remove('active');
            viewManage.classList.remove('hidden');
            viewDraw.classList.add('hidden');
            renderPlayers(searchManage.value);
        } else {
            navDraw.classList.add('active');
            navManage.classList.remove('active');
            viewDraw.classList.remove('hidden');
            viewManage.classList.add('hidden');
            drawStep1.classList.remove('hidden');
            drawStep2.classList.add('hidden');
            renderSelectPlayersList(searchDraw.value);
        }
    }

    navManage.addEventListener('click', () => {
        const pwd = prompt('Digite a senha para acessar o elenco:');
        if (pwd !== '010203') {
            alert('Senha incorreta.');
            return;
        }
        switchView('manage');
    });
    navDraw.addEventListener('click', () => switchView('draw'));

    btnAdvanceDraw.addEventListener('click', () => {
        drawStep1.classList.add('hidden');
        drawStep2.classList.remove('hidden');
    });

    btnBackDraw.addEventListener('click', () => {
        drawStep2.classList.add('hidden');
        drawStep1.classList.remove('hidden');
    });

    // ===========================
    // Stars UI
    // ===========================
    function updateStarsUI(starNodeList, displayEl, value) {
        starNodeList.forEach(s => {
            s.classList.toggle('active', parseInt(s.getAttribute('data-value')) <= value);
        });
        displayEl.textContent = `Nível: ${value}`;
    }

    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            currentRating = parseInt(e.target.getAttribute('data-value'));
            updateStarsUI(stars, ratingDisplay, currentRating);
        });
    });
    editStars.forEach(star => {
        star.addEventListener('click', (e) => {
            editCurrentRating = parseInt(e.target.getAttribute('data-value'));
            updateStarsUI(editStars, editRatingDisplay, editCurrentRating);
        });
    });

    updateStarsUI(stars, ratingDisplay, currentRating);

    // ===========================
    // Add Player
    // ===========================
    btnAddPlayer.addEventListener('click', addPlayer);
    playerNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addPlayer(); });

    async function addPlayer() {
        const name = playerNameInput.value.trim();
        if (!name) return;
        if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            alert('Já existe um jogador com este nome neste elenco!');
            return;
        }
        const primary = addPosPrimary.value;
        const secondary = addPosSecondary.value;
        if (primary && secondary && primary === secondary) {
            alert('Posição Principal e Alternativa não podem ser iguais!');
            return;
        }
        const newPlayer = {
            id: Date.now(),
            name,
            rating: currentRating,
            selected: true,
            primaryPos: primary,
            secondaryPos: secondary
        };
        players.push(newPlayer);
        await savePlayerToFirestore(newPlayer);
        renderPlayers(searchManage.value);
        playerNameInput.value = '';
        addPosPrimary.value = '';
        addPosSecondary.value = '';
        playerNameInput.focus();
    }

    // ===========================
    // Edit Player
    // ===========================
    function openEditModal(id) {
        const p = players.find(p => p.id === id);
        if (!p) return;
        editingPlayerId = id;
        editPlayerName.value = p.name;
        editCurrentRating = p.rating;
        updateStarsUI(editStars, editRatingDisplay, editCurrentRating);
        editPosPrimary.value = p.primaryPos || '';
        editPosSecondary.value = p.secondaryPos || '';
        editOverlay.classList.remove('hidden');
    }

    btnCancelEdit.addEventListener('click', () => { editOverlay.classList.add('hidden'); editingPlayerId = null; });

    btnSaveEdit.addEventListener('click', async () => {
        const newName = editPlayerName.value.trim();
        if (!newName) return;
        if (players.some(p => p.name.toLowerCase() === newName.toLowerCase() && p.id !== editingPlayerId)) {
            alert('Já existe outro jogador com este nome!');
            return;
        }
        const primary = editPosPrimary.value;
        const secondary = editPosSecondary.value;
        if (primary && secondary && primary === secondary) {
            alert('Posição Principal e Alternativa não podem ser iguais!');
            return;
        }
        const player = players.find(p => p.id === editingPlayerId);
        if (player) {
            player.name = newName;
            player.rating = editCurrentRating;
            player.primaryPos = primary;
            player.secondaryPos = secondary;
            await savePlayerToFirestore(player);
            renderPlayers(searchManage.value);
            if (!viewDraw.classList.contains('hidden')) renderSelectPlayersList(searchDraw.value);
        }
        editOverlay.classList.add('hidden');
        editingPlayerId = null;
    });

    // ===========================
    // Delete / Clear
    // ===========================
    async function deletePlayer(id) {
        players = players.filter(p => p.id !== id);
        await deletePlayerFromFirestore(id);
        renderPlayers(searchManage.value);
        if (!viewDraw.classList.contains('hidden')) renderSelectPlayersList(searchDraw.value);
    }

    btnClearAll.addEventListener('click', async () => {
        if (confirm('Remover todos os jogadores deste elenco?')) {
            players = [];
            await deleteAllPlayersOfSquad(getActiveSquadId());
            renderPlayers();
            if (!viewDraw.classList.contains('hidden')) renderSelectPlayersList();
        }
    });

    // ===========================
    // Search & Display Helpers
    // ===========================
    searchManage.addEventListener('input', (e) => renderPlayers(e.target.value));
    searchDraw.addEventListener('input', (e) => renderSelectPlayersList(e.target.value));

    balancePositionsCheck.addEventListener('change', () => {
        showPositions = balancePositionsCheck.checked;
        renderPlayers(searchManage.value);
        renderSelectPlayersList(searchDraw.value);
    });

    const POS_PRIORITY = { 'GOL': 1, 'DEF': 2, 'MEI': 3, 'ATA': 4, 'GER': 5 };

    function isGoleiro(player) {
        return player.primaryPos === 'GOL' || player.secondaryPos === 'GOL';
    }

    function getEffectivePrimaryPriority(player) {
        return POS_PRIORITY[player.primaryPos] || 5;
    }

    function getPositionsHtml(player) {
        if (player.isFiller) return `<span class="player-position pos-filler">GER</span>`;
        if (!showPositions) return '';
        const parts = [];
        if (player.primaryPos) parts.push(player.primaryPos);
        if (player.secondaryPos) parts.push(player.secondaryPos);
        if (parts.length === 0) return '';
        return `<span class="player-position">${parts.join(', ')}</span>`;
    }

    function getPositionsText(player) {
        if (player.isFiller) return '[GER]';
        const parts = [];
        if (player.primaryPos) parts.push(player.primaryPos);
        if (player.secondaryPos) parts.push(player.secondaryPos);
        if (parts.length === 0) return '';
        return `[${parts.join(', ')}]`;
    }

    // Função de Embaralhar (Fisher-Yates) para garantir aleatoriedade no sorteio
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // ===========================
    // Render: Elenco (Manage)
    // ===========================
    function renderPlayers(filter = '') {
        playersListUl.innerHTML = '';
        playerCountSpan.textContent = players.length;
        const filtered = filter ? players.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())) : players;

        filtered.forEach(player => {
            const li = document.createElement('li');
            li.className = 'player-item';
            const starsStr = '★'.repeat(player.rating);
            const posHtml = getPositionsHtml(player);
            li.innerHTML = `
                <div class="player-info">
                    <span class="player-name">${player.name} ${posHtml}</span>
                    <span class="player-rating" title="Nível ${player.rating}">${starsStr}</span>
                </div>
                <div class="player-actions">
                    <button class="btn-edit" data-id="${player.id}" title="Editar">✏️</button>
                    <button class="btn-delete" data-id="${player.id}" title="Remover">✕</button>
                </div>`;
            playersListUl.appendChild(li);
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => openEditModal(parseInt(e.target.getAttribute('data-id'))));
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => deletePlayer(parseInt(e.target.getAttribute('data-id'))));
        });
    }

    // ===========================
    // Render: Sorteio (Draw)
    // ===========================
    function renderSelectPlayersList(filter = '') {
        selectPlayersListUl.innerHTML = '';
        const filtered = filter ? players.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())) : players;

        filtered.forEach(player => {
            const li = document.createElement('li');
            li.className = 'player-item';
            const posHtml = getPositionsHtml(player);
            li.innerHTML = `
                <input type="checkbox" id="chk-${player.id}" data-id="${player.id}" ${player.selected ? 'checked' : ''}>
                <label for="chk-${player.id}" class="player-info" style="cursor:pointer; width:100%;">
                    <span class="player-name">${player.name} ${posHtml}</span>
                </label>`;
            selectPlayersListUl.appendChild(li);
        });

        selectedCountSpan.textContent = players.filter(p => p.selected).length;

        selectPlayersListUl.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', async (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const player = players.find(p => p.id === id);
                if (player) {
                    player.selected = e.target.checked;
                    await savePlayerToFirestore(player);
                    selectedCountSpan.textContent = players.filter(p => p.selected).length;
                }
            });
        });
    }

    btnSelectAll.addEventListener('click', async () => {
        const filter = searchDraw.value;
        const target = filter ? players.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())) : players;
        const allSelected = target.every(p => p.selected);
        target.forEach(p => p.selected = !allSelected);
        const promises = target.map(p => savePlayerToFirestore(p));
        await Promise.all(promises);
        renderSelectPlayersList(filter);
    });

    // ===========================
    // Draw Algorithm (Corrigido)
    // ===========================
    btnDrawTeams.addEventListener('click', () => {
        const selected = players.filter(p => p.selected);
        if (selected.length === 0) { alert('Selecione pelo menos um jogador!'); return; }

        const limit = parseInt(startersLimitInput.value);
        limitPerTeamGlobal = limit;
        const numTeams = parseInt(numTeamsInput.value);

        if (selected.length < numTeams) { alert('Jogadores selecionados são menos que o número de times!'); return; }

        showPositions = balancePositionsCheck.checked;
        const usePositional = balancePositionsCheck.checked;
        const totalStarterSlots = numTeams * limit;

        // Embaralhar seleção inicial para não viciar resultados
        let pool = shuffleArray([...selected]);

        let startersPool = [];
        let reservesPool = [];

        // Separação de Titulares e Reservas
        if (pool.length > totalStarterSlots) {
            const numReserves = pool.length - totalStarterSlots;
            reservesPool = pool.slice(0, numReserves);
            startersPool = pool.slice(numReserves);
        } else {
            startersPool = [...pool];
        }

        const teams = Array.from({ length: numTeams }, () => ({
            starters: [], reserves: [], totalStarterScore: 0, totalReserveScore: 0
        }));

        // Função para encontrar o time que precisa de jogador
        function findWeakestTeamForStarter(teamsArr) {
            let candidates = [];
            let minCount = Infinity;

            // Pega os times com menor número de titulares
            teamsArr.forEach(t => {
                if (t.starters.length < minCount) {
                    minCount = t.starters.length;
                    candidates = [t];
                } else if (t.starters.length === minCount) {
                    candidates.push(t);
                }
            });

            // Entre eles, pega o de menor pontuação de força
            let minScore = Infinity;
            let finalCandidates = [];
            candidates.forEach(t => {
                if (t.totalStarterScore < minScore) {
                    minScore = t.totalStarterScore;
                    finalCandidates = [t];
                } else if (t.totalStarterScore === minScore) {
                    finalCandidates.push(t);
                }
            });

            // Desempate aleatório para evitar repetir a mesma ordem
            return finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
        }

        // --- REGRA DE GOLEIROS (CORREÇÃO PROBLEMA 3) ---
        // Identifica goleiros (seja na posição Principal ou Alternativa)
        const goalkeepers = startersPool.filter(p => isGoleiro(p));
        const fieldPlayers = startersPool.filter(p => !isGoleiro(p));

        shuffleArray(goalkeepers);

        // Distribui exatamente 1 goleiro para cada time enquanto houver goleiros/times
        goalkeepers.forEach(gk => {
            const emptyGkTeam = teams.find(t => !t.starters.some(p => isGoleiro(p)));
            if (emptyGkTeam) {
                emptyGkTeam.starters.push(gk);
                emptyGkTeam.totalStarterScore += gk.rating;
            } else {
                fieldPlayers.push(gk); // Se sobrarem goleiros além do n° de times, entram no sorteio geral
            }
        });

        // --- DISTRIBUIÇÃO DOS JOGADORES DE LINHA ---
        if (usePositional) {
            // Agrupa por posição primária
            const posGroups = { 2: [], 3: [], 4: [], 5: [] };
            fieldPlayers.forEach(p => {
                const prio = getEffectivePrimaryPriority(p);
                const group = prio === 1 ? 5 : prio; // Se era GOL secundário sobressalente, trata como geral
                posGroups[group].push(p);
            });

            // Para cada posição, ordena os melhores jogadores primeiro
            [2, 3, 4, 5].forEach(prio => {
                posGroups[prio].sort((a, b) => b.rating - a.rating);
                posGroups[prio].forEach(player => {
                    const target = findWeakestTeamForStarter(teams);
                    target.starters.push(player);
                    target.totalStarterScore += player.rating;
                });
            });
        } else {
            // Se não usar posições, distribui por nível de força (cobra aos poucos)
            fieldPlayers.sort((a, b) => b.rating - a.rating);
            fieldPlayers.forEach(player => {
                const target = findWeakestTeamForStarter(teams);
                target.starters.push(player);
                target.totalStarterScore += player.rating;
            });
        }

        // --- DISTRIBUIÇÃO DE RESERVAS ---
        shuffleArray(reservesPool);
        reservesPool.forEach(player => {
            let target = teams[0];
            for (let i = 1; i < teams.length; i++) {
                if (teams[i].reserves.length < target.reserves.length) {
                    target = teams[i];
                } else if (teams[i].reserves.length === target.reserves.length && teams[i].totalReserveScore < target.totalReserveScore) {
                    target = teams[i];
                }
            }
            target.reserves.push(player);
            target.totalReserveScore += player.rating;
        });

        // --- PREENCHIMENTO COM JOGADORES FICTÍCIOS (CORREÇÃO PROBLEMA 2) ---
        // Aplicado SOMENTE NO FINAL, garantindo que o equilíbrio inicial não seja distorcido
        fillerIndex = 0;
        teams.forEach(team => {
            while (team.starters.length < limit && fillerIndex < FILLER_PLAYERS.length) {
                const filler = { ...FILLER_PLAYERS[fillerIndex] };
                team.starters.push(filler);
                team.totalStarterScore += filler.rating;
                fillerIndex++;
            }
        });

        renderTeams(teams);
    });

    // ===========================
    // Render Result
    // ===========================
    let currentDrawResult = [];

    function renderTeams(teams) {
        currentDrawResult = teams;
        teamsContainer.innerHTML = '';

        teams.forEach((team, index) => {
            const card = document.createElement('div');
            card.className = 'team-card';

            card.innerHTML = `
                <div class="team-header">
                    <span class="team-name">Time ${index + 1}</span>
                    <span class="team-score">Força (Titulares): ${team.totalStarterScore}</span>
                </div>
                <ul class="team-players" id="team-ul-${index}"></ul>`;

            teamsContainer.appendChild(card);
            const ul = card.querySelector(`#team-ul-${index}`);

            team.starters.forEach(p => {
                const li = document.createElement('li');
                li.className = 'team-player-item' + (p.isFiller ? ' filler-player' : '');
                const posHtml = getPositionsHtml(p);
                li.innerHTML = `<span class="team-player-name">${p.name} ${posHtml}</span>`;
                ul.appendChild(li);
            });

            if (team.reserves.length > 0) {
                const sep = document.createElement('div');
                sep.className = 'reserve-separator';
                sep.textContent = 'Reserva:';
                ul.appendChild(sep);
                team.reserves.forEach(p => {
                    const li = document.createElement('li');
                    li.className = 'team-player-item' + (p.isFiller ? ' filler-player' : '');
                    const posHtml = getPositionsHtml(p);
                    li.innerHTML = `<span class="team-player-name">${p.name} ${posHtml}</span>`;
                    ul.appendChild(li);
                });
            }
        });

        resultOverlay.classList.remove('hidden');
    }

    btnCloseResult.addEventListener('click', () => resultOverlay.classList.add('hidden'));

    // ===========================
    // Copy to Clipboard
    // ===========================
    btnCopyResult.addEventListener('click', async () => {
        let text = '⚽ *Sorteio de Times* ⚽\n\n';
        currentDrawResult.forEach((team, i) => {
            text += `🏆 *Time ${i + 1}* (Força Titulares: ${team.totalStarterScore})\n`;
            team.starters.forEach(p => { text += `  • ${p.name} ${getPositionsText(p)}\n`; });
            if (team.reserves.length > 0) {
                text += `  ⚠️ *Reserva:*\n`;
                team.reserves.forEach(p => { text += `    • ${p.name} ${getPositionsText(p)}\n`; });
            }
            text += '\n';
        });

        try {
            await navigator.clipboard.writeText(text);
            const orig = btnCopyResult.textContent;
            btnCopyResult.textContent = 'Copiado! ✓';
            btnCopyResult.style.backgroundColor = '#00cc6a';
            setTimeout(() => { btnCopyResult.textContent = orig; btnCopyResult.style.backgroundColor = ''; }, 2000);
        } catch {
            alert('Não foi possível copiar automaticamente.');
        }
    });

    // ===========================
    // Init
    // ===========================
    showPositions = balancePositionsCheck.checked;
    initSquads().then(() => {
        renderPlayers();
        switchView('draw');
    });
});

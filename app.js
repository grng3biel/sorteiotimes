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
    let fillerIndex = 0; // ponteiro para o próximo filler disponível

    // ===========================
    // Squad Management
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

    function getPlayersKey(squadId) {
        return `sorteador_players_${squadId}`;
    }

    function loadPlayers(squadId) {
        const raw = JSON.parse(localStorage.getItem(getPlayersKey(squadId))) || [];
        // Migrate old format
        return raw.map(p => {
            if (p.selected === undefined) p.selected = true;
            // Migrate old positions array to {primary, secondary}
            if (Array.isArray(p.positions)) {
                p.primaryPos = p.positions[0] || '';
                p.secondaryPos = p.positions[1] || '';
                delete p.positions;
            }
            if (p.primaryPos === undefined) p.primaryPos = '';
            if (p.secondaryPos === undefined) p.secondaryPos = '';
            return p;
        });
    }

    function savePlayers() {
        const id = getActiveSquadId();
        localStorage.setItem(getPlayersKey(id), JSON.stringify(players));
    }

    function initSquads() {
        let squads = getSquads();

        // Migrate legacy players (saved without squads)
        const legacyPlayers = localStorage.getItem('sorteador_jogadores');
        if (legacyPlayers && squads.length === 0) {
            const firstId = Date.now().toString();
            squads = [{ id: firstId, name: 'Elenco Principal' }];
            saveSquads(squads);
            localStorage.setItem(getPlayersKey(firstId), legacyPlayers);
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
        players = loadPlayers(activeId);

        // Seed dummy players if empty
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
        players = loadPlayers(newId);
        renderPlayers(searchManage.value);
        renderSelectPlayersList(searchDraw.value);
    });

    btnNewSquad.addEventListener('click', () => {
        const name = prompt('Nome do novo elenco:');
        if (!name || !name.trim()) return;
        const squads = getSquads();
        const newId = Date.now().toString();
        squads.push({ id: newId, name: name.trim() });
        saveSquads(squads);
        setActiveSquadId(newId);
        players = [];
        savePlayers();
        renderSquadSelect(squads, newId);
        renderPlayers();
        renderSelectPlayersList();
    });

    btnRenameSquad.addEventListener('click', () => {
        const activeId = getActiveSquadId();
        const squads = getSquads();
        const squad = squads.find(s => s.id === activeId);
        if (!squad) return;
        const newName = prompt('Novo nome para o elenco:', squad.name);
        if (!newName || !newName.trim()) return;
        squad.name = newName.trim();
        saveSquads(squads);
        renderSquadSelect(squads, activeId);
    });

    btnDeleteSquad.addEventListener('click', () => {
        const squads = getSquads();
        if (squads.length <= 1) {
            alert('Você precisa ter ao menos um elenco!');
            return;
        }
        const activeId = getActiveSquadId();
        const squad = squads.find(s => s.id === activeId);
        if (!confirm(`Excluir o elenco "${squad.name}" e todos os seus jogadores? Esta ação não pode ser desfeita.`)) return;
        localStorage.removeItem(getPlayersKey(activeId));
        const newSquads = squads.filter(s => s.id !== activeId);
        saveSquads(newSquads);
        const newActiveId = newSquads[0].id;
        setActiveSquadId(newActiveId);
        players = loadPlayers(newActiveId);
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
            // Sempre começa no passo 1 ao entrar na aba
            drawStep1.classList.remove('hidden');
            drawStep2.classList.add('hidden');
            renderSelectPlayersList(searchDraw.value);
        }
    }

    navManage.addEventListener('click', () => switchView('manage'));
    navDraw.addEventListener('click', () => switchView('draw'));

    // Navegação interna do Sorteio
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

    function addPlayer() {
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
        players.push({ id: Date.now(), name, rating: currentRating, selected: true, primaryPos: primary, secondaryPos: secondary });
        savePlayers();
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

    btnSaveEdit.addEventListener('click', () => {
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
            savePlayers();
            renderPlayers(searchManage.value);
            if (!viewDraw.classList.contains('hidden')) renderSelectPlayersList(searchDraw.value);
        }
        editOverlay.classList.add('hidden');
        editingPlayerId = null;
    });

    // ===========================
    // Delete / Clear
    // ===========================
    function deletePlayer(id) {
        players = players.filter(p => p.id !== id);
        savePlayers();
        renderPlayers(searchManage.value);
        if (!viewDraw.classList.contains('hidden')) renderSelectPlayersList(searchDraw.value);
    }

    btnClearAll.addEventListener('click', () => {
        if (confirm('Remover todos os jogadores deste elenco?')) {
            players = [];
            savePlayers();
            renderPlayers();
            if (!viewDraw.classList.contains('hidden')) renderSelectPlayersList();
        }
    });

    // ===========================
    // Search
    // ===========================
    searchManage.addEventListener('input', (e) => renderPlayers(e.target.value));
    searchDraw.addEventListener('input', (e) => renderSelectPlayersList(e.target.value));

    // When balance-positions checkbox changes, re-render lists to show/hide position tags
    balancePositionsCheck.addEventListener('change', () => {
        showPositions = balancePositionsCheck.checked;
        renderPlayers(searchManage.value);
        renderSelectPlayersList(searchDraw.value);
    });

    // ===========================
    // Position Helpers
    // ===========================
    const POS_PRIORITY = { 'GOL': 1, 'DEF': 2, 'MEI': 3, 'ATA': 4, 'GER': 5 };

    function getEffectivePrimaryPriority(player) {
        return POS_PRIORITY[player.primaryPos] || 5;
    }
    function getEffectiveSecondaryPriority(player) {
        return POS_PRIORITY[player.secondaryPos] || 5;
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
            const starsStr = '★'.repeat(player.rating);
            const posHtml = getPositionsHtml(player);
            li.innerHTML = `
                <input type="checkbox" id="chk-${player.id}" data-id="${player.id}" ${player.selected ? 'checked' : ''}>
                <label for="chk-${player.id}" class="player-info" style="cursor:pointer; width:100%;">
                    <span class="player-name">${player.name} ${posHtml}</span>
                    <span class="player-rating">${starsStr}</span>
                </label>`;
            selectPlayersListUl.appendChild(li);
        });

        selectedCountSpan.textContent = players.filter(p => p.selected).length;

        selectPlayersListUl.querySelectorAll('input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const player = players.find(p => p.id === id);
                if (player) {
                    player.selected = e.target.checked;
                    savePlayers();
                    selectedCountSpan.textContent = players.filter(p => p.selected).length;
                }
            });
        });
    }

    btnSelectAll.addEventListener('click', () => {
        const filter = searchDraw.value;
        const target = filter ? players.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())) : players;
        const allSelected = target.every(p => p.selected);
        target.forEach(p => p.selected = !allSelected);
        savePlayers();
        renderSelectPlayersList(filter);
    });

    // ===========================
    // Draw Algorithm
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

        let startersPool = [];
        let reservesPool = [];

        if (selected.length > totalStarterSlots) {
            const numReserves = selected.length - totalStarterSlots;

            if (usePositional) {
                // Count how many of each primary position we have
                const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                selected.forEach(p => counts[getEffectivePrimaryPriority(p)]++);

                // Minimum titulares needed per primary-pos priority to cover all teams
                const minRequired = {};
                for (let k in counts) minRequired[k] = Math.min(numTeams, counts[k]);

                const currentCounts = { ...counts };
                const shuffled = [...selected].sort(() => 0.5 - Math.random());

                shuffled.forEach(p => {
                    if (reservesPool.length < numReserves) {
                        const prio = getEffectivePrimaryPriority(p);
                        if (currentCounts[prio] - 1 >= minRequired[prio]) {
                            reservesPool.push(p);
                            currentCounts[prio]--;
                        } else {
                            startersPool.push(p);
                        }
                    } else {
                        startersPool.push(p);
                    }
                });

                // Safety fallback
                if (reservesPool.length < numReserves) {
                    startersPool.sort((a, b) => getEffectivePrimaryPriority(b) - getEffectivePrimaryPriority(a));
                    while (reservesPool.length < numReserves) reservesPool.push(startersPool.pop());
                }
            } else {
                const shuffled = [...selected].sort(() => 0.5 - Math.random());
                reservesPool = shuffled.slice(0, numReserves);
                startersPool = shuffled.slice(numReserves);
            }
        } else {
            startersPool = [...selected];
        }

        const teams = Array.from({ length: numTeams }, () => ({
            starters: [], reserves: [], totalStarterScore: 0, totalReserveScore: 0
        }));

        // Sort function for pools
        function sortPool(pool) {
            if (usePositional) {
                pool.sort((a, b) => {
                    const pA = getEffectivePrimaryPriority(a);
                    const pB = getEffectivePrimaryPriority(b);
                    if (pA !== pB) return pA - pB;
                    return b.rating - a.rating;
                });
            } else {
                pool.sort((a, b) => b.rating - a.rating);
            }
        }

        // Helper: find weakest team by quantity first, then score
        function findWeakestTeamByCount(teamsArr, key, scoreKey) {
            let target = teamsArr[0];
            for (let i = 1; i < teamsArr.length; i++) {
                if (teamsArr[i][key].length < target[key].length) {
                    target = teamsArr[i];
                } else if (teamsArr[i][key].length === target[key].length) {
                    if (teamsArr[i][scoreKey] < target[scoreKey]) target = teamsArr[i];
                }
            }
            return target;
        }

        // --- Distribute Starters ---
        // When using positional balance: distribute by position group first
        if (usePositional) {
            // Group starters by primary position priority
            sortPool(startersPool);

            // Assign in waves: give one player per team (round-robin by priority group)
            // to ensure each team gets 1 GOL if possible, then fill with DEF, MEI, ATA
            const posGroups = { 1: [], 2: [], 3: [], 4: [], 5: [] };
            startersPool.forEach(p => posGroups[getEffectivePrimaryPriority(p)].push(p));

            // Sort each group by rating desc
            for (let k in posGroups) posGroups[k].sort((a, b) => b.rating - a.rating);

            // For each priority group, distribute round-robin to the team with fewest starters (then weakest score)
            [1, 2, 3, 4, 5].forEach(prio => {
                posGroups[prio].forEach(player => {
                    const target = findWeakestTeamByCount(teams, 'starters', 'totalStarterScore');
                    target.starters.push(player);
                    target.totalStarterScore += player.rating;
                });
            });
        } else {
            sortPool(startersPool);
            startersPool.forEach(player => {
                const target = findWeakestTeamByCount(teams, 'starters', 'totalStarterScore');
                target.starters.push(player);
                target.totalStarterScore += player.rating;
            });
        }

        // --- Distribute Reserves (always by count then score) ---
        sortPool(reservesPool);
        reservesPool.forEach(player => {
            const target = findWeakestTeamByCount(teams, 'reserves', 'totalReserveScore');
            target.reserves.push(player);
            target.totalReserveScore += player.rating;
        });

        // --- Final sort within each team for display ---
        teams.forEach(team => {
            sortPool(team.starters);
            sortPool(team.reserves);
        });

        // --- Fill remaining starter slots with filler players ---
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
            const posNote = showPositions ? '' : '';

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
    initSquads();
    renderPlayers();
});

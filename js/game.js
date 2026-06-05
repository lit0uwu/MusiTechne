document.addEventListener('DOMContentLoaded', () => {
    // --- UI Экраны ---
    const screens = {
        levelSelect: document.getElementById('screen-level-select'),
        game: document.getElementById('screen-game'),
        result: document.getElementById('screen-result'),
        setupRecord: document.getElementById('screen-setup-record'),
        saveRecord: document.getElementById('screen-save-record')
    };

    const mascotGame = document.getElementById('game-mascot');
    const mascotResult = document.getElementById('result-mascot');
    const hpBar = document.getElementById('hp-bar');
    const scoreDisplay = document.getElementById('score-display');
    const comboDisplay = document.getElementById('combo-display');
    
    // --- ПЕРЕМЕННЫЕ ИГРЫ ---
    let score = 0; let combo = 0; let hp = 100;
    let isPlaying = false; 
    let currentTrack = null; let activeNotes = []; 
    
    const hitTolerance = 0.3; 
    const fallSpeedBase = 500; 
    const songStartDelay = 2; 

    // --- ПЕРЕМЕННЫЕ РЕДАКТОРА ---
    let isRecording = false;
    let recordedNotes = [];
    let flyingNotes = [];
    let recordActiveKeys = {}; // Хранит время начала нажатия { дорожка: время_старта }
    let gameActiveKeys = {}; // Блокировка авто-повтора зажатия в игре

    // 1. ПОЛИСИНТЕЗАТОР: Позволяет удерживать звук и играть аккорды!
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    
    // 2. РУССКАЯ И АНГЛИЙСКАЯ РАСКЛАДКИ ВМЕСТЕ
    const keyMap = { 
        'q': 0, 'w': 1, 'e': 2, 'r': 3, 't': 4,
        'й': 0, 'ц': 1, 'у': 2, 'к': 3, 'е': 4 
    };
    const notesMap = ['C4', 'D4', 'E4', 'F4', 'G4'];
    const colors = ['#ff5252', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0'];

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    window.addEventListener('resize', resizeCanvas);


    // ==========================================
    // MODULE: IndexedDB 
    // ==========================================
    function initDB() {
        return new Promise((resolve) => {
            const request = indexedDB.open("MusitechneDB", 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("custom_tracks")) {
                    db.createObjectStore("custom_tracks", { keyPath: "id" });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
        });
    }

    async function loadCustomTracks() {
        try {
            const db = await initDB();
            return new Promise((resolve) => {
                const req = db.transaction("custom_tracks", "readonly").objectStore("custom_tracks").getAll();
                req.onsuccess = () => resolve(req.result || []);
            });
        } catch (e) { return []; }
    }

    async function saveCustomTrack(t) {
        const db = await initDB();
        return new Promise((resolve) => {
            const tx = db.transaction("custom_tracks", "readwrite");
            tx.objectStore("custom_tracks").put(t);
            tx.oncomplete = () => resolve();
        });
    }


    // ==========================================
    // 1. МЕНЮ
    // ==========================================
    async function initMenu() {
        const levelList = document.getElementById('level-list');
        levelList.innerHTML = `<li class="create-new" id="btn-create-level">[+] Создать свой трек (Режим Записи)</li>`;
        
        const customTracks = await loadCustomTracks();
        customTracks.forEach(track => {
            const li = document.createElement('li');
            li.innerHTML = `⭐ <b>${track.title}</b>`;
            li.style.borderLeft = "5px solid #ffeb3b";
            li.onclick = () => startGame(track);
            levelList.appendChild(li);
        });

        fetch('data/tracks.json').then(res => res.json()).then(data => {
            data.defaultTracks.forEach((t) => {
                if (t.notes.length > 0) {
                    const li = document.createElement('li');
                    li.textContent = `${t.id}. ${t.title}`;
                    li.onclick = () => startGame(t);
                    levelList.appendChild(li);
                }
            });
        }).catch(() => {
            const li = document.createElement('li'); li.textContent = "1. Тестовая мелодия";
            li.onclick = () => startGame({id: 1, title: "Test", notes: [{note: 'C4', time: 1}, {note: 'E4', time: 2}] });
            levelList.appendChild(li);
        });

        document.getElementById('btn-create-level').onclick = () => {
            screens.levelSelect.classList.remove('active');
            screens.setupRecord.classList.add('active');
            document.getElementById('rec-title').focus();
        };
    }


    // ==========================================
    // 2. ИГРОВОЙ ЦИКЛ (С ОТРИСОВКОЙ ДЛИННЫХ НОТ)
    // ==========================================
    async function startGame(track) {
        await Tone.start(); 
        currentTrack = track;
        score = 0; hp = 100; combo = 0; updateHUD();
        
        activeNotes = track.notes.map(n => {
            const numTime = typeof n.time === 'string' ? Tone.Time(n.time).toSeconds() : Number(n.time);
            const laneIndex = notesMap.indexOf(n.note) !== -1 ? notesMap.indexOf(n.note) : 0;
            const duration = n.duration ? Number(n.duration) : 0.2; // По умолчанию нота короткая (0.2s)
            
            return { lane: laneIndex, time: numTime + songStartDelay, duration: duration, hit: false, missed: false };
        });

        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens.game.classList.add('active');
        document.getElementById('hud-normal').style.display = "flex";
        document.getElementById('hud-record').style.display = "none";
        
        resizeCanvas(); mascotGame.src = 'assets/characters/djkin/djkin_1.png';
        Tone.Transport.stop(); Tone.Transport.position = 0; Tone.Transport.start();
        isPlaying = true;
        requestAnimationFrame(gameLoop);
    }

    function gameLoop() {
        if (!isPlaying && !isRecording) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const currentTime = Tone.Transport.seconds;
        const targetY = canvas.height - 40; 
        const laneWidth = canvas.width / 5;

        // Полосы дорожек
        for (let i = 1; i < 5; i++) {
            ctx.beginPath(); ctx.moveTo(i * laneWidth, 0); ctx.lineTo(i * laneWidth, canvas.height);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; ctx.lineWidth = 2; ctx.stroke();
        }

        if (isPlaying) {
            ctx.beginPath(); ctx.moveTo(0, targetY); ctx.lineTo(canvas.width, targetY);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; ctx.lineWidth = 6; ctx.stroke();

            let allDone = true;
            activeNotes.forEach(note => {
                if (note.hit || note.missed) return;
                allDone = false; 

                // Высчитываем высоту ноты от ее длительности (минимум 30px для кликабельности)
                const noteHeight = Math.max(30, note.duration * fallSpeedBase);
                
                // y - это координата НАЧАЛА ноты (ее нижний край, бьющий по TargetLine)
                const y = targetY - (note.time - currentTime) * fallSpeedBase;

                // Если ВЕРХНИЙ конец ноты ушел глубоко за экран
                if (y - noteHeight > canvas.height + 50) { 
                    note.missed = true; handleMiss(); 
                }

                if (y > -100 && y - noteHeight < canvas.height + 100) {
                    ctx.fillStyle = colors[note.lane];
                    // Рисуем прямоугольник: он устремляется ВВЕРХ от точки y
                    ctx.fillRect(note.lane * laneWidth + 10, y - noteHeight, laneWidth - 20, noteHeight);
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; ctx.lineWidth = 2;
                    ctx.strokeRect(note.lane * laneWidth + 10, y - noteHeight, laneWidth - 20, noteHeight);
                }
            });

            if (allDone && activeNotes.length > 0) {
                isPlaying = false; setTimeout(() => endGame(true), 1500); 
            } else if (hp <= 0) {
                isPlaying = false; endGame(false);
            } else { requestAnimationFrame(gameLoop); }
        }
        
        if (isRecording) {
            for (let i = flyingNotes.length - 1; i >= 0; i--) {
                let note = flyingNotes[i];
                note.y -= 15; 
                ctx.fillStyle = colors[note.lane];
                ctx.globalAlpha = note.y / canvas.height;
                ctx.fillRect(note.lane * laneWidth + 10, note.y, laneWidth - 20, 30);
                ctx.globalAlpha = 1.0;
                if (note.y < 0) flyingNotes.splice(i, 1);
            }
            requestAnimationFrame(gameLoop);
        }
    }


    // ==========================================
    // 3. ОБРАБОТЧИКИ НАЖАТИЯ И ОТПУСКАНИЯ (ДЛИТЕЛЬНОСТЬ)
    // ==========================================
    function handleInputDown(laneIndex) {
        if (gameActiveKeys[laneIndex]) return; // Игнорируем автоповтор зажатой клавиши
        gameActiveKeys[laneIndex] = true;

        // Включаем звук (он не кончится, пока не вызовем Release)
        synth.triggerAttack(notesMap[laneIndex]);
        mascotGame.src = 'assets/characters/djkin/djkin_2.png';

        if (isPlaying) {
            // Проверка попадания ритм-игры
            const currentTime = Tone.Transport.seconds;
            let noteFound = false;
            for (let i = 0; i < activeNotes.length; i++) {
                let note = activeNotes[i];
                if (!note.hit && !note.missed && note.lane === laneIndex && Math.abs(note.time - currentTime) <= hitTolerance) {
                    note.hit = true; combo++; score += 10 + combo * 2; hp = Math.min(100, hp + 3); updateHUD();
                    noteFound = true; break; 
                }
            }
            if (!noteFound) { combo = 0; hp -= 5; updateHUD(); }
        } 
        else if (isRecording) {
            // РЕДАКТОР: Запоминаем время, когда нота начала звучать
            recordActiveKeys[laneIndex] = Tone.Transport.seconds;
            flyingNotes.push({ lane: laneIndex, y: canvas.height }); 
        }
    }

    function handleInputUp(laneIndex) {
        if (!gameActiveKeys[laneIndex]) return;
        delete gameActiveKeys[laneIndex];

        // Останавливаем звук полисинтезатора
        synth.triggerRelease(notesMap[laneIndex]);
        
        // Возвращаем маскота, если ни одна клавиша больше не зажата
        if (Object.keys(gameActiveKeys).length === 0) {
            mascotGame.src = 'assets/characters/djkin/djkin_1.png';
        }

        // РЕДАКТОР: Завершение и сохранение длительности
        if (isRecording && recordActiveKeys[laneIndex] !== undefined) {
            const startT = recordActiveKeys[laneIndex];
            const endT = Tone.Transport.seconds;
            const duration = Math.max(0.1, endT - startT); // Минимум 0.1 секунды длительность
            
            recordedNotes.push({
                note: notesMap[laneIndex],
                time: startT.toFixed(3),
                duration: duration.toFixed(3)
            });
            delete recordActiveKeys[laneIndex];
            
            // Чтобы показать статус
            const element = document.getElementById('hud-record').querySelector('.rec-blinker');
            element.textContent = `🔴 ЗАПИСЬ (Нот: ${recordedNotes.length})`;
        }
    }

    function handleMiss() { combo = 0; hp -= 15; updateHUD(); }
    function updateHUD() {
        scoreDisplay.textContent = score; comboDisplay.textContent = `Combo: ${combo}`;
        hpBar.style.width = `${Math.max(0, hp)}%`; hpBar.style.background = hp < 30 ? '#ff5252' : '#4CAF50';
    }

    // --- КЛАВИАТУРА И МЫШЬ (DOWN / UP) ---
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.repeat) return; 
        const lane = keyMap[e.key.toLowerCase()];
        if (lane !== undefined) {
            handleInputDown(lane);
            const keyEl = document.querySelector(`.key[data-lane="${lane}"]`);
            if (keyEl) keyEl.classList.add('active');
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.target.tagName === 'INPUT') return; 
        const lane = keyMap[e.key.toLowerCase()];
        if (lane !== undefined) {
            handleInputUp(lane);
            const keyEl = document.querySelector(`.key[data-lane="${lane}"]`);
            if (keyEl) keyEl.classList.remove('active');
        }
    });

    document.querySelectorAll('.key').forEach(key => {
        const lane = parseInt(key.dataset.lane);
        key.addEventListener('mousedown', () => handleInputDown(lane));
        key.addEventListener('touchstart', (e) => { e.preventDefault(); handleInputDown(lane); });
        
        ['mouseup', 'mouseleave', 'touchend'].forEach(evt => {
            key.addEventListener(evt, () => handleInputUp(lane));
        });
    });


    // ==========================================
    // 4. ЭКРАНЫ ПЕРЕХОДОВ
    // ==========================================
    function endGame(isVictory) {
        Tone.Transport.stop();
        // Принудительно отпускаем все звуки
        synth.releaseAll();
        
        screens.game.classList.remove('active'); screens.result.classList.add('active');
        document.getElementById('result-title').textContent = isVictory ? "Уровень Пройден!" : "Провал...";
        document.getElementById('result-title').style.color = isVictory ? "#4caf50" : "#ff5252";
        document.getElementById('result-score').textContent = score;
        mascotResult.src = isVictory ? 'assets/characters/djkin/djkin_happy.png' : 'assets/characters/djkin/djkin_sad.png';
    }

    document.getElementById('btn-back-menu').onclick = () => window.location.href = 'index.html';
    document.getElementById('btn-retry').onclick = () => startGame(currentTrack);
    document.getElementById('btn-levels').onclick = () => window.location.reload();


    // --- ЛОГИКА РЕДАКТОРА ---
    document.getElementById('btn-cancel-record').onclick = () => window.location.reload();
    
    document.getElementById('btn-start-record').onclick = async () => {
        const inputTitle = document.getElementById('rec-title').value;
        if (!inputTitle.trim()) { alert("Введите название трека!"); return; }
        
        await Tone.start();
        recordedNotes = []; flyingNotes = []; recordActiveKeys = {};
        
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens.game.classList.add('active');
        document.getElementById('hud-normal').style.display = "none";
        document.getElementById('hud-record').style.display = "flex";
        
        resizeCanvas(); mascotGame.src = 'assets/characters/djkin/djkin_1.png';
        Tone.Transport.stop(); Tone.Transport.position = 0; Tone.Transport.start();
        isRecording = true;
        requestAnimationFrame(gameLoop);
    };

    document.getElementById('btn-stop-record').onclick = () => {
        isRecording = false;
        Tone.Transport.stop();
        synth.releaseAll(); // Глушим звук
        screens.game.classList.remove('active');
        screens.saveRecord.classList.add('active');
        document.getElementById('rec-stats').textContent = recordedNotes.length;
    };

    document.getElementById('btn-discard').onclick = () => window.location.reload();

    document.getElementById('btn-save-db').onclick = async () => {
        if (recordedNotes.length === 0) { alert("Вы не нажали ни одной ноты!"); return; }
        const newTrack = {
            id: "track_" + Date.now(),
            title: document.getElementById('rec-title').value,
            tempo: 120,
            notes: recordedNotes
        };
        await saveCustomTrack(newTrack);
        window.location.reload(); 
    };

    initMenu(); 
});
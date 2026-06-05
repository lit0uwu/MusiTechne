document.addEventListener('DOMContentLoaded', () => {
    // --- ЭЛЕМЕНТЫ UI ---
    const screens = {
        levelSelect: document.getElementById('screen-level-select'),
        game: document.getElementById('screen-game'),
        result: document.getElementById('screen-result')
    };

    const mascotGame = document.getElementById('game-mascot');
    const mascotResult = document.getElementById('result-mascot');
    const hpBar = document.getElementById('hp-bar');
    const scoreDisplay = document.getElementById('score-display');
    const comboDisplay = document.getElementById('combo-display');
    
    // --- ПЕРЕМЕННЫЕ ИГРЫ ---
    let score = 0;
    let combo = 0;
    let hp = 100;
    let isPlaying = false;
    let currentTrack = null;
    let activeNotes = []; 
    
    const hitTolerance = 0.3; // Секунды погрешности (насколько рано/поздно можно нажать)
    const fallSpeedBase = 500; // Скорость падения (пикселей в секунду)
    const songStartDelay = 2; // Все ноты стартуют на 2 секунды позже, чтобы успеть упасть сверху

    const synth = new Tone.Synth().toDestination();
    const keyMap = { 'q': 0, 'w': 1, 'e': 2, 'r': 3, 't': 4 };
    const notesMap = ['C4', 'D4', 'E4', 'F4', 'G4'];
    const colors = ['#ff5252', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0'];

    // --- CANVAS НАСТРОЙКИ ---
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // --- 1. ВЫБОР УРОВНЯ ---
    function initMenu() {
        const levelList = document.getElementById('level-list');
        levelList.innerHTML = `<li class="create-new" id="btn-create-level">[+] Создать свой трек</li>`;
        
        fetch('data/tracks.json')
            .then(res => {
                if (!res.ok) throw new Error("JSON not found");
                return res.json();
            })
            .then(data => {
                data.defaultTracks.forEach((track) => {
                    if (track.notes && track.notes.length > 0) {
                        const li = document.createElement('li');
                        li.textContent = `${track.id}. ${track.title}`;
                        li.onclick = () => startGame(track);
                        levelList.appendChild(li);
                    }
                });
            })
            .catch(() => {
                // Если JSON не грузится (ошибка CORS на ПК), всегда будет этот уровень
                const li = document.createElement('li');
                li.textContent = "1. Тестовая мелодия (Резерв)";
                li.onclick = () => startGame({
                    id: 1, title: "Test", 
                    notes: [
                        {note: 'C4', time: 1}, {note: 'D4', time: 1.5}, 
                        {note: 'E4', time: 2}, {note: 'F4', time: 2.5},
                        {note: 'G4', time: 3}, {note: 'F4', time: 3.5},
                        {note: 'E4', time: 4}, {note: 'D4', time: 4.5},
                        {note: 'C4', time: 5}
                    ]
                });
                levelList.appendChild(li);
            });

        document.getElementById('btn-create-level').onclick = () => {
            alert("Редактор уровней в разработке");
        };
    }

    // --- 2. СТАРТ И ЦИКЛ ---
    async function startGame(track) {
        await Tone.start(); 
        currentTrack = track;
        score = 0; hp = 100; combo = 0;
        updateHUD();
        
        // Превращаем ноты из JSON в игровые тайлы 
        activeNotes = track.notes.map(n => {
            const numTime = typeof n.time === 'string' ? Tone.Time(n.time).toSeconds() : Number(n.time);
            const laneIndex = notesMap.indexOf(n.note) !== -1 ? notesMap.indexOf(n.note) : Math.floor(Math.random()*5);
            return {
                lane: laneIndex,
                time: numTime + songStartDelay,
                hit: false,
                missed: false
            };
        });

        // 1. Показываем игровой экран
        screens.levelSelect.classList.remove('active');
        screens.result.classList.remove('active');
        screens.game.classList.add('active');
        
        // !!! ВОТ РЕШЕНИЕ ПРОБЛЕМЫ !!!
        // Пересчитываем размер холста только сейчас, когда он стал видимым!
        resizeCanvas();

        mascotGame.src = 'assets/characters/djkin/djkin_1.png';

        // 2. Сбрасываем и запускаем время в Tone.js
        Tone.Transport.stop();
        Tone.Transport.position = 0;
        Tone.Transport.start();
        isPlaying = true;

        // 3. Запускаем отрисовку
        requestAnimationFrame(gameLoop);
    }
    
    // --- ОТРИСОВКА (RENDER) ---
    function gameLoop() {
        if (!isPlaying) return;

        // Очищаем экран на каждом кадре
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const currentTime = Tone.Transport.seconds;
        const targetY = canvas.height - 40; // Целевая линия удара
        const laneWidth = canvas.width / 5;

        // --- Рисуем 5 вертикальных дорожек (как струны), чтобы игрок видел, куда летят ноты
        for (let i = 1; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(i * laneWidth, 0);
            ctx.lineTo(i * laneWidth, canvas.height);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; // Тусклые полосы
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // --- Рисуем горизонтальную линию удара
        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(canvas.width, targetY);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 6;
        ctx.stroke();

        let allDone = true;

        // --- Отрисовка падающих нот (тайлов) ---
        activeNotes.forEach(note => {
            if (note.hit || note.missed) return;
            allDone = false; 

            // ФОРМУЛА ПАДЕНИЯ
            const y = targetY - (note.time - currentTime) * fallSpeedBase;

            // Если нота визуально упала за пределами экрана в самый низ
            if (y > canvas.height + 50) {
                note.missed = true;
                handleMiss();
            }

            // Рисуем тайл, только если он находится в видимой части экрана
            if (y > -100 && y < canvas.height + 100) {
                ctx.fillStyle = colors[note.lane];
                // Надежный прямоугольник (fillRect поддерживается абсолютно везде)
                ctx.fillRect(note.lane * laneWidth + 10, y - 30, laneWidth - 20, 60);
                
                // Добавляем белую обводку тайлу для красоты
                ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
                ctx.lineWidth = 2;
                ctx.strokeRect(note.lane * laneWidth + 10, y - 30, laneWidth - 20, 60);
            }
        });

        // Если все ноты сыграны или пропущены - конец игры
        if (allDone && activeNotes.length > 0) {
            isPlaying = false;
            setTimeout(() => endGame(true), 1500); 
        } else if (hp <= 0) {
            isPlaying = false;
            endGame(false);
        } else {
            requestAnimationFrame(gameLoop);
        }
    }


    // --- 3. ИГРОВАЯ ЛОГИКА (Нажатия) ---
    function handleHit(laneIndex) {
        if (!isPlaying) return;
        const currentTime = Tone.Transport.seconds;
        
        synth.triggerAttackRelease(notesMap[laneIndex], "8n");
        mascotGame.src = 'assets/characters/djkin/djkin_2.png';
        
        let noteFound = false;
        
        for (let i = 0; i < activeNotes.length; i++) {
            let note = activeNotes[i];
            
            if (!note.hit && !note.missed && note.lane === laneIndex) {
                if (Math.abs(note.time - currentTime) <= hitTolerance) {
                    note.hit = true;
                    combo++;
                    score += 10 + combo * 2;
                    hp = Math.min(100, hp + 3);
                    
                    updateHUD();
                    noteFound = true;
                    break; 
                }
            }
        }
        
        if (!noteFound) {
            combo = 0;
            hp -= 5;
            updateHUD();
        }
    }

    function handleMiss() {
        combo = 0;
        hp -= 15;
        updateHUD();
    }

    function updateHUD() {
        scoreDisplay.textContent = score;
        comboDisplay.textContent = `Combo: ${combo}`;
        hpBar.style.width = `${Math.max(0, hp)}%`;
        hpBar.style.background = hp < 30 ? '#ff5252' : '#4CAF50';
    }


    // --- 4. УПРАВЛЕНИЕ ---
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return; 
        const lane = keyMap[e.key.toLowerCase()];
        if (lane !== undefined) {
            handleHit(lane);
            const keyEl = document.querySelector(`.key[data-lane="${lane}"]`);
            if (keyEl) keyEl.classList.add('active');
        }
    });

    document.addEventListener('keyup', (e) => {
        const lane = keyMap[e.key.toLowerCase()];
        if (lane !== undefined) {
            mascotGame.src = 'assets/characters/djkin/djkin_1.png';
            const keyEl = document.querySelector(`.key[data-lane="${lane}"]`);
            if (keyEl) keyEl.classList.remove('active');
        }
    });

    // Мобильный ввод
    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('mousedown', () => handleHit(parseInt(key.dataset.lane)));
        key.addEventListener('touchstart', (e) => {
            e.preventDefault(); 
            handleHit(parseInt(key.dataset.lane));
        });
        
        ['mouseup', 'mouseleave', 'touchend'].forEach(evt => {
            key.addEventListener(evt, () => {
                mascotGame.src = 'assets/characters/djkin/djkin_1.png';
            });
        });
    });


    // --- 5. ЭКРАН РЕЗУЛЬТАТОВ ---
    function endGame(isVictory) {
        Tone.Transport.stop();
        screens.game.classList.remove('active');
        screens.result.classList.add('active');
        
        document.getElementById('result-title').textContent = isVictory ? "Уровень Пройден!" : "Провал...";
        document.getElementById('result-title').style.color = isVictory ? "#4caf50" : "#ff5252";
        document.getElementById('result-score').textContent = score;
        
        mascotResult.src = isVictory ? 'assets/characters/djkin/djkin_happy.png' : 'assets/characters/djkin/djkin_sad.png';
    }

    document.getElementById('btn-back-menu').onclick = () => window.location.href = 'index.html';
    document.getElementById('btn-retry').onclick = () => startGame(currentTrack);
    document.getElementById('btn-levels').onclick = () => {
        screens.result.classList.remove('active');
        screens.levelSelect.classList.add('active');
    };

    initMenu(); 
    setTimeout(resizeCanvas, 200);
});
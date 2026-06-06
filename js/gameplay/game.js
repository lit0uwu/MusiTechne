import { initDB, getTracks, loadCustomTracks, saveCustomTrack } from "../database.js";
import { keyMap, fallSpeedBase, hitTolerance, songStartDelay } from "./config.js";
import { drawRect, drawLine, drawRoads,  } from "./render.js";
import { synth, startAudio, notesMap, stopAudio, playNote, stopNote, getAudioTime, setNotesMap } from "./audio.js";

document.addEventListener('DOMContentLoaded', () => {
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
    
    let score = 0; let combo = 0; let hp = 100;
    let isPlaying = false; 
    let currentTrack = null; let activeNotes = []; 
    
    let isRecording = false;
    let recordedNotes = [];
    let flyingNotes = [];
    let recordActiveKeys = {};
    let gameActiveKeys = {};

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    window.addEventListener('resize', resizeCanvas);

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

        const tracks = await getTracks();

        tracks.forEach(track => {
            const li = document.createElement('li');
            li.textContent = `${track.id}. ${track.title}`;
            li.onclick = () => startGame(track);
            levelList.appendChild(li);
        });

        document.getElementById('btn-create-level').onclick = () => {
            screens.levelSelect.classList.remove('active');
            screens.setupRecord.classList.add('active');
            document.getElementById('rec-title').focus();
        };
    }

    async function startGame(track) {
        await startAudio();
        currentTrack = track;
        score = 0; hp = 100; combo = 0; updateHUD();
        
        setNotesMap(Number(track.notesTemplate));

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
        
        isPlaying = true;
        requestAnimationFrame(gameLoop);
    }

    function gameLoop() {
        if (!isPlaying && !isRecording) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const currentTime = getAudioTime();
        const targetY = canvas.height - 40; 
        const laneWidth = canvas.width / notesMap.length;

        drawRoads(ctx, canvas, laneWidth);

        if (isPlaying) {
            drawLine(ctx, canvas, targetY);

            let allDone = true;
            activeNotes.forEach(note => {
                if (note.hit || note.missed) return;
                allDone = false; 
                const noteHeight = Math.max(30, note.duration * fallSpeedBase);
                const y = targetY - (note.time - currentTime) * fallSpeedBase;
                if (y - noteHeight > canvas.height + 50) { 
                    note.missed = true; handleMiss(); 
                }

                if (y > -100 && y - noteHeight < canvas.height + 100) {
                    drawRect(ctx, note, noteHeight, laneWidth, y);
                }
            });

            if (allDone && activeNotes.length > 0) {
                setTimeout(() => { isPlaying = false; endGame(true); stopAudio(); }, 1000); 
            } else if (hp <= 0) {
                stopAudio();
                isPlaying = false; 
                endGame(false);
            }
        }
        
        if (isRecording) {
            for (let i = flyingNotes.length - 1; i >= 0; i--) {
                let note = flyingNotes[i];
                if (note.isHolding) {
                    note.duration = currentTime - note.time;
                }
            
                const noteHeight = Math.max(30, note.duration * fallSpeedBase);
                const y = targetY - (currentTime - note.time) * fallSpeedBase;
            
                drawRect(ctx, note, noteHeight, laneWidth, y);
            
                if (y + noteHeight < -50) {
                    flyingNotes.splice(i, 1);
                }
            }
        }
        requestAnimationFrame(gameLoop);
    }

    function handleInputDown(laneIndex) {
        if (gameActiveKeys[laneIndex] || (!isPlaying && !isRecording)) return;
        gameActiveKeys[laneIndex] = true;

        playNote(laneIndex);

        mascotGame.src = 'assets/characters/djkin/djkin_2.png';
        const currentTime = getAudioTime();

        if (isPlaying) {
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
            recordActiveKeys[laneIndex] = getAudioTime();

            flyingNotes.push({ 
                lane: laneIndex, 
                time: currentTime,
                duration: 0,
                isHolding: true
            }); 
        }
    }

    function handleInputUp(laneIndex) {
        if (!gameActiveKeys[laneIndex] || (!isPlaying && !isRecording)) return;
        delete gameActiveKeys[laneIndex];

        stopNote(laneIndex);
        
        // Возвращаем маскота, если ни одна клавиша больше не зажата
        if (Object.keys(gameActiveKeys).length === 0) {
            mascotGame.src = 'assets/characters/djkin/djkin_1.png';
        }

        // РЕДАКТОР: Завершение и сохранение длительности
        if (isRecording && recordActiveKeys[laneIndex] !== undefined) {
            const startT = recordActiveKeys[laneIndex];
            const endT = getAudioTime();
            const duration = Math.max(0.1, endT - startT); // Минимум 0.1 секунды длительность
            
            recordedNotes.push({
                note: notesMap[laneIndex],
                time: startT.toFixed(3),
                duration: duration.toFixed(3)
            });
            delete recordActiveKeys[laneIndex];
            
            const flyingNote = flyingNotes.find(n => n.lane === laneIndex && n.time === startT);
            if (flyingNote) {
                flyingNote.duration = duration;
                flyingNote.isHolding = false;
            }

            const recordInd = document.getElementById('hud-record').querySelector('.rec-blinker');
            recordInd.textContent = `🔴 ЗАПИСЬ (Нот: ${recordedNotes.length})`;
        }
    }

    function handleMiss() { combo = 0; hp -= 15; updateHUD(); }
    function updateHUD() {
        scoreDisplay.textContent = score; comboDisplay.textContent = `Combo: ${combo}`;
        hpBar.style.width = `${Math.max(0, hp)}%`; hpBar.style.background = hp < 30 ? '#ff5252' : '#4CAF50';
    }

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

    function endGame(isVictory) {
        screens.game.classList.remove('active'); 
        screens.result.classList.add('active');
        document.getElementById('result-title').textContent = isVictory ? "Уровень Пройден!" : "Провал...";
        document.getElementById('result-title').style.color = isVictory ? "#4caf50" : "#ff5252";
        document.getElementById('result-score').textContent = score;
        mascotResult.src = isVictory ? 'assets/characters/djkin/djkin_happy.png' : 'assets/characters/djkin/djkin_sad.png';
    }

    document.getElementById('btn-back-menu').onclick = () => window.location.href = 'index.html';
    document.getElementById('btn-retry').onclick = () => startGame(currentTrack);
    document.getElementById('btn-levels').onclick = () => window.location.reload();

    document.getElementById('btn-cancel-record').onclick = () => window.location.reload();
    
    document.getElementById('btn-start-record').onclick = async () => {
        const inputTitle = document.getElementById('rec-title').value;
        const notesSelect = document.getElementById('notesTemplate');
        const selectedNotesTemplate = Number(notesSelect.value); 

        setNotesMap(selectedNotesTemplate);

        if (!inputTitle.trim()) { alert("Введите название трека!"); return; }
        
        recordedNotes = []; flyingNotes = []; recordActiveKeys = {};
        
        await startAudio();

        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens.game.classList.add('active');
        document.getElementById('hud-normal').style.display = "none";
        document.getElementById('hud-record').style.display = "flex";
        
        resizeCanvas(); mascotGame.src = 'assets/characters/djkin/djkin_1.png';
        isRecording = true;
        requestAnimationFrame(gameLoop);
    };

    document.getElementById('btn-stop-record').onclick = () => {
        isRecording = false;
        stopAudio();
        screens.game.classList.remove('active');
        screens.saveRecord.classList.add('active');
        document.getElementById('rec-stats').textContent = recordedNotes.length;
    };

    document.getElementById('btn-discard').onclick = () => window.location.reload();

    document.getElementById('btn-save-db').onclick = async () => {
        if (recordedNotes.length === 0) { alert("Вы не нажали ни одной ноты!"); return; }
        const notesSelect = document.getElementById('notesTemplate');
        const selectedNotesTemplate = Number(notesSelect.value); 
        const newTrack = {
            id: "track_" + Date.now(),
            title: document.getElementById('rec-title').value,
            tempo: 120,
            notes: recordedNotes,
            notesTemplate: selectedNotesTemplate
        };
        await saveCustomTrack(newTrack);
        window.location.reload(); 
    };

    document.getElementById("toLevelsBtn").addEventListener('click', () => {
        window.location.reload();
    });

    initMenu(); 
});
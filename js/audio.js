// Инициализируем базовый синтезатор
const synth = new Tone.Synth().toDestination();

// Кэшируем DOM элементы
const btnStartAudio = document.getElementById('start-audio');
const keys = document.querySelectorAll('.key');

// Браузеры блокируют AudioContext до первого действия пользователя
btnStartAudio.addEventListener('click', async () => {
    await Tone.start();
    console.log('AudioContext успешно запущен');
    
    // Прячем кнопку, так как звук уже разрешен
    btnStartAudio.style.display = 'none';
});

// Карта клавиш для клавиатуры
const keyMap = { 
    'q': 'C4', 
    'w': 'D4', 
    'e': 'E4', 
    'r': 'F4', 
    't': 'G4' 
};

// Функция извлечения звука
function playNoteInteractive(note) {
    if (Tone.context.state !== 'running') {
        alert("Сначала нажмите кнопку 'Включить звук'!");
        return;
    }
    // Играем ноту длительностью 8n
    synth.triggerAttackRelease(note, "8n");
}

// 1. Привязка кликов мыши к HTML-клавишам
keys.forEach(key => {
    key.addEventListener('mousedown', () => {
        const note = key.dataset.note;
        playNoteInteractive(note);
    });
});

// 2. Привязка аппаратной клавиатуры компа
document.addEventListener('keydown', (e) => {
    // Игнорируем зажатие клавиши (чтобы звук не дребезжал)
    if (e.repeat) return;
    
    const note = keyMap[e.key.toLowerCase()];
    if (note) {
        playNoteInteractive(note);
        
        // Добавляем класс для визуального нажатия (CSS .active)
        const uiKey = document.querySelector(`.key[data-note="${note}"]`);
        if (uiKey) uiKey.classList.add('active');
    }
});

document.addEventListener('keyup', (e) => {
    const note = keyMap[e.key.toLowerCase()];
    if (note) {
        // Убираем класс визуального нажатия при отпускании
        const uiKey = document.querySelector(`.key[data-note="${note}"]`);
        if (uiKey) uiKey.classList.remove('active');
    }
});
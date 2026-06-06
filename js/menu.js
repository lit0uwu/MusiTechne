document.addEventListener('DOMContentLoaded', () => {
    
    const themeBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    // Загружаем сохраненную тему, либо берем системную
    let currentTheme = localStorage.getItem('theme');
    if (!currentTheme) {
        currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        // Меняем иконку (light.png на темной теме, чтобы переключить на светлую, и наоборот)
        themeIcon.src = theme === 'dark' ? 'assets/images/light.png' : 'assets/images/dark.png';
        localStorage.setItem('theme', theme);
    };

    applyTheme(currentTheme); // Применяем при загрузке

    themeBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(currentTheme);
    });


    // === 2. ЛОГИКА ДИАЛОГОВ И ВИЗУАЛЬНОЙ НОВЕЛЛЫ ===
    const dialogueBox = document.getElementById('dialogue-box');
    const dialogueText = document.getElementById('dialogue-text');
    const mascotImg = document.getElementById('djkin-mascot');
    
    let phrases = [];
    let currentPhrase = "";
    let typingTimer = null;
    let isTyping = false;

    // Загрузка JSON с фразами
    fetch('data/dialogues.json')
        .then(response => response.json())
        .then(data => {
            phrases = data.phrases;
            showRandomPhrase(); // Показываем первую фразу после загрузки
        })
        .catch(err => {
            console.error("Ошибка загрузки диалога:", err);
            phrases = ["Ошибка загрузки текста..."];
            showRandomPhrase();
        });

    // Функция эффекта печатной машинки
    function typeText(text) {
        isTyping = true;
        dialogueText.textContent = "";
        let i = 0;
        
        clearInterval(typingTimer);
        
        typingTimer = setInterval(() => {
            dialogueText.textContent += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(typingTimer);
                isTyping = false;
            }
        }, 40); // Скорость печати (40мс на букву)
    }

    // Выбор новой случайной фразы
    function showRandomPhrase() {
        const randomIndex = Math.floor(Math.random() * phrases.length);
        currentPhrase = phrases[randomIndex];
        typeText(currentPhrase);
    }

    // Клик по окошку диалога
    dialogueBox.addEventListener('click', () => {
        // Запускаем анимацию покачивания диджея
        mascotImg.classList.remove('dj-bounce'); // сброс
        void mascotImg.offsetWidth; // Магия браузера для перезапуска CSS-анимации
        mascotImg.classList.add('dj-bounce');

        if (isTyping) {
            // Если текст еще печатается - моментально выводим его до конца
            clearInterval(typingTimer);
            dialogueText.textContent = currentPhrase;
            isTyping = false;
        } else {
            // Если текст уже напечатан - показываем следующую фразу
            showRandomPhrase();
        }
    });

    const startBtn = document.getElementById('btn-start');
    startBtn.addEventListener('click', () => {
        document.body.style.transition = "opacity 0.5s ease";
        document.body.style.opacity = "0";
        
        setTimeout(() => {
            window.location.href = 'game.html'; 
        }, 500);
    });

});
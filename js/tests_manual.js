// Ручные тесты для Audio модуля (Tone.js)

console.log('ЗАПУСК ТЕСТОВ AUDIO.JS');
console.log('========================');

// Тест 1: Проверка глобальных объектов
console.log('Тест 1: Проверка что audio.js загружен');

if (typeof notesMap !== 'undefined') {
    console.log('[OK] notesMap определён:', notesMap);
} else {
    console.log('[ОШИБКА] notesMap не найден');
}

if (typeof setNotesMap === 'function') {
    console.log('[OK] setNotesMap определён');
} else {
    console.log('[ОШИБКА] setNotesMap не найден');
}

console.log('');

// Тест 2: Базовая раскладка
console.log('Тест 2: Проверка начальной раскладки');
console.log('Ожидается: ["C4", "D4", "E4", "F4", "G4"]');
console.log('Получено:  ', notesMap);
if (notesMap && notesMap[0] === 'C4' && notesMap[4] === 'G4') {
    console.log('[OK] Базовая раскладка верна');
} else {
    console.log('[ОШИБКА] Ошибка в базовой раскладке');
}
console.log('');

// Тест 3: Смена раскладки на октаву ниже
console.log('Тест 3: Смена раскладки на индекс 1 (октава ниже)');
const before = [...notesMap];
setNotesMap(1);
console.log('Было:', before);
console.log('Стало:', notesMap);
if (notesMap[0] === 'C3' && notesMap[4] === 'G3') {
    console.log('[OK] Смена раскладки работает');
} else {
    console.log('[ОШИБКА] Ошибка');
}
console.log('');

// Тест 4: Смена раскладки на октаву выше
console.log('Тест 4: Смена раскладки на индекс 2 (октава выше)');
setNotesMap(2);
console.log('Новая раскладка:', notesMap);
if (notesMap[0] === 'C5' && notesMap[4] === 'G5') {
    console.log('[OK] Октава выше установлена');
} else {
    console.log('[ОШИБКА] Ошибка');
}
console.log('');

// Тест 5: Защита от невалидного индекса
console.log('Тест 5: Проверка защиты от ошибок');
const snapshot = [...notesMap];
setNotesMap(999);
console.log('Попытка установить индекс 999');
if (snapshot.join() === notesMap.join()) {
    console.log('[OK] Раскладка не изменилась (защита сработала)');
} else {
    console.log('[ОШИБКА] Ошибка');
}
console.log('');

// Тест 6: Восстановление базовой раскладки
console.log('Тест 6: Восстановление базовой раскладки');
setNotesMap(0);
console.log('Текущая раскладка:', notesMap);
console.log('');

// Тест 7: Ручная проверка звука
console.log('Тест 7: Ручная проверка звука');
console.log('Пожалуйста, введите в консоли команду: playNote(0) - должен быть звук');
console.log('Пожалуйста, введите в консоли команду: stopNote(0) - звук остановится');
console.log('Пожалуйста, введите в консоли команду: startAudio() - запуск транспорта');
console.log('');

console.log('========================');
console.log('ТЕСТЫ ЗАВЕРШЕНЫ');
console.log('Спасибо за проверку');
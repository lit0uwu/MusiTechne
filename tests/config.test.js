import { hitTolerance, fallSpeedBase, songStartDelay, missCost, skipCost, keyMap } from '../js/gameplay/config.js';

describe('Config Tests', () => {
    test('параметры игры имеют правильные значения', () => {
        expect(hitTolerance).toBe(0.1);
        expect(fallSpeedBase).toBe(500);
        expect(songStartDelay).toBe(2);
        expect(missCost).toBe(5);
        expect(skipCost).toBe(15);
    });

    test('keyMap содержит 5 дорожек (0-4)', () => {
        const values = Object.values(keyMap);
        expect(Math.max(...values)).toBe(4);
        expect(Math.min(...values)).toBe(0);
    });

    test('keyMap поддерживает русские и английские буквы', () => {
        expect(keyMap['q']).toBe(0);
        expect(keyMap['й']).toBe(0);
        expect(keyMap['t']).toBe(4);
        expect(keyMap['е']).toBe(4);
    });
});
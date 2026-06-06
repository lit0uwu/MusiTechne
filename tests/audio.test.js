import { 
    synth, 
    notesMap, 
    setNotesMap, 
    playNote, 
    stopNote,
    startAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    getAudioTime
} from '../js/gameplay/audio.js';


jest.mock('tone', () => ({
    Tone: {
        start: jest.fn().mockResolvedValue(),
        Transport: {
            stop: jest.fn(),
            start: jest.fn(),
            pause: jest.fn(),
            toggle: jest.fn(),
            seconds: 0,
            position: 0
        }
    },
    PolySynth: jest.fn().mockImplementation(() => ({
        toDestination: jest.fn().mockReturnThis(),
        triggerAttack: jest.fn(),
        triggerRelease: jest.fn(),
        releaseAll: jest.fn()
    })),
    Synth: jest.fn()
}));

describe('Audio Module - Synth Tests', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('notesMap изначально содержит C4, D4, E4, F4, G4', () => {
        expect(notesMap).toEqual(['C4', 'D4', 'E4', 'F4', 'G4']);
        expect(notesMap.length).toBe(5);
    });

    test('setNotesMap(0) устанавливает базовую раскладку', () => {
        setNotesMap(0);
        expect(notesMap).toEqual(['C4', 'D4', 'E4', 'F4', 'G4']);
    });

    test('setNotesMap(1) устанавливает октаву ниже', () => {
        setNotesMap(1);
        expect(notesMap).toEqual(['C3', 'D3', 'E3', 'F3', 'G3']);
    });

    test('setNotesMap(2) устанавливает октаву выше', () => {
        setNotesMap(2);
        expect(notesMap).toEqual(['C5', 'D5', 'E5', 'F5', 'G5']);
    });

    test('setNotesMap(3) устанавливает кастомную раскладку', () => {
        setNotesMap(3);
        expect(notesMap).toEqual(['A4', 'E4', 'F4', 'C5', 'B4']);
    });

    test('setNotesMap с невалидным индексом ничего не меняет', () => {
        const originalMap = [...notesMap];
        setNotesMap(99);
        expect(notesMap).toEqual(originalMap);
        setNotesMap(-1);
        expect(notesMap).toEqual(originalMap);
    });

    test('playNote вызывает synth.triggerAttack с правильной нотой', () => {
        setNotesMap(0);
        playNote(0);
        expect(synth.triggerAttack).toHaveBeenCalledWith('C4');
        
        playNote(2);
        expect(synth.triggerAttack).toHaveBeenCalledWith('E4');
    });

    test('stopNote вызывает synth.triggerRelease с правильной нотой', () => {
        setNotesMap(0);
        stopNote(0);
        expect(synth.triggerRelease).toHaveBeenCalledWith('C4');
        
        stopNote(4);
        expect(synth.triggerRelease).toHaveBeenCalledWith('G4');
    });

    test('startAudio запускает Tone и Transport', async () => {
        await startAudio();
        expect(Tone.start).toHaveBeenCalled();
        expect(Tone.Transport.stop).toHaveBeenCalled();
        expect(Tone.Transport.start).toHaveBeenCalled();
    });

    test('pauseAudio ставит Transport на паузу', () => {
        pauseAudio();
        expect(Tone.Transport.pause).toHaveBeenCalled();
    });

    test('resumeAudio переключает Transport', () => {
        resumeAudio();
        expect(Tone.Transport.toggle).toHaveBeenCalled();
    });

    test('stopAudio останавливает Transport и отпускает все ноты', () => {
        stopAudio();
        expect(Tone.Transport.stop).toHaveBeenCalled();
        expect(synth.releaseAll).toHaveBeenCalled();
    });

    test('getAudioTime возвращает текущее время Transport', () => {
        Tone.Transport.seconds = 5.5;
        expect(getAudioTime()).toBe(5.5);
    });
});
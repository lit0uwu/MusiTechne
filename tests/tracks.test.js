import tracksData from '../data/tracks.json';

describe('Tracks Data Validation', () => {
    test('файл треков содержит status success', () => {
        expect(tracksData.status).toBe('success');
    });

    test('есть хотя бы один дефолтный трек', () => {
        expect(tracksData.defaultTracks.length).toBeGreaterThan(0);
    });

    test('каждый трек имеет id, title, tempo, notes', () => {
        tracksData.defaultTracks.forEach(track => {
            expect(track).toHaveProperty('id');
            expect(track).toHaveProperty('title');
            expect(track).toHaveProperty('tempo');
            expect(track).toHaveProperty('notes');
            expect(Array.isArray(track.notes)).toBe(true);
        });
    });

    test('каждая нота имеет note и time', () => {
        const firstTrack = tracksData.defaultTracks[0];
        firstTrack.notes.forEach(note => {
            expect(note).toHaveProperty('note');
            expect(note).toHaveProperty('time');
        });
    });
});
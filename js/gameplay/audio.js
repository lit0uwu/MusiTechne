export const synth = new window.Tone.PolySynth(Tone.Synth).toDestination();
export const notesMap = ['C4', 'D4', 'E4', 'F4', 'G4'];

const notesTemplates = [
    ['C4', 'D4', 'E4', 'F4', 'G4'],
    ['C3', 'D3', 'E3', 'F3', 'G3'],
    ['C5', 'D5', 'E5', 'F5', 'G5'],
    ['A4', 'E4', 'F4', 'C5', 'B4'],
];

export function setNotesMap(template){
    const selectedTemplate = notesTemplates[template];
    if (!selectedTemplate) return;

    notesMap.length = 0; 
    notesMap.push(...selectedTemplate);
}

export async function startAudio(){
    await Tone.start();
    Tone.Transport.stop();
    Tone.Transport.position = 0; 
    Tone.Transport.start();
}

export function stopAudio(){
    Tone.Transport.stop();
    synth.releaseAll();
}

export function playNote(laneIndex){
    synth.triggerAttack(notesMap[laneIndex]);
}

export function stopNote(laneIndex){
    synth.triggerRelease(notesMap[laneIndex]);
}

export function getAudioTime(){
    return Tone.Transport.seconds;
}

setNotesMap(0);
const colors = ['#ff5252', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0'];

export function drawRoads(ctx, canvas, laneWidth){
    for (let i = 1; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(i * laneWidth, 0); ctx.lineTo(i * laneWidth, canvas.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; ctx.lineWidth = 2; ctx.stroke();
    }
}

export function drawLine(ctx, canvas, targetY){
    ctx.beginPath(); ctx.moveTo(0, targetY); ctx.lineTo(canvas.width, targetY);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; ctx.lineWidth = 6; ctx.stroke();
}

export function drawRect(ctx, note, noteHeight, laneWidth, y){
    ctx.fillStyle = colors[note.lane];
    ctx.fillRect(note.lane * laneWidth + 10, y - noteHeight, laneWidth - 20, noteHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; 
    ctx.lineWidth = 2;
    ctx.strokeRect(note.lane * laneWidth + 10, y - noteHeight, laneWidth - 20, noteHeight);
}
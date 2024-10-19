import * as fs from 'fs';
import * as path from 'path';

export function watchRealtimeTranscription(callback: (transcription: string) => void): void {
    const filePath = path.join(__dirname, '..', 'realtime_transcription.txt');
    
    fs.watchFile(filePath, { interval: 100 }, (curr, prev) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading file:", err);
                return;
            }
            callback(data);
        });
    });
}

export function watchStepsFile(callback: (steps: any[]) => void): void {
    const filePath = path.join(__dirname, '..', 'vscode_steps.json');
    
    fs.watchFile(filePath, (curr, prev) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading file:", err);
                return;
            }
            try {
                const steps = JSON.parse(data);
                callback(steps);
            } catch (parseErr) {
                console.error("Error parsing JSON:", parseErr);
            }
        });
    });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchStepsFile = exports.watchRealtimeTranscription = void 0;
const fs = require("fs");
const path = require("path");
function watchRealtimeTranscription(callback) {
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
exports.watchRealtimeTranscription = watchRealtimeTranscription;
function watchStepsFile(callback) {
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
            }
            catch (parseErr) {
                console.error("Error parsing JSON:", parseErr);
            }
        });
    });
}
exports.watchStepsFile = watchStepsFile;
//# sourceMappingURL=speech-reader.js.map
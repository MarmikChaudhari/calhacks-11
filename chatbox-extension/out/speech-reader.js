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
class CustomInputViewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        watchRealtimeTranscription((transcription) => {
            webviewView.webview.postMessage({ type: 'updateTranscription', value: transcription });
        });
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'inputSubmitted':
                    // Handle the input here
                    console.log(data.value);
                    break;
            }
        });
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Custom Input</title>
            </head>
            <body>
                <input type="text" id="customInput" placeholder="Enter command...">
                <div id="transcription"></div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const input = document.getElementById('customInput');
                    const transcriptionDiv = document.getElementById('transcription');
                    input.addEventListener('keyup', (e) => {
                        if (e.key === 'Enter') {
                            vscode.postMessage({
                                type: 'inputSubmitted',
                                value: input.value
                            });
                            input.value = '';
                        }
                    });
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'updateTranscription':
                                transcriptionDiv.textContent = message.value;
                                break;
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}
CustomInputViewProvider.viewType = 'customInputView';
//# sourceMappingURL=speech-reader.js.map
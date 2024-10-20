"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const WebSocket = require("ws");
class ChatViewProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.messages = [];
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this.messages);
    }
    addMessage(message, type, action) {
        const chatMessage = new ChatMessage(message, vscode.TreeItemCollapsibleState.None, type, action);
        this.messages.push(chatMessage);
        this._onDidChangeTreeData.fire();
    }
    updateLastMessage(message) {
        if (this.messages.length > 0 && this.messages[this.messages.length - 1].type === 'TRANSCRIPTION') {
            this.messages[this.messages.length - 1].label = message;
        }
        else {
            this.addMessage(message, 'TRANSCRIPTION');
        }
        this._onDidChangeTreeData.fire();
    }
    clearMessages() {
        this.messages = [];
        this._onDidChangeTreeData.fire();
    }
}
class ChatMessage extends vscode.TreeItem {
    constructor(label, collapsibleState, type, action) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.type = type;
        this.action = action;
        this.tooltip = `${type}${action ? ': ' + action : ''}`;
        this.description = `${type}${action ? ': ' + action : ''}`;
    }
}
let ws = null;
let chatViewProvider;
let isListening = false;
let isOptionKeyPressed = false;
function connectWebSocket() {
    ws = new WebSocket('ws://127.0.0.1:8765');
    ws.on('open', () => {
        console.log('Connected to Python WebSocket server');
        vscode.window.showInformationMessage('Connected to speech recognition server');
    });
    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'transcription') {
            chatViewProvider.updateLastMessage(message.content);
        }
        else if (message.type === 'steps') {
            chatViewProvider.clearMessages();
            message.content.forEach((step) => {
                chatViewProvider.addMessage(step.content, step.type, step.action);
            });
        }
    });
    ws.on('close', () => {
        console.log('Disconnected from Python WebSocket server');
        vscode.window.showWarningMessage('Disconnected from speech recognition server. Attempting to reconnect...');
        setTimeout(connectWebSocket, 5000);
    });
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        vscode.window.showErrorMessage('Error connecting to speech recognition server');
    });
}
function startListening() {
    if (ws && ws.readyState === WebSocket.OPEN && !isListening) {
        ws.send('START');
        vscode.window.showInformationMessage('Speech recognition started...');
        isListening = true;
        updateMicButtonState();
    }
}
function stopListening() {
    if (ws && ws.readyState === WebSocket.OPEN && isListening) {
        ws.send('STOP');
        vscode.window.showInformationMessage('Speech recognition stopped. Processing...');
        isListening = false;
        updateMicButtonState();
    }
}
function toggleListening() {
    if (isListening) {
        stopListening();
    }
    else {
        startListening();
    }
}
function updateMicButtonState() {
    vscode.commands.executeCommand('setContext', 'chatbox.isListening', isListening);
}
function activate(context) {
    console.log('Activating extension "vscode-chatbox-extension"');
    chatViewProvider = new ChatViewProvider();
    vscode.window.registerTreeDataProvider('chatboxView', chatViewProvider);
    connectWebSocket();
    const micButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    micButton.text = '$(mic) Start Listening';
    micButton.command = 'chatbox.toggleListening';
    micButton.show();
    context.subscriptions.push(micButton);
    context.subscriptions.push(vscode.commands.registerCommand('chatbox.toggleListening', toggleListening));
    // Register key event listeners
    const optionKeyPressed = vscode.commands.registerCommand('type', (args) => {
        if (args.text === '\u001b') { // Option key code
            if (!isOptionKeyPressed) {
                isOptionKeyPressed = true;
                startListening();
            }
        }
    });
    // Listen for key release events
    const optionKeyReleased = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.contentChanges.length > 0 && event.contentChanges[0].text === '' && isOptionKeyPressed) {
            isOptionKeyPressed = false;
            stopListening();
        }
    });
    context.subscriptions.push(optionKeyPressed, optionKeyReleased);
    // Update mic button state when extension is activated
    updateMicButtonState();
    console.log('Extension "vscode-chatbox-extension" is now active');
}
exports.activate = activate;
function deactivate() {
    if (ws) {
        ws.close();
    }
    console.log('Extension "vscode-chatbox-extension" is now deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
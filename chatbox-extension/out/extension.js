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
function activate(context) {
    console.log('Activating extension "vscode-chatbox-extension"');
    const chatViewProvider = new ChatViewProvider();
    vscode.window.registerTreeDataProvider('chatboxView', chatViewProvider);
    // Connect to the Python WebSocket server
    ws = new WebSocket('ws://localhost:8765');
    ws.on('open', () => {
        console.log('Connected to Python WebSocket server');
    });
    ws.on('message', (data) => {
        const message = JSON.parse(data);
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
    });
    // Register key event listeners
    const optionKeyPressed = vscode.commands.registerCommand('type', (args) => {
        if (args.text === '\u001b') { // Option key code
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send('START');
                vscode.window.showInformationMessage('Speech recognition started...');
            }
        }
    });
    const optionKeyReleased = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.contentChanges.length > 0 && event.contentChanges[0].text === '') {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send('STOP');
                vscode.window.showInformationMessage('Speech recognition stopped. Processing...');
            }
        }
    });
    context.subscriptions.push(optionKeyPressed, optionKeyReleased);
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
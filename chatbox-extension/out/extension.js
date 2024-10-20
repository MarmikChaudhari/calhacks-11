"use strict";
// import * as vscode from 'vscode';
// import * as WebSocket from 'ws';
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// class ChatViewProvider implements vscode.TreeDataProvider<ChatMessage> {
//     private _onDidChangeTreeData: vscode.EventEmitter<ChatMessage | undefined | null | void> = new vscode.EventEmitter<ChatMessage | undefined | null | void>();
//     readonly onDidChangeTreeData: vscode.Event<ChatMessage | undefined | null | void> = this._onDidChangeTreeData.event;
//     private messages: ChatMessage[] = [];
//     getTreeItem(element: ChatMessage): vscode.TreeItem {
//         return element;
//     }
//     getChildren(element?: ChatMessage): Thenable<ChatMessage[]> {
//         if (element) {
//             return Promise.resolve([]);
//         }
//         return Promise.resolve(this.messages);
//     }
//     addMessage(message: string, type: string, action?: string) {
//         const chatMessage = new ChatMessage(message, vscode.TreeItemCollapsibleState.None, type, action);
//         this.messages.push(chatMessage);
//         this._onDidChangeTreeData.fire();
//     }
//     updateLastMessage(message: string) {
//         if (this.messages.length > 0 && this.messages[this.messages.length - 1].type === 'TRANSCRIPTION') {
//             this.messages[this.messages.length - 1].label = message;
//         } else {
//             this.addMessage(message, 'TRANSCRIPTION');
//         }
//         this._onDidChangeTreeData.fire();
//     }
//     clearMessages() {
//         this.messages = [];
//         this._onDidChangeTreeData.fire();
//     }
// }
// class ChatMessage extends vscode.TreeItem {
//     constructor(
//         public label: string,
//         public readonly collapsibleState: vscode.TreeItemCollapsibleState,
//         public readonly type: string,
//         public readonly action?: string
//     ) {
//         super(label, collapsibleState);
//         this.tooltip = `${type}${action ? ': ' + action : ''}`;
//         this.description = `${type}${action ? ': ' + action : ''}`;
//     }
// }
// let ws: WebSocket | null = null;
// let chatViewProvider: ChatViewProvider;
// function connectWebSocket() {
//     ws = new WebSocket('ws://localhost:8765');
//     ws.on('open', () => {
//         console.log('Connected to Python WebSocket server');
//         vscode.window.showInformationMessage('Connected to speech recognition server');
//     });
//     ws.on('message', (data: WebSocket.Data) => {
//         const message = JSON.parse(data.toString());
//         if (message.type === 'transcription') {
//             chatViewProvider.updateLastMessage(message.content);
//         } else if (message.type === 'steps') {
//             chatViewProvider.clearMessages();
//             message.content.forEach((step: any) => {
//                 chatViewProvider.addMessage(step.content, step.type, step.action);
//             });
//         }
//     });
//     ws.on('close', () => {
//         console.log('Disconnected from Python WebSocket server');
//         vscode.window.showWarningMessage('Disconnected from speech recognition server. Attempting to reconnect...');
//         setTimeout(connectWebSocket, 5000); // Try to reconnect after 5 seconds
//     });
//     ws.on('error', (error) => {
//         console.error('WebSocket error:', error);
//         vscode.window.showErrorMessage('Error connecting to speech recognition server');
//     });
// }
// export function activate(context: vscode.ExtensionContext) {
//     console.log('Activating extension "vscode-chatbox-extension"');
//     chatViewProvider = new ChatViewProvider();
//     vscode.window.registerTreeDataProvider('chatboxView', chatViewProvider);
//     connectWebSocket();
//     // Register key event listeners
//     const optionKeyPressed = vscode.commands.registerCommand('type', (args) => {
//         if (args.text === '\u001b') { // Option key code
//             if (ws && ws.readyState === WebSocket.OPEN) {
//                 ws.send('START');
//                 vscode.window.showInformationMessage('Speech recognition started...');
//             } else {
//                 vscode.window.showWarningMessage('Speech recognition server not connected. Please try again.');
//             }
//         }
//     });
//     const optionKeyReleased = vscode.workspace.onDidChangeTextDocument((event) => {
//         if (event.contentChanges.length > 0 && event.contentChanges[0].text === '') {
//             if (ws && ws.readyState === WebSocket.OPEN) {
//                 ws.send('STOP');
//                 vscode.window.showInformationMessage('Speech recognition stopped. Processing...');
//             }
//         }
//     });
//     context.subscriptions.push(optionKeyPressed, optionKeyReleased);
//     console.log('Extension "vscode-chatbox-extension" is now active');
// }
// export function deactivate() {
//     if (ws) {
//         ws.close();
//     }
//     console.log('Extension "vscode-chatbox-extension" is now deactivated');
// }
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
function toggleListening() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        if (isListening) {
            ws.send('STOP');
            vscode.window.showInformationMessage('Speech recognition stopped. Processing...');
        }
        else {
            ws.send('START');
            vscode.window.showInformationMessage('Speech recognition started...');
        }
        isListening = !isListening;
        updateMicButtonState();
    }
    else {
        vscode.window.showWarningMessage('Speech recognition server not connected. Please try again.');
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
            toggleListening();
        }
    });
    context.subscriptions.push(optionKeyPressed);
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
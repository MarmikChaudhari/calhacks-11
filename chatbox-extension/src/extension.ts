import * as vscode from 'vscode';
import * as WebSocket from 'ws';

class ChatViewProvider implements vscode.TreeDataProvider<ChatMessage> {
    private _onDidChangeTreeData: vscode.EventEmitter<ChatMessage | undefined | null | void> = new vscode.EventEmitter<ChatMessage | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ChatMessage | undefined | null | void> = this._onDidChangeTreeData.event;

    private messages: ChatMessage[] = [];

    getTreeItem(element: ChatMessage): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ChatMessage): Thenable<ChatMessage[]> {
        if (element) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this.messages);
    }

    addMessage(message: string, type: string, action?: string) {
        const chatMessage = new ChatMessage(message, vscode.TreeItemCollapsibleState.None, type, action);
        this.messages.push(chatMessage);
        this._onDidChangeTreeData.fire();
    }

    updateLastMessage(message: string) {
        if (this.messages.length > 0 && this.messages[this.messages.length - 1].type === 'TRANSCRIPTION') {
            this.messages[this.messages.length - 1].label = message;
        } else {
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
    constructor(
        public label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: string,
        public readonly action?: string
    ) {
        super(label, collapsibleState);
        this.tooltip = `${type}${action ? ': ' + action : ''}`;
        this.description = `${type}${action ? ': ' + action : ''}`;
    }
}

let ws: WebSocket | null = null;
let chatViewProvider: ChatViewProvider;
let isListening = false;

function connectWebSocket() {
    ws = new WebSocket('ws://127.0.0.1:8765');

    ws.on('open', () => {
        console.log('Connected to Python WebSocket server');
        vscode.window.showInformationMessage('Connected to speech recognition server');
    });

    ws.on('message', (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'transcription') {
            chatViewProvider.updateLastMessage(message.content);
        } else if (message.type === 'steps') {
            chatViewProvider.clearMessages();
            message.content.forEach((step: any) => {
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
        } else {
            ws.send('START');
            vscode.window.showInformationMessage('Speech recognition started...');
        }
        isListening = !isListening;
        updateMicButtonState();
    } else {
        vscode.window.showWarningMessage('Speech recognition server not connected. Please try again.');
    }
}

function updateMicButtonState() {
    vscode.commands.executeCommand('setContext', 'chatbox.isListening', isListening);
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating extension "vscode-chatbox-extension"');

    chatViewProvider = new ChatViewProvider();
    vscode.window.registerTreeDataProvider('chatboxView', chatViewProvider);

    connectWebSocket();

    const micButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    micButton.text = '$(mic) Start Listening';
    micButton.command = 'chatbox.toggleListening';
    micButton.show();
    context.subscriptions.push(micButton);

    context.subscriptions.push(
        vscode.commands.registerCommand('chatbox.toggleListening', toggleListening)
    );

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

export function deactivate() {
    if (ws) {
        ws.close();
    }
    console.log('Extension "vscode-chatbox-extension" is now deactivated');
}
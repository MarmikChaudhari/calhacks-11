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

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating extension "vscode-chatbox-extension"');

    const chatViewProvider = new ChatViewProvider();
    vscode.window.registerTreeDataProvider('chatboxView', chatViewProvider);

    // Connect to the Python WebSocket server
    ws = new WebSocket('ws://localhost:8765');

    ws.on('open', () => {
        console.log('Connected to Python WebSocket server');
    });

    ws.on('message', (data: string) => {
        const message = JSON.parse(data);
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

export function deactivate() {
    if (ws) {
        ws.close();
    }
    console.log('Extension "vscode-chatbox-extension" is now deactivated');
}
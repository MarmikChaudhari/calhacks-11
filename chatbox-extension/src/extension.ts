import * as vscode from 'vscode';
import { watchRealtimeTranscription, watchStepsFile } from './speech-reader';

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

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating extension "vscode-chatbox-extension"');

    const chatViewProvider = new ChatViewProvider();
    vscode.window.registerTreeDataProvider('chatboxView', chatViewProvider);

    let disposable = vscode.commands.registerCommand('chatbox.sendMessage', async () => {
        const message = await vscode.window.showInputBox({ prompt: 'Enter your message' });
        if (message) {
            chatViewProvider.addMessage(message, 'USER');
        }
    });

    context.subscriptions.push(disposable);

    // Integrate real-time transcription
    watchRealtimeTranscription((transcription) => {
        chatViewProvider.updateLastMessage(transcription);
    });

    // Integrate speech recognition steps
    watchStepsFile((steps) => {
        chatViewProvider.clearMessages();
        steps.forEach((step: any) => {
            chatViewProvider.addMessage(step.content, step.type, step.action);
        });
    });

    console.log('Extension "vscode-chatbox-extension" is now active');
}

export function deactivate() {
    console.log('Extension "vscode-chatbox-extension" is now deactivated');
}
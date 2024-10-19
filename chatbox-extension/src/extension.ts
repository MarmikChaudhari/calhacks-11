import * as vscode from 'vscode';

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

    addMessage(message: string) {
        const chatMessage = new ChatMessage(message, vscode.TreeItemCollapsibleState.None);
        this.messages.push(chatMessage);
        this._onDidChangeTreeData.fire();
    }
}

class ChatMessage extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating extension "vscode-chatbox-extension"');

    const chatViewProvider = new ChatViewProvider();
    vscode.window.registerTreeDataProvider('chatboxView', chatViewProvider);

    let disposable = vscode.commands.registerCommand('chatbox.sendMessage', async () => {
        const message = await vscode.window.showInputBox({ prompt: 'Enter your message' });
        if (message) {
            chatViewProvider.addMessage(message);
        }
    });

    context.subscriptions.push(disposable);

    console.log('Extension "vscode-chatbox-extension" is now active');
}

export function deactivate() {
    console.log('Extension "vscode-chatbox-extension" is now deactivated');
}
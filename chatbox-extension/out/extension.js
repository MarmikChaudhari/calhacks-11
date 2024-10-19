"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const speech_reader_js_1 = require("./speech-reader.js");
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
function activate(context) {
    console.log('Activating extension "vscode-chatbox-extension"');
    const chatViewProvider = new ChatViewProvider();
    vscode.window.registerTreeDataProvider('chatboxView', chatViewProvider);
    let disposable = vscode.commands.registerCommand('chatbox.sendMessage', () => __awaiter(this, void 0, void 0, function* () {
        const message = yield vscode.window.showInputBox({ prompt: 'Enter your message' });
        if (message) {
            chatViewProvider.addMessage(message, 'USER');
        }
    }));
    context.subscriptions.push(disposable);
    // Integrate real-time transcription
    (0, speech_reader_js_1.watchRealtimeTranscription)((transcription) => {
        chatViewProvider.updateLastMessage(transcription);
    });
    // Integrate speech recognition steps
    (0, speech_reader_js_1.watchStepsFile)((steps) => {
        chatViewProvider.clearMessages();
        steps.forEach((step) => {
            chatViewProvider.addMessage(step.content, step.type, step.action);
        });
    });
    console.log('Extension "vscode-chatbox-extension" is now active');
}
exports.activate = activate;
function deactivate() {
    console.log('Extension "vscode-chatbox-extension" is now deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
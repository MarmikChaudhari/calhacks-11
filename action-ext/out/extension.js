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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
class StepTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.steps = [];
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this.steps);
    }
    updateSteps(steps) {
        this.steps = steps.map(step => new StepItem(step.content, vscode.TreeItemCollapsibleState.None));
        this._onDidChangeTreeData.fire();
    }
    updateStepStatus(index, status) {
        if (index >= 0 && index < this.steps.length) {
            this.steps[index].description = status;
            this._onDidChangeTreeData.fire(this.steps[index]);
        }
    }
}
class StepItem extends vscode.TreeItem {
    constructor(label, collapsibleState, description) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.description = description;
    }
}
let stepProvider;
function activate(context) {
    console.log('Activating Voice Command Extension');
    stepProvider = new StepTreeDataProvider();
    vscode.window.createTreeView('voiceCommandSteps', {
        treeDataProvider: stepProvider,
        showCollapseAll: true
    });
    let disposable = vscode.commands.registerCommand('extension.executeVoiceCommands', () => __awaiter(this, void 0, void 0, function* () {
        console.log('Executing Voice Commands');
        const steps = yield fetchStepsFromBackend();
        if (steps.length === 0) {
            vscode.window.showInformationMessage('No steps to execute.');
            return;
        }
        stepProvider.updateSteps(steps);
        yield executeSteps(steps);
    }));
    context.subscriptions.push(disposable);
}
function fetchStepsFromBackend() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log('Fetching steps from backend');
        const workspaceFolder = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open. Please open a folder and try again.');
            return [];
        }
        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, 'steps.json');
        try {
            const fileContent = yield vscode.workspace.fs.readFile(filePath);
            const steps = JSON.parse(fileContent.toString());
            console.log('Steps fetched successfully:', steps);
            return steps;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to read steps.json: ${error}`);
            console.error('Error fetching steps:', error);
            return [];
        }
    });
}
function executeSteps(steps) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < steps.length; i++) {
            console.log(`Executing step ${i + 1}:`, steps[i]);
            stepProvider.updateStepStatus(i, 'In Progress');
            try {
                yield executeStep(steps[i]);
                stepProvider.updateStepStatus(i, 'Completed');
            }
            catch (error) {
                console.error(`Error executing step ${i + 1}:`, error);
                stepProvider.updateStepStatus(i, 'Failed');
                vscode.window.showErrorMessage(`Failed to execute step ${i + 1}: ${error}`);
            }
        }
        vscode.window.showInformationMessage('All voice commands executed successfully.');
    });
}
function executeStep(step) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (step.action) {
            // File and folder operations
            case 'open':
                yield openFile(step.content);
                break;
            case 'newFile':
                yield createNewFile(step.content);
                break;
            case 'newFolder':
                yield createNewFolder(step.content);
                break;
            case 'rename':
                yield renameFile(step.content);
                break;
            case 'deleteFile':
                yield deleteFile(step.content);
                break;
            case 'copyFile':
                yield copyFile(step.sourceFile, step.targetFile);
                break;
            case 'moveFile':
                yield moveFile(step.sourceFile, step.targetFile);
                break;
            case 'saveFile':
                yield vscode.commands.executeCommand('workbench.action.files.save');
                break;
            case 'saveAllFiles':
                yield vscode.commands.executeCommand('workbench.action.files.saveAll');
                break;
            case 'compareFiles':
                yield vscode.commands.executeCommand('workbench.action.compareEditor.compareWith');
                break;
            // Code editing and refactoring
            case 'edit':
                yield editFile(step.content, step.type);
                break;
            case 'format':
                yield vscode.commands.executeCommand('editor.action.formatDocument');
                break;
            case 'commentLine':
                yield vscode.commands.executeCommand('editor.action.commentLine');
                break;
            case 'uncommentLine':
                yield vscode.commands.executeCommand('editor.action.uncommentLine');
                break;
            case 'indentLine':
                yield vscode.commands.executeCommand('editor.action.indentLines');
                break;
            case 'outdentLine':
                yield vscode.commands.executeCommand('editor.action.outdentLines');
                break;
            case 'renameSymbol':
                yield vscode.commands.executeCommand('editor.action.rename');
                break;
            case 'extractMethod':
                yield vscode.commands.executeCommand('editor.action.extractMethod');
                break;
            case 'extractVariable':
                yield vscode.commands.executeCommand('editor.action.extractVariable');
                break;
            case 'organizeImports':
                yield vscode.commands.executeCommand('editor.action.organizeImports');
                break;
            case 'fixAll':
                yield vscode.commands.executeCommand('editor.action.fixAll');
                break;
            // Code navigation
            case 'goToDefinition':
                yield vscode.commands.executeCommand('editor.action.revealDefinition');
                break;
            case 'findReferences':
                yield vscode.commands.executeCommand('editor.action.referenceSearch.trigger');
                break;
            case 'goToLine':
                yield vscode.commands.executeCommand('workbench.action.gotoLine');
                break;
            case 'goToSymbol':
                yield vscode.commands.executeCommand('workbench.action.gotoSymbol');
                break;
            case 'goToFile':
                yield vscode.commands.executeCommand('workbench.action.quickOpen');
                break;
            case 'navigateBack':
                yield vscode.commands.executeCommand('workbench.action.navigateBack');
                break;
            case 'navigateForward':
                yield vscode.commands.executeCommand('workbench.action.navigateForward');
                break;
            // Search and replace
            case 'find':
                yield vscode.commands.executeCommand('actions.find');
                break;
            case 'replace':
                yield vscode.commands.executeCommand('editor.action.startFindReplaceAction');
                break;
            case 'findInFiles':
                yield vscode.commands.executeCommand('workbench.action.findInFiles');
                break;
            case 'replaceInFiles':
                yield vscode.commands.executeCommand('workbench.action.replaceInFiles');
                break;
            // Editor management
            case 'splitEditorRight':
                yield vscode.commands.executeCommand('workbench.action.splitEditorRight');
                break;
            case 'splitEditorDown':
                yield vscode.commands.executeCommand('workbench.action.splitEditorDown');
                break;
            case 'closeEditor':
                yield vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                break;
            case 'closeAllEditors':
                yield vscode.commands.executeCommand('workbench.action.closeAllEditors');
                break;
            case 'focusNextEditor':
                yield vscode.commands.executeCommand('workbench.action.nextEditor');
                break;
            case 'focusPreviousEditor':
                yield vscode.commands.executeCommand('workbench.action.previousEditor');
                break;
            // View management
            case 'toggleSidebar':
                yield vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');
                break;
            case 'togglePanel':
                yield vscode.commands.executeCommand('workbench.action.togglePanel');
                break;
            case 'toggleZenMode':
                yield vscode.commands.executeCommand('workbench.action.toggleZenMode');
                break;
            case 'toggleFullScreen':
                yield vscode.commands.executeCommand('workbench.action.toggleFullScreen');
                break;
            case 'toggleMinimap':
                yield vscode.commands.executeCommand('editor.action.toggleMinimap');
                break;
            case 'toggleWordWrap':
                yield vscode.commands.executeCommand('editor.action.toggleWordWrap');
                break;
            // Terminal operations
            case 'openTerminal':
                yield vscode.commands.executeCommand('workbench.action.terminal.new');
                break;
            case 'run':
                yield runFile(step.content);
                break;
            case 'runSelectedText':
                yield vscode.commands.executeCommand('workbench.action.terminal.runSelectedText');
                break;
            case 'clearTerminal':
                yield vscode.commands.executeCommand('workbench.action.terminal.clear');
                break;
            case 'killTerminal':
                yield vscode.commands.executeCommand('workbench.action.terminal.kill');
                break;
            // Git operations
            case 'gitStage':
                yield gitOperation('stage');
                break;
            case 'gitCommit':
                yield gitOperation('commit', step.gitMessage);
                break;
            case 'gitPush':
                yield gitOperation('push');
                break;
            case 'gitPull':
                yield gitOperation('pull');
                break;
            case 'gitCheckoutBranch':
                yield gitOperation('checkout', step.branchName);
                break;
            case 'gitCreateBranch':
                yield gitOperation('branch', step.branchName);
                break;
            case 'gitMerge':
                yield gitOperation('merge');
                break;
            // Debugging
            case 'startDebugging':
                yield debugOperation('start');
                break;
            case 'stopDebugging':
                yield debugOperation('stop');
                break;
            case 'toggleBreakpoint':
                yield vscode.commands.executeCommand('editor.debug.action.toggleBreakpoint');
                break;
            case 'stepOver':
                yield debugOperation('stepOver');
                break;
            case 'stepInto':
                yield debugOperation('stepInto');
                break;
            case 'stepOut':
                yield debugOperation('stepOut');
                break;
            case 'continue':
                yield debugOperation('continue');
                break;
            // Code folding
            case 'foldAll':
                yield vscode.commands.executeCommand('editor.foldAll');
                break;
            case 'unfoldAll':
                yield vscode.commands.executeCommand('editor.unfoldAll');
                break;
            case 'foldLevel':
                yield vscode.commands.executeCommand('editor.foldLevel' + step.level);
                break;
            // Extensions
            case 'installExtension':
                yield manageExtension('install', step.extensionId);
                break;
            case 'uninstallExtension':
                yield manageExtension('uninstall', step.extensionId);
                break;
            case 'enableExtension':
                yield manageExtension('enable', step.extensionId);
                break;
            case 'disableExtension':
                yield manageExtension('disable', step.extensionId);
                break;
            // Workspace
            case 'addFolder':
                yield vscode.commands.executeCommand('workbench.action.addRootFolder');
                break;
            case 'removeFolder':
                yield vscode.commands.executeCommand('workbench.action.removeRootFolder');
                break;
            case 'openWorkspace':
                yield vscode.commands.executeCommand('workbench.action.openWorkspace');
                break;
            case 'saveWorkspace':
                yield vscode.commands.executeCommand('workbench.action.saveWorkspaceAs');
                break;
            // Tasks
            case 'runTask':
                yield manageTask('run', step.taskName);
                break;
            case 'buildTask':
                yield manageTask('build');
                break;
            case 'testTask':
                yield manageTask('test');
                break;
            // Integrated development
            case 'openSettings':
                yield vscode.commands.executeCommand('workbench.action.openSettings');
                break;
            case 'openKeybindings':
                yield vscode.commands.executeCommand('workbench.action.openGlobalKeybindings');
                break;
            case 'showCommands':
                yield vscode.commands.executeCommand('workbench.action.showCommands');
                break;
            case 'toggleOutputPanel':
                yield vscode.commands.executeCommand('workbench.action.output.toggleOutput');
                break;
            case 'toggleProblemsPanel':
                yield vscode.commands.executeCommand('workbench.actions.view.problems');
                break;
            // Language-specific
            case 'changeLanguageMode':
                yield vscode.commands.executeCommand('workbench.action.editor.changeLanguageMode');
                break;
            // Custom actions
            case 'customCommand':
                yield vscode.commands.executeCommand(step.commandId);
                break;
            default:
                vscode.window.showWarningMessage(`Unknown action: ${step.action}`);
        }
    });
}
// Helper functions
function openFile(content) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const fileName = (_a = content.match(/"([^"]+)"/)) === null || _a === void 0 ? void 0 : _a[1];
        if (!fileName) {
            vscode.window.showErrorMessage(`Could not extract file name from: ${content}`);
            return;
        }
        const workspaceFolder = (_b = vscode.workspace.workspaceFolders) === null || _b === void 0 ? void 0 : _b[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open');
            return;
        }
        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
        try {
            const document = yield vscode.workspace.openTextDocument(filePath);
            yield vscode.window.showTextDocument(document);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${fileName}`);
        }
    });
}
function createNewFile(content) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const fileName = (_a = content.match(/"([^"]+)"/)) === null || _a === void 0 ? void 0 : _a[1];
        if (!fileName) {
            vscode.window.showErrorMessage(`Could not extract file name from: ${content}`);
            return;
        }
        const workspaceFolder = (_b = vscode.workspace.workspaceFolders) === null || _b === void 0 ? void 0 : _b[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open');
            return;
        }
        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
        try {
            yield vscode.workspace.fs.writeFile(filePath, new Uint8Array());
            const document = yield vscode.workspace.openTextDocument(filePath);
            yield vscode.window.showTextDocument(document);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to create file: ${fileName}`);
        }
    });
}
function createNewFolder(content) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const folderName = (_a = content.match(/"([^"]+)"/)) === null || _a === void 0 ? void 0 : _a[1];
        if (!folderName) {
            vscode.window.showErrorMessage(`Could not extract folder name from: ${content}`);
            return;
        }
        const workspaceFolder = (_b = vscode.workspace.workspaceFolders) === null || _b === void 0 ? void 0 : _b[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open');
            return;
        }
        const folderPath = vscode.Uri.joinPath(workspaceFolder.uri, folderName);
        try {
            yield vscode.workspace.fs.createDirectory(folderPath);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to create folder: ${folderName}`);
        }
    });
}
function renameFile(content) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const match = content.match(/"([^"]+)" to "([^"]+)"/);
        if (!match) {
            vscode.window.showErrorMessage(`Could not extract file names from: ${content}`);
            return;
        }
        const [, oldName, newName] = match;
        const workspaceFolder = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open');
            return;
        }
        const oldUri = vscode.Uri.joinPath(workspaceFolder.uri, oldName);
        const newUri = vscode.Uri.joinPath(workspaceFolder.uri, newName);
        try {
            // Check if the old file exists
            yield vscode.workspace.fs.stat(oldUri);
            // Check if the new file name already exists
            try {
                yield vscode.workspace.fs.stat(newUri);
                const overwrite = yield vscode.window.showWarningMessage(`File "${newName}" already exists. Do you want to overwrite it?`, 'Yes', 'No');
                if (overwrite !== 'Yes') {
                    vscode.window.showInformationMessage('Rename operation cancelled.');
                    return;
                }
            }
            catch (error) {
                // New file doesn't exist, which is fine
            }
            // Perform the rename operation
            yield vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
            vscode.window.showInformationMessage(`Successfully renamed "${oldName}" to "${newName}"`);
        }
        catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                vscode.window.showErrorMessage(`File "${oldName}" does not exist.`);
            }
            else {
                vscode.window.showErrorMessage(`Failed to rename file: ${error}`);
            }
            console.error('Error in renameFile:', error);
        }
    });
}
function deleteFile(content) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const fileName = (_a = content.match(/"([^"]+)"/)) === null || _a === void 0 ? void 0 : _a[1];
        if (!fileName) {
            vscode.window.showErrorMessage(`Could not extract file name from: ${content}`);
            return;
        }
        const workspaceFolder = (_b = vscode.workspace.workspaceFolders) === null || _b === void 0 ? void 0 : _b[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open');
            return;
        }
        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
        try {
            yield vscode.workspace.fs.delete(filePath);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to delete file: ${fileName}`);
        }
    });
}
function copyFile(sourceFile, targetFile) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const workspaceFolder = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open');
            return;
        }
        const sourceUri = vscode.Uri.joinPath(workspaceFolder.uri, sourceFile);
        const targetUri = vscode.Uri.joinPath(workspaceFolder.uri, targetFile);
        try {
            yield vscode.workspace.fs.copy(sourceUri, targetUri);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to copy file: ${error}`);
        }
    });
}
function moveFile(sourceFile, targetFile) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const workspaceFolder = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder is open');
            return;
        }
        const sourceUri = vscode.Uri.joinPath(workspaceFolder.uri, sourceFile);
        const targetUri = vscode.Uri.joinPath(workspaceFolder.uri, targetFile);
        try {
            yield vscode.workspace.fs.rename(sourceUri, targetUri);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to move file: ${error}`);
        }
    });
}
function editFile(content, type) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor');
            return;
        }
        if (type === 'code_generation') {
            if (content.includes('Generate a function called')) {
                const functionName = (_a = content.match(/called "([^"]+)"/)) === null || _a === void 0 ? void 0 : _a[1];
                if (functionName) {
                    const functionTemplate = `\n\ndef ${functionName}():\n    pass\n`;
                    const position = new vscode.Position(editor.document.lineCount, 0);
                    yield editor.edit(editBuilder => {
                        editBuilder.insert(position, functionTemplate);
                    });
                }
            }
            else if (content.includes('Change the variable')) {
                const variableName = (_b = content.match(/to "([^"]+)"/)) === null || _b === void 0 ? void 0 : _b[1];
                if (variableName) {
                    const text = editor.document.getText();
                    const updatedText = text.replace(/\b\w+(?=\s*=)/, variableName);
                    yield editor.edit(editBuilder => {
                        const range = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(text.length));
                        editBuilder.replace(range, updatedText);
                    });
                }
            }
        }
        else {
            vscode.window.showWarningMessage(`Unsupported edit type: ${type}`);
        }
    });
}
function runFile(content) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const fileName = (_a = content.match(/"([^"]+)"/)) === null || _a === void 0 ? void 0 : _a[1];
        if (!fileName) {
            vscode.window.showErrorMessage(`Could not extract file name from: ${content}`);
            return;
        }
        const terminal = vscode.window.createTerminal('Run File');
        terminal.sendText(`python "${fileName}"`);
        terminal.show();
    });
}
function gitOperation(operation, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield vscode.commands.executeCommand(`git.${operation}`, message);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to perform git ${operation}: ${error}`);
        }
    });
}
function debugOperation(operation) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield vscode.commands.executeCommand(`workbench.action.debug.${operation}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to perform debug ${operation}: ${error}`);
        }
    });
}
function manageExtension(action, extensionId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield vscode.commands.executeCommand(`workbench.extensions.${action}Extension`, extensionId);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to ${action} extension: ${error}`);
        }
    });
}
function manageTask(action, taskName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (taskName) {
                yield vscode.commands.executeCommand('workbench.action.tasks.runTask', taskName);
            }
            else {
                yield vscode.commands.executeCommand(`workbench.action.tasks.${action}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to ${action} task: ${error}`);
        }
    });
}
function deactivate() {
    console.log('Voice Command Extension is deactivated');
}
//# sourceMappingURL=extension.js.map
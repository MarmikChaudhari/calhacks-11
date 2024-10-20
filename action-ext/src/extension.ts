import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface CommandStep {
    content: string;
    type: string;
    action: string;
    lineNumber?: number;
    commandId?: string;
    extensionId?: string;
    gitMessage?: string;
    level?: number;
    sourceFile?: string;
    targetFile?: string;
    searchTerm?: string;
    replaceTerm?: string;
    taskName?: string;
    branchName?: string;
}

class StepTreeDataProvider implements vscode.TreeDataProvider<StepItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<StepItem | undefined | null | void> = new vscode.EventEmitter<StepItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StepItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private steps: StepItem[] = [];

    getTreeItem(element: StepItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: StepItem): Thenable<StepItem[]> {
        if (element) {
            return Promise.resolve([]);
        }
        return Promise.resolve(this.steps);
    }

    updateSteps(steps: CommandStep[]) {
        this.steps = steps.map(step => new StepItem(step.content, vscode.TreeItemCollapsibleState.None));
        this._onDidChangeTreeData.fire();
    }

    updateStepStatus(index: number, status: string) {
        if (index >= 0 && index < this.steps.length) {
            this.steps[index].description = status;
            this._onDidChangeTreeData.fire(this.steps[index]);
        }
    }
}

class StepItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public description?: string
    ) {
        super(label, collapsibleState);
    }
}

let stepProvider: StepTreeDataProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating Voice Command Extension');
    stepProvider = new StepTreeDataProvider();
    vscode.window.createTreeView('voiceCommandSteps', { 
        treeDataProvider: stepProvider,
        showCollapseAll: true
    });

    let disposable = vscode.commands.registerCommand('extension.executeVoiceCommands', async () => {
        console.log('Executing Voice Commands');
        const steps = await fetchStepsFromBackend();
        if (steps.length === 0) {
            vscode.window.showInformationMessage('No steps to execute.');
            return;
        }
        stepProvider.updateSteps(steps);
        await executeSteps(steps);
    });

    context.subscriptions.push(disposable);
}

async function fetchStepsFromBackend(): Promise<CommandStep[]> {
    console.log('Fetching steps from backend');
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder is open. Please open a folder and try again.');
        return [];
    }

    const filePath = vscode.Uri.joinPath(workspaceFolder.uri, 'steps.json');
    
    try {
        const fileContent = await vscode.workspace.fs.readFile(filePath);
        const steps: CommandStep[] = JSON.parse(fileContent.toString());
        console.log('Steps fetched successfully:', steps);
        return steps;
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to read steps.json: ${error}`);
        console.error('Error fetching steps:', error);
        return [];
    }
}

async function executeSteps(steps: CommandStep[]) {
    for (let i = 0; i < steps.length; i++) {
        console.log(`Executing step ${i + 1}:`, steps[i]);
        stepProvider.updateStepStatus(i, 'In Progress');
        try {
            await executeStep(steps[i]);
            stepProvider.updateStepStatus(i, 'Completed');
        } catch (error) {
            console.error(`Error executing step ${i + 1}:`, error);
            stepProvider.updateStepStatus(i, 'Failed');
            vscode.window.showErrorMessage(`Failed to execute step ${i + 1}: ${error}`);
        }
    }
    vscode.window.showInformationMessage('All voice commands executed successfully.');
}

async function executeStep(step: CommandStep) {
    switch (step.action) {
        // File and folder operations
        case 'open':
            await openFile(step.content);
            break;
        case 'newFile':
            await createNewFile(step.content);
            break;
        case 'newFolder':
            await createNewFolder(step.content);
            break;
        case 'rename':
            await renameFile(step.content);
            break;
        case 'deleteFile':
            await deleteFile(step.content);
            break;
        case 'copyFile':
            await copyFile(step.sourceFile!, step.targetFile!);
            break;
        case 'moveFile':
            await moveFile(step.sourceFile!, step.targetFile!);
            break;
        case 'saveFile':
            await vscode.commands.executeCommand('workbench.action.files.save');
            break;
        case 'saveAllFiles':
            await vscode.commands.executeCommand('workbench.action.files.saveAll');
            break;
        case 'compareFiles':
            await vscode.commands.executeCommand('workbench.action.compareEditor.compareWith');
            break;

        // Code editing and refactoring
        case 'edit':
            await editFile(step.content, step.type);
            break;
        case 'format':
            await vscode.commands.executeCommand('editor.action.formatDocument');
            break;
        case 'commentLine':
            await vscode.commands.executeCommand('editor.action.commentLine');
            break;
        case 'uncommentLine':
            await vscode.commands.executeCommand('editor.action.uncommentLine');
            break;
        case 'indentLine':
            await vscode.commands.executeCommand('editor.action.indentLines');
            break;
        case 'outdentLine':
            await vscode.commands.executeCommand('editor.action.outdentLines');
            break;
        case 'renameSymbol':
            await vscode.commands.executeCommand('editor.action.rename');
            break;
        case 'extractMethod':
            await vscode.commands.executeCommand('editor.action.extractMethod');
            break;
        case 'extractVariable':
            await vscode.commands.executeCommand('editor.action.extractVariable');
            break;
        case 'organizeImports':
            await vscode.commands.executeCommand('editor.action.organizeImports');
            break;
        case 'fixAll':
            await vscode.commands.executeCommand('editor.action.fixAll');
            break;

        // Code navigation
        case 'goToDefinition':
            await vscode.commands.executeCommand('editor.action.revealDefinition');
            break;
        case 'findReferences':
            await vscode.commands.executeCommand('editor.action.referenceSearch.trigger');
            break;
        case 'goToLine':
            await vscode.commands.executeCommand('workbench.action.gotoLine');
            break;
        case 'goToSymbol':
            await vscode.commands.executeCommand('workbench.action.gotoSymbol');
            break;
        case 'goToFile':
            await vscode.commands.executeCommand('workbench.action.quickOpen');
            break;
        case 'navigateBack':
            await vscode.commands.executeCommand('workbench.action.navigateBack');
            break;
        case 'navigateForward':
            await vscode.commands.executeCommand('workbench.action.navigateForward');
            break;

        // Search and replace
        case 'find':
            await vscode.commands.executeCommand('actions.find');
            break;
        case 'replace':
            await vscode.commands.executeCommand('editor.action.startFindReplaceAction');
            break;
        case 'findInFiles':
            await vscode.commands.executeCommand('workbench.action.findInFiles');
            break;
        case 'replaceInFiles':
            await vscode.commands.executeCommand('workbench.action.replaceInFiles');
            break;

        // Editor management
        case 'splitEditorRight':
            await vscode.commands.executeCommand('workbench.action.splitEditorRight');
            break;
        case 'splitEditorDown':
            await vscode.commands.executeCommand('workbench.action.splitEditorDown');
            break;
        case 'closeEditor':
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            break;
        case 'closeAllEditors':
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            break;
        case 'focusNextEditor':
            await vscode.commands.executeCommand('workbench.action.nextEditor');
            break;
        case 'focusPreviousEditor':
            await vscode.commands.executeCommand('workbench.action.previousEditor');
            break;

        // View management
        case 'toggleSidebar':
            await vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');
            break;
        case 'togglePanel':
            await vscode.commands.executeCommand('workbench.action.togglePanel');
            break;
        case 'toggleZenMode':
            await vscode.commands.executeCommand('workbench.action.toggleZenMode');
            break;
        case 'toggleFullScreen':
            await vscode.commands.executeCommand('workbench.action.toggleFullScreen');
            break;
        case 'toggleMinimap':
            await vscode.commands.executeCommand('editor.action.toggleMinimap');
            break;
        case 'toggleWordWrap':
            await vscode.commands.executeCommand('editor.action.toggleWordWrap');
            break;

        // Terminal operations
        case 'openTerminal':
            await vscode.commands.executeCommand('workbench.action.terminal.new');
            break;
        case 'run':
            await runFile(step.content);
            break;
        case 'runSelectedText':
            await vscode.commands.executeCommand('workbench.action.terminal.runSelectedText');
            break;
        case 'clearTerminal':
            await vscode.commands.executeCommand('workbench.action.terminal.clear');
            break;
        case 'killTerminal':
            await vscode.commands.executeCommand('workbench.action.terminal.kill');
            break;

        // Git operations
        case 'gitStage':
            await gitOperation('stage');
            break;
        case 'gitCommit':
            await gitOperation('commit', step.gitMessage);
            break;
        case 'gitPush':
            await gitOperation('push');
            break;
        case 'gitPull':
            await gitOperation('pull');
            break;
        case 'gitCheckoutBranch':
            await gitOperation('checkout', step.branchName);
            break;
        case 'gitCreateBranch':
            await gitOperation('branch', step.branchName);
            break;
        case 'gitMerge':
            await gitOperation('merge');
            break;

        // Debugging
        case 'startDebugging':
            await debugOperation('start');
            break;
        case 'stopDebugging':
            await debugOperation('stop');
            break;
        case 'toggleBreakpoint':
            await vscode.commands.executeCommand('editor.debug.action.toggleBreakpoint');
            break;
        case 'stepOver':
            await debugOperation('stepOver');
            break;
        case 'stepInto':
            await debugOperation('stepInto');
            break;
        case 'stepOut':
            await debugOperation('stepOut');
            break;
        case 'continue':
            await debugOperation('continue');
            break;

        // Code folding
        case 'foldAll':
            await vscode.commands.executeCommand('editor.foldAll');
            break;
        case 'unfoldAll':
            await vscode.commands.executeCommand('editor.unfoldAll');
            break;
        case 'foldLevel':
            await vscode.commands.executeCommand('editor.foldLevel' + step.level);
            break;

        // Extensions
        case 'installExtension':
            await manageExtension('install', step.extensionId!);
            break;
        case 'uninstallExtension':
            await manageExtension('uninstall', step.extensionId!);
            break;
        case 'enableExtension':
            await manageExtension('enable', step.extensionId!);
            break;
        case 'disableExtension':
            await manageExtension('disable', step.extensionId!);
            break;

        // Workspace
        case 'addFolder':
            await vscode.commands.executeCommand('workbench.action.addRootFolder');
            break;
        case 'removeFolder':
            await vscode.commands.executeCommand('workbench.action.removeRootFolder');
            break;
        case 'openWorkspace':
            await vscode.commands.executeCommand('workbench.action.openWorkspace');
            break;
        case 'saveWorkspace':
            await vscode.commands.executeCommand('workbench.action.saveWorkspaceAs');
            break;

        // Tasks
        case 'runTask':
            await manageTask('run', step.taskName);
            break;
        case 'buildTask':
            await manageTask('build');
            break;
        case 'testTask':
            await manageTask('test');
            break;

        // Integrated development
        case 'openSettings':
            await vscode.commands.executeCommand('workbench.action.openSettings');
            break;
        case 'openKeybindings':
            await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings');
            break;
        case 'showCommands':
            await vscode.commands.executeCommand('workbench.action.showCommands');
            break;
        case 'toggleOutputPanel':
            await vscode.commands.executeCommand('workbench.action.output.toggleOutput');
            break;
        case 'toggleProblemsPanel':
            await vscode.commands.executeCommand('workbench.actions.view.problems');
            break;

        // Language-specific
        case 'changeLanguageMode':
            await vscode.commands.executeCommand('workbench.action.editor.changeLanguageMode');
            break;

        // Custom actions
        case 'customCommand':
            await vscode.commands.executeCommand(step.commandId!);
            break;

        default:
            vscode.window.showWarningMessage(`Unknown action: ${step.action}`);
    }
}

// Helper functions
async function openFile(content: string) {
    const fileName = content.match(/"([^"]+)"/)?.[1];
    if (!fileName) {
        vscode.window.showErrorMessage(`Could not extract file name from: ${content}`);
        return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder is open');
        return;
    }

    const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
    try {
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open file: ${fileName}`);
    }
}

async function createNewFile(content: string) {
    const fileName = content.match(/"([^"]+)"/)?.[1];
    if (!fileName) {
        vscode.window.showErrorMessage(`Could not extract file name from: ${content}`);
        return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder is open');
        return;
    }

    const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
    try {
        await vscode.workspace.fs.writeFile(filePath, new Uint8Array());
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create file: ${fileName}`);
    }
}

async function createNewFolder(content: string) {
    const folderName = content.match(/"([^"]+)"/)?.[1];
    if (!folderName) {
        vscode.window.showErrorMessage(`Could not extract folder name from: ${content}`);
        return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder is open');
        return;
    }

    const folderPath = vscode.Uri.joinPath(workspaceFolder.uri, folderName);
    try {
        await vscode.workspace.fs.createDirectory(folderPath);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create folder: ${folderName}`);
    }
}

async function renameFile(content: string) {
    const match = content.match(/"([^"]+)" to "([^"]+)"/);
    if (!match) {
        vscode.window.showErrorMessage(`Could not extract file names from: ${content}`);
        return;
    }

    const [, oldName, newName] = match;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder is open');
        return;
    }

    const oldUri = vscode.Uri.joinPath(workspaceFolder.uri, oldName);
    const newUri = vscode.Uri.joinPath(workspaceFolder.uri, newName);

    try {
        // Check if the old file exists
        await vscode.workspace.fs.stat(oldUri);
        
        // Check if the new file name already exists
        try {
            await vscode.workspace.fs.stat(newUri);
            const overwrite = await vscode.window.showWarningMessage(
                `File "${newName}" already exists. Do you want to overwrite it?`,
                'Yes',
                'No'
            );
            if (overwrite !== 'Yes') {
                vscode.window.showInformationMessage('Rename operation cancelled.');
                return;
            }
        } catch (error) {
            // New file doesn't exist, which is fine
        }

        // Perform the rename operation
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        vscode.window.showInformationMessage(`Successfully renamed "${oldName}" to "${newName}"`);
    } catch (error) {
        if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
            vscode.window.showErrorMessage(`File "${oldName}" does not exist.`);
        } else {
            vscode.window.showErrorMessage(`Failed to rename file: ${error}`);
        }
        console.error('Error in renameFile:', error);
    }
}

async function deleteFile(content: string) {
    const fileName = content.match(/"([^"]+)"/)?.[1];
    if (!fileName) {
        vscode.window.showErrorMessage(`Could not extract file name from: ${content}`);
        return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder is open');
        return;
    }

    const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
    try {
        await vscode.workspace.fs.delete(filePath);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to delete file: ${fileName}`);
    }
}

async function copyFile(sourceFile: string, targetFile: string) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder is open');
        return;
    }

    const sourceUri = vscode.Uri.joinPath(workspaceFolder.uri, sourceFile);
    const targetUri = vscode.Uri.joinPath(workspaceFolder.uri, targetFile);

    try {
        await vscode.workspace.fs.copy(sourceUri, targetUri);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to copy file: ${error}`);
    }
}

async function moveFile(sourceFile: string, targetFile: string) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder is open');
        return;
    }

    const sourceUri = vscode.Uri.joinPath(workspaceFolder.uri, sourceFile);
    const targetUri = vscode.Uri.joinPath(workspaceFolder.uri, targetFile);

    try {
        await vscode.workspace.fs.rename(sourceUri, targetUri);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to move file: ${error}`);
    }
}

async function editFile(content: string, type: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return;
    }

    if (type === 'code_generation') {
        if (content.includes('Generate a function called')) {
            const functionName = content.match(/called "([^"]+)"/)?.[1];
            if (functionName) {
                const functionTemplate = `\n\ndef ${functionName}():\n    pass\n`;
                const position = new vscode.Position(editor.document.lineCount, 0);
                await editor.edit(editBuilder => {
                    editBuilder.insert(position, functionTemplate);
                });
            }
        } else if (content.includes('Change the variable')) {
            const variableName = content.match(/to "([^"]+)"/)?.[1];
            if (variableName) {
                const text = editor.document.getText();
                const updatedText = text.replace(/\b\w+(?=\s*=)/, variableName);
                await editor.edit(editBuilder => {
                    const range = new vscode.Range(
                        editor.document.positionAt(0),
                        editor.document.positionAt(text.length)
                    );
                    editBuilder.replace(range, updatedText);
                });
            }
        }
    } else {
        vscode.window.showWarningMessage(`Unsupported edit type: ${type}`);
    }
}

async function runFile(content: string) {
    const fileName = content.match(/"([^"]+)"/)?.[1];
    if (!fileName) {
        vscode.window.showErrorMessage(`Could not extract file name from: ${content}`);
        return;
    }

    const terminal = vscode.window.createTerminal('Run File');
    terminal.sendText(`python "${fileName}"`);
    terminal.show();
}

async function gitOperation(operation: string, message?: string) {
    try {
        await vscode.commands.executeCommand(`git.${operation}`, message);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to perform git ${operation}: ${error}`);
    }
}

async function debugOperation(operation: string) {
    try {
        await vscode.commands.executeCommand(`workbench.action.debug.${operation}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to perform debug ${operation}: ${error}`);
    }
}

async function manageExtension(action: string, extensionId: string) {
    try {
        await vscode.commands.executeCommand(`workbench.extensions.${action}Extension`, extensionId);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to ${action} extension: ${error}`);
    }
}

async function manageTask(action: string, taskName?: string) {
    try {
        if (taskName) {
            await vscode.commands.executeCommand('workbench.action.tasks.runTask', taskName);
        } else {
            await vscode.commands.executeCommand(`workbench.action.tasks.${action}`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to ${action} task: ${error}`);
    }
}

export function deactivate() {
    console.log('Voice Command Extension is deactivated');
}
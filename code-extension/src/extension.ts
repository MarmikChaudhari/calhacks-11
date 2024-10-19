import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let panel: vscode.WebviewPanel | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "python-file-executor" is now active!');

    let disposable = vscode.commands.registerCommand('python-file-executor.openExecutor', () => {
        if (panel) {
            panel.reveal(vscode.ViewColumn.Beside);
        } else {
            panel = vscode.window.createWebviewPanel(
                'pythonExecutor',
                'Python File Executor',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            panel.webview.html = getWebviewContent();

            panel.onDidDispose(
                () => {
                    panel = undefined;
                },
                null,
                context.subscriptions
            );

            panel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'executePython':
                            const workspaceFolders = vscode.workspace.workspaceFolders;
                            if (!workspaceFolders) {
                                vscode.window.showErrorMessage('No workspace folder is open.');
                                return;
                            }

                            const workspaceRoot = workspaceFolders[0].uri.fsPath;
                            const pythonFilePath = path.join(workspaceRoot, message.text);

                            if (fs.existsSync(pythonFilePath)) {
                                // Open the file
                                const document = await vscode.workspace.openTextDocument(pythonFilePath);
                                await vscode.window.showTextDocument(document, vscode.ViewColumn.One);

                                // Execute the file
                                const terminal = vscode.window.createTerminal('Python Executor');
                                terminal.sendText(`python "${pythonFilePath}"`);
                                terminal.show();
                            } else {
                                vscode.window.showErrorMessage('The specified Python file does not exist.');
                            }
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );
        }
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Python File Executor</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 10px;
            }
            input, button {
                margin: 10px 0;
                width: 100%;
                padding: 5px;
            }
        </style>
    </head>
    <body>
        <h2>Python File Executor</h2>
        <input type="text" id="pythonFileName" placeholder="Enter Python file name (e.g., script.py)">
        <button id="executeButton">Open and Execute Python File</button>

        <script>
            const vscode = acquireVsCodeApi();
            const button = document.getElementById('executeButton');
            const input = document.getElementById('pythonFileName');

            button.addEventListener('click', () => {
                const pythonFileName = input.value;
                vscode.postMessage({
                    command: 'executePython',
                    text: pythonFileName
                });
            });
        </script>
    </body>
    </html>`;
}

export function deactivate() {}
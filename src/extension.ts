import * as vscode from 'vscode';
import {BlockDefEditor} from './blockdefEditor';



export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('blocklybench.start', () => {
			vscode.window.showInformationMessage('Hello World!');
		})
	);

	context.subscriptions.push(BlockDefEditor.register(context));
}



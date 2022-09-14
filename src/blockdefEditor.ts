//import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
//import { Utils } from 'vscode-uri';
import { Disposable } from './dispose';
import { TextEncoder } from 'util';

class BlockDefDocument extends Disposable implements vscode.CustomDocument{
	public readonly uri: vscode.Uri;
	public readonly svox_uri: vscode.Uri;
	private _blocks: any;
	private _code: string;

	private readonly _onDidChange = this._register(new vscode.EventEmitter<{
		readonly label: string,
		undo(): void,
		redo(): void,
	}>());
	public readonly onDidChange = this._onDidChange.event;
	
	public static async read(uri: vscode.Uri): Promise<BlockDefDocument> {
		let blocks;
		const contents = await vscode.workspace.fs.readFile(uri);

		if (contents.toString() !== '{}') {
			blocks = JSON.parse(contents.toString());
		}
        
		return new BlockDefDocument(uri, blocks);
	}
	
	constructor(uri: vscode.Uri, blocks: any){
		super();
		this.uri = uri;

		const parsed_svox_uri: any = path.parse(this.uri.toString());
		this.svox_uri = vscode.Uri.parse(`${parsed_svox_uri.dir}/${parsed_svox_uri.name}`); // without the JSON (so appel.svox)

		this._blocks = blocks;
		this._code = '';
	}

	public async write(){
		// Write the JSON
		const contents = JSON.stringify(this.blocks, undefined, 2);
		vscode.workspace.fs.writeFile(this.uri, new TextEncoder().encode(contents));

		// Write the svox file
		vscode.workspace.fs.writeFile(this.svox_uri, new TextEncoder().encode(this.code));
	}

	public get blocks(): any {
		return this._blocks;
	}

	public set blocks(value: any) {
		const current_json = JSON.stringify(this._blocks, undefined, 2);
		const new_json = JSON.stringify(value, undefined, 2);

		if(current_json!==new_json){
			this._blocks = value;

			this._onDidChange.fire({
				label: 'Blocks',
				undo: () => {return;},
				redo: () => {return;}
			});
		}
	}

	public get code(): string {
		return this._code;
	}
	public set code(value: string) {
		this._code = value;
	}

    
}

export class BlockDefEditor implements vscode.CustomEditorProvider<BlockDefDocument>{
	private static readonly viewType = 'blocklybench.blockdefEditor';

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		

		return vscode.window.registerCustomEditorProvider(
			BlockDefEditor.viewType,
			new BlockDefEditor(context),
			{
				webviewOptions: {
					retainContextWhenHidden: true,
				},
				supportsMultipleEditorsPerDocument: false,
			});
	}

	constructor(context: vscode.ExtensionContext){
		this.context = context;
	}

	private readonly context: vscode.ExtensionContext;
	private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<BlockDefDocument>>();
	public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

	saveCustomDocument(document: BlockDefDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.write(); // writes both the .svox.json and the .svox (generated code)
	}
	saveCustomDocumentAs(document: BlockDefDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
		throw new Error('Method not implemented.');
	}
	revertCustomDocument(document: BlockDefDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		throw new Error('Method not implemented.');
	}
	backupCustomDocument(document: BlockDefDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
		throw new Error('Method not implemented.');
	}
	async openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, 
		token: vscode.CancellationToken): Promise<BlockDefDocument>{

		return BlockDefDocument.read(uri);
	}

	resolveCustomEditor(document: BlockDefDocument, panel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {		
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
			]
		};

		panel.reveal();

		const mediaUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media')));
		const blocklyMinUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockly.min.js')));
		const editorJs = panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'svox', 'editor.js')));
		const matrixJs = panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'svox', 'matrix.js')));
		const smoothVoxelsJs = panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'svox', 'smoothvoxels.1.1.0.min.js')));
		const smoothVoxelsCss = panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'svox', 'smoothvoxels.css')));
		const playgroundJs = panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'svox', 'playground.1.1.0.min.js')));
		const workspaceSearchUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'plugin-workspace-search.js')));
		const themeDarkUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'theme-dark.js')));
		

		panel.webview.html = `
		<!DOCTYPE html>
		<html>
		  <body>hoi</body>
        </html>
			
		`;

		panel.webview.onDidReceiveMessage((message) => {
			switch (message.command) {
				case 'loaded': {
					if (message.loaded) {
						panel.webview.postMessage({command: 'blocks', blocks: document.blocks});
					}
					break;
				}
				case 'blocks': {
					document.blocks = message.blocks;
					break;
				}
				case 'code': {
					document.code = message.code;
					break;
				}
				default:
					break;
			}
		}, null);
		
		document.onDidChange(e => {
			// Tell VS Code that the document has been edited by the use.
			this._onDidChangeCustomDocument.fire({
				document,
				...e,
			});
		});
	}
	
}
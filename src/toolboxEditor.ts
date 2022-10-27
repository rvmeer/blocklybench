//import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
//import { Utils } from 'vscode-uri';
import { Disposable } from './dispose';
import { TextEncoder } from 'util';

class ToolboxDocument extends Disposable implements vscode.CustomDocument{
	public readonly uri: vscode.Uri;
	private _toolbox: any;
	private _blocksDict = new Map<string, any>();

	private readonly _onDidChange = this._register(new vscode.EventEmitter<{
		readonly label: string,
		undo(): void,
		redo(): void,
	}>());
	public readonly onDidChange = this._onDidChange.event;
	
	
	public static async read(uri: vscode.Uri): Promise<ToolboxDocument> {
		let toolbox;
		const contents = await vscode.workspace.fs.readFile(uri);

		if (contents.toString() !== '{}') {
			toolbox = JSON.parse(contents.toString());
		}

		//Iterate all .block.json files in the current workspace
		const blocksDict = new Map<string, any>();
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if(workspaceFolders){
			for (const workspaceFolder of workspaceFolders) {
				const blockFiles = await vscode.workspace.findFiles('**/*.block.json', '**/node_modules/**');
				for (const blockFile of blockFiles) {
					const blockContents = await vscode.workspace.fs.readFile(blockFile);
					const block = JSON.parse(blockContents.toString());
					
					blocksDict.set(block.type, block);
				}
			}
		}

        
		return new ToolboxDocument(uri, toolbox, blocksDict);
	}
	
	constructor(uri: vscode.Uri, toolbox: any, blocks: Map<string, any>) {
		super();
		this.uri = uri;

		
		this._toolbox = toolbox;
		this._blocksDict = blocks;
	}

	public async write(){
		// Write the toolbox.json
		const contents = JSON.stringify(this.toolbox, undefined, 2);
		vscode.workspace.fs.writeFile(this.uri, new TextEncoder().encode(contents));
	}

	public get blocks() {
		return this._blocksDict;
	}


	public get toolbox(): any {
		return this._toolbox;
	}

	public set toolbox(value: any) {
		const current_json = JSON.stringify(this._toolbox, undefined, 2);
		const new_json = JSON.stringify(value, undefined, 2);

		if(current_json!==new_json){
			this._toolbox = value;

			this._onDidChange.fire({
				label: 'Blocks',
				undo: () => {return;},
				redo: () => {return;}
			});
		}
	}
    
}

export class ToolboxEditor implements vscode.CustomEditorProvider<ToolboxDocument>{
	private static readonly viewType = 'blocklybench.ToolboxEditor';

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		return vscode.window.registerCustomEditorProvider(
			ToolboxEditor.viewType,
			new ToolboxEditor(context),
			{
				webviewOptions: {
					retainContextWhenHidden: true,
				},
				supportsMultipleEditorsPerDocument: false
			});
	}

	constructor(context: vscode.ExtensionContext){
		this.context = context;
	}

	private readonly context: vscode.ExtensionContext;
	private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<ToolboxDocument>>();
	public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

	saveCustomDocument(document: ToolboxDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.write(); // writes both the .svox.json and the .svox (generated code)
	}
	saveCustomDocumentAs(document: ToolboxDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
		throw new Error('Method not implemented.');
	}
	revertCustomDocument(document: ToolboxDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		throw new Error('Method not implemented.');
	}
	backupCustomDocument(document: ToolboxDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
		throw new Error('Method not implemented.');
	}
	async openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, 
		token: vscode.CancellationToken): Promise<ToolboxDocument>{

		return ToolboxDocument.read(uri);
	}



	resolveCustomEditor(document: ToolboxDocument, panel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {		
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
		<head>
		  <meta charset="utf-8">
		  <meta name="viewport" content="target-densitydpi=device-dpi, height=660, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
		  <title>Blockly Demo: Blockly Developer Tools</title>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockly', 'blockly_compressed.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockly', 'javascript_compressed.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockly', 'msg', 'js', 'en.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockly', 'blocks_compressed.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockly', 'theme-dark.js')))}"></script>

		  
		  <link rel="stylesheet" href="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'factory.css')))}">
		  <link rel="stylesheet" href="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'cp.css')))}">
		  <script src="https://cdn.rawgit.com/google/code-prettify/master/loader/run_prettify.js"></script>
		  <script>
			    const vscode = acquireVsCodeApi();

				var init = function() {

					

					window.addEventListener('message', event => {
						const message = event.data;
						switch (message.command) {
							case 'block':
								// Define the Block
								Blockly.Blocks[message.block.type] = {
									init: function() {
									  this.jsonInit(message.block);
									}
								  };

							case 'toolbox':
								// Create the workspace with the received toolbox
								var workspace = Blockly.inject('blocklyToolboxWorkspace',
									{collapse: false,
									toolbox: message.toolbox,
									comments: false,
									disable: false,
									// media: 'media/', defaults to https://blockly-demo.appspot.com/static/media/
									theme: "dark",
									sounds: false,
									trashcan: false
									});
							break;
						}
					});

					vscode.postMessage({
						command: 'loaded',
						loaded: true
					});
				};

				window.addEventListener('load', init);
		  </script>
		</head>
		<body>
			<div id="blocklyToolboxWorkspace" style="border: 1px solid red; width: 90%; height: 90%"></div>
		  
		
		</body>
		</html>
		
			
		`;

		
		panel.webview.onDidReceiveMessage((message) => {
			switch (message.command) {
				case 'loaded': {
					if (message.loaded) {
						panel.webview.postMessage({
							command: 'toolbox', 
							toolbox: document.toolbox
						});

						// Send a message for each block
						document.blocks.forEach((value: any) => {
							panel.webview.postMessage({
								command: 'block',
								block: value
							});
						});
					}
					break;
				}
				case 'toolbox': {
					document.toolbox = message.blocks;
					break;
				}
				case 'code': {
					
					break;
				}
				default:
					break;
			}
		}, null);
	}
	
}
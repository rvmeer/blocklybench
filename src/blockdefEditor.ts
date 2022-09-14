//import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
//import { Utils } from 'vscode-uri';
import { Disposable } from './dispose';
import { TextEncoder } from 'util';

class BlockDefDocument extends Disposable implements vscode.CustomDocument{
	public readonly uri: vscode.Uri;
	public readonly block_js_uri: vscode.Uri;
	public readonly block_json_uri: vscode.Uri;
	private _blocks: any;
	private _blockdefName: string;

	private _js_code: string;
	private _json_code: string;

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

		const parsed_uri: any = path.parse(this.uri.toString());
		this._blockdefName = parsed_uri.name.split('.')[0];
		this.block_js_uri = vscode.Uri.parse(`${parsed_uri.dir}/${this._blockdefName}.block.js`);
		this.block_json_uri = vscode.Uri.parse(`${parsed_uri.dir}/${this._blockdefName}.block.json`);

		
		this._blocks = blocks;
		this._js_code = '';
		this._json_code = '';
	}

	public async write(){
		// Write the JSON
		const contents = JSON.stringify(this.blocks, undefined, 2);
		vscode.workspace.fs.writeFile(this.uri, new TextEncoder().encode(contents));

		// Write the block.js file
		vscode.workspace.fs.writeFile(this.block_js_uri, new TextEncoder().encode(this.js_code));

		// Write the block.json file
		vscode.workspace.fs.writeFile(this.block_json_uri, new TextEncoder().encode(this.json_code));
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

	public get js_code(): string {
		return this._js_code;
	}
	public set js_code(value: string) {
		this._js_code = value;
	}

	public get json_code(): string {
		return this._json_code;
	}

	public set json_code(value: string) {
		this._json_code = value;
	}

	public get blockdefName(): string {
		return this._blockdefName;
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
				supportsMultipleEditorsPerDocument: false
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
		<head>
		  <meta charset="utf-8">
		  <meta name="viewport" content="target-densitydpi=device-dpi, height=660, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
		  <title>Blockly Demo: Blockly Developer Tools</title>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockly', 'blockly_compressed.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockly', 'javascript_compressed.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockly', 'msg', 'js', 'en.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockly', 'blocks_compressed.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockly', 'theme-dark.js')))}"></script>

		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'analytics.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'block_definition_extractor.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'factory_utils.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'workspacefactory/wfactory_model.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'standard_categories.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'cp.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'workspacefactory/wfactory_controller.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'workspacefactory/wfactory_view.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'workspacefactory/wfactory_generator.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'workspacefactory/wfactory_init.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'block_option.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'factory.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'block_library_view.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'block_library_storage.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'block_library_controller.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'block_exporter_tools.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'block_exporter_view.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'block_exporter_controller.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'blocks.js')))}"></script>
		  <script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'app_controller.js')))}"></script>
		  <script src="/storage.js"></script>
		  <link rel="stylesheet" href="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'factory.css')))}">
		  <link rel="stylesheet" href="${panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'blockfactory', 'cp.css')))}">
		  <script src="https://cdn.rawgit.com/google/code-prettify/master/loader/run_prettify.js"></script>
		  <script>
			    const vscode = acquireVsCodeApi();

				var blocklyFactory;
				var init = function() {
			  		BlocklyDevTools.Analytics.init();
		
			  		blocklyFactory = new AppController();
			  		blocklyFactory.init();
			  		window.addEventListener('beforeunload', blocklyFactory.confirmLeavePage);

					window.addEventListener('message', event => {
						const message = event.data;
						switch (message.command) {
							case 'blocks':
								Blockly.serialization.workspaces.load(message.blocks, BlockFactory.mainWorkspace);

								BlockFactory.mainWorkspace.addChangeListener((event) => {
									vscode.postMessage({
										command: 'blocks',
										blocks: Blockly.serialization.workspaces.save(BlockFactory.mainWorkspace)
									});
			
									vscode.postMessage({
										command: 'code',
										code: {
											js: FactoryUtils.getBlockDefinition(message.blockdefName, FactoryUtils.getRootBlock(Blockly.mainWorkspace), "JavaScript",
												BlockFactory.mainWorkspace),
											json: FactoryUtils.getBlockDefinition(message.blockdefName, FactoryUtils.getRootBlock(Blockly.mainWorkspace), "JSON",
												BlockFactory.mainWorkspace)

										}
									});

									document.getElementById('languageTA').value = FactoryUtils.getBlockDefinition(message.blockdefName, 
										FactoryUtils.getRootBlock(Blockly.mainWorkspace), "JSON",
										BlockFactory.mainWorkspace);

									BlockFactory.updatePreview();
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
		  
		 
		
		  <!-- Blockly Factory Tab -->
		  <table id="blockFactoryContent">
			<tr height="95%">
			  <td id="blocklyWorkspaceContainer" style="width: 70%;">
				<div id="blockly"></div>
				<div id="blocklyMask"></div>
			  </td>
			  <td>
			  		<div id="preview" style="background-color: black; height: 100%;"></div>

					<!-- Needed for the preview, see BlockFactory.updatePreview() -->
					<textarea id="format" style="display: none">JSON</textarea>
					<textarea id="languageTA" style="display: None"></textarea>
					<select id="direction" style="display: none">
						<option value="ltr" selected="selected">LTR</option>
						<option value="rtl">RTL</option>
					</select>
			  </td>
			</tr>
		  </table>
		
		  <div id="modalShadow"></div>
		
		  <xml xmlns="https://developers.google.com/blockly/xml" id="blockfactory_toolbox" class="toolbox">
			<category name="Input">
			  <block type="input_value">
				<value name="TYPE">
				  <shadow type="type_null"></shadow>
				</value>
			  </block>
			  <block type="input_statement">
				<value name="TYPE">
				  <shadow type="type_null"></shadow>
				</value>
			  </block>
			  <block type="input_dummy"></block>
			</category>
			<category name="Field">
			  <block type="field_static"></block>
			  <block type="field_label_serializable"></block>
			  <block type="field_input"></block>
			  <block type="field_number"></block>
			  <block type="field_angle"></block>
			  <block type="field_dropdown"></block>
			  <block type="field_checkbox"></block>
			  <block type="field_colour"></block>
			  <block type="field_variable"></block>
			  <block type="field_image"></block>
			</category>
			<category name="Type">
			  <block type="type_group"></block>
			  <block type="type_null"></block>
			  <block type="type_boolean"></block>
			  <block type="type_number"></block>
			  <block type="type_string"></block>
			  <block type="type_list"></block>
			  <block type="type_other"></block>
			</category>
			<category name="Colour" id="colourCategory">
			  <block type="colour_hue"><mutation colour="20"></mutation><field name="HUE">20</field></block>
			  <block type="colour_hue"><mutation colour="65"></mutation><field name="HUE">65</field></block>
			  <block type="colour_hue"><mutation colour="120"></mutation><field name="HUE">120</field></block>
			  <block type="colour_hue"><mutation colour="160"></mutation><field name="HUE">160</field></block>
			  <block type="colour_hue"><mutation colour="210"></mutation><field name="HUE">210</field></block>
			  <block type="colour_hue"><mutation colour="230"></mutation><field name="HUE">230</field></block>
			  <block type="colour_hue"><mutation colour="260"></mutation><field name="HUE">260</field></block>
			  <block type="colour_hue"><mutation colour="290"></mutation><field name="HUE">290</field></block>
			  <block type="colour_hue"><mutation colour="330"></mutation><field name="HUE">330</field></block>
			</category>
		  </xml>
		
		  <xml xmlns="https://developers.google.com/blockly/xml" id="workspacefactory_toolbox" class="toolbox">
			<category name="Logic" colour="210">
			  <block type="controls_if"></block>
			  <block type="logic_compare"></block>
			  <block type="logic_operation"></block>
			  <block type="logic_negate"></block>
			  <block type="logic_boolean"></block>
			  <block type="logic_null"></block>
			  <block type="logic_ternary"></block>
			</category>
			<category name="Loops" colour="120">
			  <block type="controls_repeat_ext">
				<value name="TIMES">
				  <shadow type="math_number">
					<field name="NUM">10</field>
				  </shadow>
				</value>
			  </block>
			  <block type="controls_whileUntil"></block>
			  <block type="controls_for">
				<value name="FROM">
				  <shadow type="math_number">
					<field name="NUM">1</field>
				  </shadow>
				</value>
				<value name="TO">
				  <shadow type="math_number">
					<field name="NUM">10</field>
				  </shadow>
				</value>
				<value name="BY">
				  <shadow type="math_number">
					<field name="NUM">1</field>
				  </shadow>
				</value>
			  </block>
			  <block type="controls_forEach"></block>
			  <block type="controls_flow_statements"></block>
			</category>
			<category name="Math" colour="230">
			  <block type="math_number"></block>
			  <block type="math_arithmetic">
				<value name="A">
				  <shadow type="math_number">
					<field name="NUM">1</field>
				  </shadow>
				</value>
				<value name="B">
				  <shadow type="math_number">
					<field name="NUM">1</field>
				  </shadow>
				</value>
			  </block>
			  <block type="math_single">
				<value name="NUM">
				  <shadow type="math_number">
					<field name="NUM">9</field>
				  </shadow>
				</value>
			  </block>
			  <block type="math_trig">
				<value name="NUM">
				  <shadow type="math_number">
					<field name="NUM">45</field>
				  </shadow>
				</value>
			  </block>
			  <block type="math_constant"></block>
			  <block type="math_number_property">
				<value name="NUMBER_TO_CHECK">
				  <shadow type="math_number">
					<field name="NUM">0</field>
				  </shadow>
				</value>
			  </block>
			  <block type="math_round">
				<value name="NUM">
				  <shadow type="math_number">
					<field name="NUM">3.1</field>
				  </shadow>
				</value>
			  </block>
			  <block type="math_on_list"></block>
			  <block type="math_modulo">
				<value name="DIVIDEND">
				  <shadow type="math_number">
					<field name="NUM">64</field>
				  </shadow>
				</value>
				<value name="DIVISOR">
				  <shadow type="math_number">
					<field name="NUM">10</field>
				  </shadow>
				</value>
			  </block>
			  <block type="math_constrain">
				<value name="VALUE">
				  <shadow type="math_number">
					<field name="NUM">50</field>
				  </shadow>
				</value>
				<value name="LOW">
				  <shadow type="math_number">
					<field name="NUM">1</field>
				  </shadow>
				</value>
				<value name="HIGH">
				  <shadow type="math_number">
					<field name="NUM">100</field>
				  </shadow>
				</value>
			  </block>
			  <block type="math_random_int">
				<value name="FROM">
				  <shadow type="math_number">
					<field name="NUM">1</field>
				  </shadow>
				</value>
				<value name="TO">
				  <shadow type="math_number">
					<field name="NUM">100</field>
				  </shadow>
				</value>
			  </block>
			  <block type="math_random_float"></block>
			</category>
			<category name="Text" colour="160">
			  <block type="text"></block>
			  <block type="text_join"></block>
			  <block type="text_append">
				<value name="TEXT">
				  <shadow type="text"></shadow>
				</value>
			  </block>
			  <block type="text_length">
				<value name="VALUE">
				  <shadow type="text">
					<field name="TEXT">abc</field>
				  </shadow>
				</value>
			  </block>
			  <block type="text_isEmpty">
				<value name="VALUE">
				  <shadow type="text">
					<field name="TEXT"></field>
				  </shadow>
				</value>
			  </block>
			  <block type="text_indexOf">
				<value name="VALUE">
				  <block type="variables_get">
					<field name="VAR">text</field>
				  </block>
				</value>
				<value name="FIND">
				  <shadow type="text">
					<field name="TEXT">abc</field>
				  </shadow>
				</value>
			  </block>
			  <block type="text_charAt">
				<value name="VALUE">
				  <block type="variables_get">
					<field name="VAR">text</field>
				  </block>
				</value>
			  </block>
			  <block type="text_getSubstring">
				<value name="STRING">
				  <block type="variables_get">
					<field name="VAR">text</field>
				  </block>
				</value>
			  </block>
			  <block type="text_changeCase">
				<value name="TEXT">
				  <shadow type="text">
					<field name="TEXT">abc</field>
				  </shadow>
				</value>
			  </block>
			  <block type="text_trim">
				<value name="TEXT">
				  <shadow type="text">
					<field name="TEXT">abc</field>
				  </shadow>
				</value>
			  </block>
			  <block type="text_print">
				<value name="TEXT">
				  <shadow type="text">
					<field name="TEXT">abc</field>
				  </shadow>
				</value>
			  </block>
			  <block type="text_prompt_ext">
				<value name="TEXT">
				  <shadow type="text">
					<field name="TEXT">abc</field>
				  </shadow>
				</value>
			  </block>
			</category>
			<category name="Lists" colour="260">
			  <block type="lists_create_with">
				<mutation items="0"></mutation>
			  </block>
			  <block type="lists_create_with"></block>
			  <block type="lists_repeat">
				<value name="NUM">
				  <shadow type="math_number">
					<field name="NUM">5</field>
				  </shadow>
				</value>
			  </block>
			  <block type="lists_length"></block>
			  <block type="lists_isEmpty"></block>
			  <block type="lists_indexOf">
				<value name="VALUE">
				  <block type="variables_get">
					<field name="VAR">list</field>
				  </block>
				</value>
			  </block>
			  <block type="lists_getIndex">
				<value name="VALUE">
				  <block type="variables_get">
					<field name="VAR">list</field>
				  </block>
				</value>
			  </block>
			  <block type="lists_setIndex">
				<value name="LIST">
				  <block type="variables_get">
					<field name="VAR">list</field>
				  </block>
				</value>
			  </block>
			  <block type="lists_getSublist">
				<value name="LIST">
				  <block type="variables_get">
					<field name="VAR">list</field>
				  </block>
				</value>
			  </block>
			  <block type="lists_split">
				<value name="DELIM">
				  <shadow type="text">
					<field name="TEXT">,</field>
				  </shadow>
				</value>
			  </block>
			  <block type="lists_sort"></block>
			</category>
			<category name="Colour" colour="20">
			  <block type="colour_picker"></block>
			  <block type="colour_random"></block>
			  <block type="colour_rgb">
				<value name="RED">
				  <shadow type="math_number">
					<field name="NUM">100</field>
				  </shadow>
				</value>
				<value name="GREEN">
				  <shadow type="math_number">
					<field name="NUM">50</field>
				  </shadow>
				</value>
				<value name="BLUE">
				  <shadow type="math_number">
					<field name="NUM">0</field>
				  </shadow>
				</value>
			  </block>
			  <block type="colour_blend">
				<value name="COLOUR1">
				  <shadow type="colour_picker">
					<field name="COLOUR">#ff0000</field>
				  </shadow>
				</value>
				<value name="COLOUR2">
				  <shadow type="colour_picker">
					<field name="COLOUR">#3333ff</field>
				  </shadow>
				</value>
				<value name="RATIO">
				  <shadow type="math_number">
					<field name="NUM">0.5</field>
				  </shadow>
				</value>
			  </block>
			</category>
			<sep></sep>
			<category name="Variables" colour="330" custom="VARIABLE"></category>
			<category name="Functions" colour="290" custom="PROCEDURE"></category>
			<sep></sep>
			<category name="Block Library" colour="260" id="blockLibCategory"></category>
		  </xml>
		
		</body>
		</html>
		
			
		`;

		panel.webview.onDidReceiveMessage((message) => {
			switch (message.command) {
				case 'loaded': {
					if (message.loaded) {
						panel.webview.postMessage({
							command: 'blocks', 
							blocks: document.blocks,
							blockdefName: document.blockdefName,
						});
					}
					break;
				}
				case 'blocks': {
					document.blocks = message.blocks;
					break;
				}
				case 'code': {
					document.js_code = message.code.js;
					document.json_code = message.code.json;
					break;
				}
				default:
					break;
			}
		}, null);
	}
	
}
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
			var blocklyFactory;
			var init = function() {
			  BlocklyDevTools.Analytics.init();
		
			  blocklyFactory = new AppController();
			  blocklyFactory.init();
			  window.addEventListener('beforeunload', blocklyFactory.confirmLeavePage);
			};
			window.addEventListener('load', init);
		  </script>
		</head>
		<body>
		  <h1><a href="https://developers.google.com/blockly/">Blockly</a> &gt;
			<a href="../index.html">Demos</a> &gt; Blockly Developer Tools
			<button id="helpButton" title="View documentation in new window.">
			  <span>Help</span>
			</button>
			<button class="privacyButton" title="Open Google privacy policy"><a class="privacyLink" href="https://policies.google.com/privacy">Privacy</a>
			</button>
		  </h1>
		  <div id="tabContainer">
			<div id="blockFactory_tab" class="tab tabon">Block Factory</div>
			<div id="blocklibraryExporter_tab" class="tab taboff">Block Exporter</div>
			<div id="workspaceFactory_tab" class="tab taboff">Workspace Factory</div>
		  </div>
		
		  <!-- Exporter tab -->
		  <div id="blockLibraryExporter">
			<br>
			<p>
			  First, select blocks from your block library by clicking on them. Then, use the Export Settings form to download starter code for selected blocks.
			</p>
			<div id="exportSelector">
			  <br>
			  <h3>Block Selector</h3>
			  <div class="dropdown">
				<button id="button_setBlocks">Select</button>
				<div id="dropdownDiv_setBlocks" class="dropdown-content">
				  <a id="dropdown_addAllFromLib" title="Select all block library blocks.">All Stored in Block Library</a>
				  <a id="dropdown_addAllUsed" title="Select all block library blocks used in workspace factory.">All Used in Workspace Factory</a>
				</div>
				<button id="clearSelectedButton" title="Clear selected blocks.">Clear Selected</button>
			  </div>
		
			  <div id="blockSelector"></div>
			</div>
		
			<!-- Users may customize export settings through this form -->
			<div id="exportSettings">
			  <br>
			  <h3> Export Settings </h3>
			  <form id="exportSettingsForm">
		
				<div id="selectedBlocksTextContainer">
				  <p>Currently Selected:</p>
				  <p id="selectedBlocksText"></p>
				</div>
				<label><input type="checkbox" id="blockDefCheck">Block Definition(s)</label><br>
				<div id="blockDefSettings" class="subsettings">
				  <label>Format:
				  <select id="exportFormat">
					<option value="JSON">JSON</option>
					<option value="JavaScript">JavaScript</option>
				  </select></label>
				  <br>
				  <label>File Name:<br>
				  <input type="text" id="blockDef_filename"></label>
				</div>
				<br>
		
				<label><input type="checkbox" id="genStubCheck">Generator Stub(s)</label><br>
				<div id="genStubSettings" class="subsettings">
				  <label>Language:
				  <select id="exportLanguage">
					<option value="JavaScript">JavaScript</option>
					<option value="Python">Python</option>
					<option value="PHP">PHP</option>
					<option value="Lua">Lua</option>
					<option value="Dart">Dart</option>
				  </select></label>
				  <br>
				  <label>File Name:<br>
				  <input type="text" id="generatorStub_filename"></label><br>
				</div>
				<br>
			  </form>
			  <button id="exporterSubmitButton" title="Download block starter code as specified in export settings.">Export</button>
			</div>
			<div id="exportPreview">
			  <br>
			  <h3>Export Preview</h3>
			  <div id="blockDefs" class="exportPreviewTextArea">
				<p id="blockDefs_label">Block Definitions:</p>
				<pre id="blockDefs_textArea" class="prettyprint lang-js"></pre>
			  </div>
			  <div id="genStubs" class="exportPreviewTextArea">
				<p id="genStubs_label">Generator Stubs:</p>
				<pre id="genStubs_textArea" class="prettyprint lang-js"></pre>
			  </div>
			</div>
		  </div>
		
		  <!-- Workspace Factory tab -->
		
		  <div id="workspaceFactoryContent">
			<div id="factoryHeader">
			  <p>
				<div class="dropdown">
				<button id="button_importBlocks">Import Custom Blocks</button>
				  <div id="dropdownDiv_importBlocks" class="dropdown-content">
					<input type="file" id="input_importBlocksJson" accept=".js, .json, .txt" class="inputfile">
					<label for="input_importBlocksJson">From JSON</label>
					<input type="file" id="input_importBlocksJs" accept=".js, .txt" class="inputfile">
					<label for="input_importBlocksJs">From Javascript</label>
				  </div>
				</div>
		
				<div class="dropdown">
				<button id="button_load">Load to Edit</button>
				  <div id="dropdownDiv_load" class="dropdown-content">
					<input type="file" id="input_loadToolbox" accept=".xml" class="inputfile">
					<label for="input_loadToolbox">Toolbox</label>
					<input type="file" id="input_loadPreload" accept=".xml" class="inputfile">
					<label for="input_loadPreload">Workspace Blocks</label>
				  </div>
				</div>
		
				<div class="dropdown">
				<button id="button_export">Export</button>
				  <div id="dropdownDiv_export" class="dropdown-content">
					<a id="dropdown_exportOptions">Starter Code</a>
					<a id="dropdown_exportToolbox">Toolbox</a>
					<a id="dropdown_exportPreload">Workspace Blocks</a>
					<a id="dropdown_exportAll">All</a>
				  </div>
				</div>
		
				<button id="button_clear">Clear</button>
			  </p>
			</div>
		
			<section id="createDiv">
			  <div id="createHeader">
				<h3>Edit</h3>
				<p id="editHelpText">Drag blocks into the workspace to configure the toolbox in your custom workspace.</p>
			  </div>
			  <table id="workspaceTabs" style="width:auto; height:auto">
				<tr>
				  <td id="tab_toolbox" class="tabon">Toolbox</td>
				  <td id="tab_preload" class="taboff">Workspace</td>
				</tr>
			  </table>
			  <section id="toolbox_section">
				<div id="toolbox_blocks"></div>
			  </section>
			  <aside id="toolbox_div">
				<p id="categoryHeader">You currently have no categories.</p>
				<table id="categoryTable" style="width:auto; height:auto">
				</table>
				<p>&nbsp;</p>
		
				<div class="dropdown">
				  <button id="button_add" class="large">+</button>
				  <div id="dropdownDiv_add" class="dropdown-content">
					<a id="dropdown_newCategory">New Category</a>
					<a id="dropdown_loadCategory">Standard Category</a>
					<a id="dropdown_separator">Separator</a>
					<a id="dropdown_loadStandardToolbox">Standard Toolbox</a>
				  </div>
				</div>
		
				<button id="button_remove" class="large">-</button>
		
				<button id="button_up" class="large">&#8593;</button>
				<button id="button_down" class="large">&#8595;</button>
		
				<br>
				<div class="dropdown">
				  <button id="button_editCategory">Edit Category...</button>
				  <div id="dropdownDiv_editCategory" class="dropdown-content">
					<input id="categoryName">
					<input id="categoryColour" value="000000">
					<button id="categorySave">Save</button>
				  </div>
				</div>
		
			  </aside>
		
			  <button id="button_addShadow" style="display: none">Make Shadow</button>
			  <button id="button_removeShadow" style="display: none">Remove Shadow</button>
		
			  <aside id="preload_div" style="display:none">
				<div id="preloadHelp">
				  <p>Configure the options for your Blockly inject call.</p>
				  <button id="button_optionsHelp">Help</button>
				  <button class="small" id="button_standardOptions">Reset to Default</button>
				</div>
				<div id="workspace_options">
				  <label><input type="checkbox" id="option_readOnly_checkbox">Read Only</label><br>
				  <label><input type="checkbox" id="option_grid_checkbox">Use Grid</label><br>
				  <div id="grid_options" style="display: none">
					<label>Spacing <input type="number" id="gridOption_spacing_number" style="width: 3em"></label><br>
					<label>Length <input type="number" id="gridOption_length_number" style="width: 3em"></label><br>
					<label>Colour <input type="text" id="gridOption_colour_text" style="width: 8em"></label><br>
					<div id="readonly1">
					  <label><input type="checkbox" id="gridOption_snap_checkbox">Snap</label><br>
					</div>
				  </div>
				  <label>Path to Blockly Media <input type="text" id="option_media_text" style="width: 90%"></label><br>
				  <label><input type="checkbox" id="option_rtl_checkbox">Layout with RTL</label><br>
				  <label><input type="checkbox" id="option_scrollbars_checkbox">Scrollbars</label><br>
				  <label><input type="checkbox" id="option_zoom_checkbox">Zoom</label><br>
				  <div id="zoom_options" style="display: none">
					<label><input type="checkbox" id="zoomOption_controls_checkbox">Zoom Controls</label><br>
					<label><input type="checkbox" id="zoomOption_wheel_checkbox">Zoom Wheel</label><br>
					<label>Start Scale <input type="number" id="zoomOption_startScale_number" style="width: 4em"></label><br>
					<label>Max Scale <input type="number" id="zoomOption_maxScale_number" style="width: 4em"></label><br>
					<label>Min Scale <input type="number" id="zoomOption_minScale_number" style="width: 4em"></label><br>
					<label>Scale Speed <input type="number" id="zoomOption_scaleSpeed_number" style="width: 4em"></label><br>
				  </div>
				  <label><input type="checkbox" id="option_css_checkbox">Use Blockly CSS</label><br>
				  <div id="readonly2">
					<label><input type="checkbox" id="option_collapse_checkbox">Collapsible Blocks</label><br>
					<label><input type="checkbox" id="option_comments_checkbox">Comments for Blocks</label><br>
					<label><input type="checkbox" id="option_disable_checkbox">Disabled Blocks</label><br>
					<label><input type="checkbox" id="option_infiniteBlocks_checkbox">Infinite Blocks</label><br>
					<div id="maxBlockNumber_option" style="display: none">
					  <label>Max Blocks <input type="number" id="option_maxBlocks_number" style="width: 5em"></label><br>
					</div>
					<label><input type="checkbox" id="option_horizontalLayout_checkbox">Horizontal Toolbox</label><br>
					<label><input type="checkbox" id="option_toolboxPosition_checkbox">Toolbox End</label><br>
					<label><input type="checkbox" id="option_oneBasedIndex_checkbox">One-based index</label><br>
					<label><input type="checkbox" id="option_sounds_checkbox">Sounds<br>
					<label><input type="checkbox" id="option_trashcan_checkbox">Trashcan</label><br>
				  </div>
				</div>
			  </aside>
		
			</section>
		
			<aside id="previewDiv">
			  <div id="previewBorder">
				<div id="previewHelp">
				  <h3>Preview</h3>
				  <p>This is what your custom workspace will look like.</p>
				</div>
				<div id="preview_blocks" class="content"></div>
			  </div>
			</aside>
		  </div>
		
		  <!-- Blockly Factory Tab -->
		  <table id="blockFactoryContent">
			<tr width="100%" height="10%">
			  <td width="50%" height="5%">
				<table>
				  <tr id="blockLibrary">
					<td id="blockLibraryContainer">
					<span>
					  <div class="dropdown">
						<button id="button_blockLib">Block Library</button>
						<div id="dropdownDiv_blockLib" class="dropdown-content">
						  <a id="createNewBlockButton">Create New Block</a>
						</div>
					  </div>
					  <select id="blockLibraryDropdown" style="display:none">
					  </select>
					</span>
					</td>
					<td id="blockLibraryControls">
					<button id="saveToBlockLibraryButton" title="Save block to Block Library.">
					  Save "block_type"
					</button>
					<button id="removeBlockFromLibraryButton" title="Remove block from Block Library.">
					  Delete "block_type"
					</button>
					</td>
				  </tr>
				</table>
			  </td>
			  <td height="5%">
				<table id="blockFactoryPreview">
				  <tr>
					<td id="previewContainer">
					  <h3>Preview:
						<select id="direction">
						  <option value="ltr">LTR</option>
						  <option value="rtl">RTL</option>
						</select>
					  </h3>
					</td>
					<td id="buttonContainer">
					  <button id="linkButton" title="Save and link to blocks.">
						<img src="link.png" height="21" width="21">
					  </button>
					  <button id="clearBlockLibraryButton" title="Clear Block Library.">
						<span>Clear Library</span>
					  </button>
					  <label for="files" class="buttonStyle">
						<span class=>Import Block Library</span>
					  </label>
					  <input id="files" type="file" name="files"
						  accept="application/xml">
					  <button id="localSaveButton" title="Save block library XML to a local file.">
						<span>Download Block Library</span>
					  </button>
					</td>
				  </tr>
				</table>
			  </td>
			</tr>
			<tr height="80%">
			  <td id="blocklyWorkspaceContainer">
				<div id="blockly"></div>
				<div id="blocklyMask"></div>
			  </td>
			  <td width="50%">
				<table id="blocklyPreviewContainer">
				  <tr>
					<td height="30%">
					  <div id="preview"></div>
					</td>
				  </tr>
				  <tr>
					<td height="5%">
					  <h3>Block Definition:
						<!-- TODO(#1268): Separate concerns of format and editable.
						  -               Add "Editable" state toggle button? -->
						<select id="format">
						  <option value="JSON">JSON</option>
						  <option value="JavaScript">JavaScript</option>
						  <option value="Manual-JSON">Manual JSON&hellip;</option>
						  <script>
							// Manual JavaScript works but requires use of eval().
							// TODO(#1269): Replace eval() with JS-Interpreter before
							//              re-enabling "Manual JavaScript" mode.
							if (document.location.href.indexOf('file://') === 0) {
							  document.write(
								  '<option value="Manual-JS">Manual JavaScript&hellip;</option>');
							}
						  </script>
						</select>
					  </h3>
					</td>
				  </tr>
				  <tr>
					<td height="30%">
					  <pre id="languagePre" class="prettyprint lang-js"></pre>
					  <textarea id="languageTA"></textarea>
					</td>
				  </tr>
				  <tr>
					<td height="5%">
					  <h3>Generator stub:
						<select id="language">
						  <option value="JavaScript">JavaScript</option>
						  <option value="Python">Python</option>
						  <option value="PHP">PHP</option>
						  <option value="Lua">Lua</option>
						  <option value="Dart">Dart</option>
						</select>
					  </h3>
					</td>
				  </tr>
				  <tr>
					<td height="30%">
					  <pre id="generatorPre" class="prettyprint lang-js"></pre>
					</td>
				  </tr>
				</table>
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
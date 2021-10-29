import * as vscode from 'vscode';
import * as fs from 'fs';
import EditSelectedCode from './EditSelectedCode';

function transformTo(textEditor: vscode.TextEditor) {
	const editSelected = new EditSelectedCode(textEditor);
	editSelected.generate((fileName, newWholeCode) => {
		fs.writeFile(fileName, newWholeCode, (err: any) => {
			if (err) return;
			// vscode.window.showInformationMessage(`已转为${type}`, '好的');
		});
	}, () => {
		// vscode.window.showInformationMessage('没有需要转换的代码.', '好的')
	});
}

export function activate(context: vscode.ExtensionContext) {
	const JCSS = vscode.commands.registerCommand('main.JCSS',
		async (uri: vscode.Uri) => {
			const textEditor = vscode.window.activeTextEditor;
			textEditor && transformTo(textEditor);
		}
	);
	context.subscriptions.push(JCSS);
}
export function deactivate() { }

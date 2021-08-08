import * as vscode from 'vscode';
import * as fs from 'fs';

interface Attribute {
	value: string;
	startAt: number;
	endAt: number;
}

const externals = ['family'];

function stringSplice(this: string, start: number, end: number, newString: string) {
	return this.slice(0, start).concat(newString, this.slice(end));
}

function matchCSS(selectedCode: string) {
	let matched;
	let matcher = (/[\w|-]*:.*[,|;]?/g);
	let attributes = [];
	while ((matched = matcher.exec(selectedCode)) !== null) {
		attributes.push({
			value: matched[0],
			startAt: matched.index,
			endAt: matched.index + matched[0].length
		});
	}
	return attributes;
}

function toJSS(selectedCode: string, attributes: Attribute[]) {
	for (let i = attributes.length - 1; i >= 0; i--) {
		const item = attributes[i];
		let [key, value] = item.value.split(':');
		key = (() => {
			if (!/-/g.test(key)) { return key; }
			const keyArr = key.split('-');
			return keyArr.map((item, index) => {
				if (item && index) {
					const fc = item.slice(0, 1);
					const bc = item.slice(1);
					return fc.toUpperCase() + bc;
				}
				else {
					return item;
				}
			}).join('');
		})();
		value = value.trim().replace(/"/g, "'").replace(/[;|,]$/, '');
		selectedCode = stringSplice.call(selectedCode, item.startAt, item.endAt, `${key}:"${value}",`);
	}
	return selectedCode;
}

function matchJSS(selectedCode: string) {
	let matched;
	let matcher = (/(\w+):\s*["|'][\w|\s]+["|'][,|;]?/g);
	let attributes = [];
	while ((matched = matcher.exec(selectedCode)) !== null) {
		attributes.push({
			value: matched[0],
			startAt: matched.index,
			endAt: matched.index + matched[0].length
		});
	}
	return attributes;
}

function toCSS(selectedCode: string, attributes: Attribute[]) {
	for (let i = attributes.length - 1; i >= 0; i--) {
		const item = attributes[i];
		let [key, value] = item.value.split(':');
		if (externals.includes(key)) continue;
		key = key.replace(/[A-Z]/g, (word) => {
			return '-' + word.toLowerCase();
		});
		value = value.trim().replace(/["|']/g, "").replace(/[;|,]$/, '');
		selectedCode = stringSplice.call(selectedCode, item.startAt, item.endAt, `${key}:${value};`);
	}
	return selectedCode;
}

export function activate(context: vscode.ExtensionContext) {
	const CSStoJSS = vscode.commands.registerCommand('main.CSStoJSS', async (uri: vscode.Uri) => {
		const textEditor = vscode.window.activeTextEditor;
		if (!textEditor) return;
		const document = textEditor.document,
			selection = textEditor.selection;
		const fileName = document.fileName,
			wholeCode = document.getText();
		let selectedCode = document.getText(new vscode.Range(selection.start, selection.end));
		const selectedCodeStartAt = wholeCode.indexOf(selectedCode),
			selectedCodeEndAt = selectedCodeStartAt + selectedCode.length;

		let attributes = matchCSS(selectedCode);
		if (selectedCode && attributes && attributes.length) {
			selectedCode = toJSS(selectedCode, attributes);
		} else {
			vscode.window.showInformationMessage('没有需要转换的代码.', '好的');
			return;
		};
		const newWholeCode = stringSplice.call(wholeCode, selectedCodeStartAt, selectedCodeEndAt, selectedCode);
		fs.writeFile(fileName, newWholeCode, (err: any) => {
			if (err) {
				console.warn('failed');
			}
			vscode.window.showInformationMessage('已转为JSS', '好的');
		});
	});
	const JSStoCSS = vscode.commands.registerCommand('main.JSStoCSS', async (uri: vscode.Uri) => {
		const textEditor = vscode.window.activeTextEditor;
		if (!textEditor) return;
		const document = textEditor.document,
			selection = textEditor.selection;
		const fileName = document.fileName,
			wholeCode = document.getText();
		let selectedCode = document.getText(new vscode.Range(selection.start, selection.end));
		const selectedCodeStartAt = wholeCode.search(selectedCode),
			selectedCodeEndAt = selectedCodeStartAt + selectedCode.length;

		let attributes = matchJSS(selectedCode);
		if (selectedCode && attributes && attributes.length) {
			selectedCode = toCSS(selectedCode, attributes);
		} else {
			vscode.window.showInformationMessage('没有需要转换的代码.', '好的');
			return;
		};
		const newWholeCode = stringSplice.call(wholeCode, selectedCodeStartAt, selectedCodeEndAt, selectedCode);
		fs.writeFile(fileName, newWholeCode, (err: any) => {
			if (err) {
				console.warn('failed');
			}
			vscode.window.showInformationMessage('已转为CSS', '好的');
		});
	});
	context.subscriptions.push(CSStoJSS, JSStoCSS);
}
export function deactivate() { }

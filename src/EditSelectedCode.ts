import * as vscode from 'vscode';

interface SheetBlock {
  value: string; // 代码快
  startAt: number; // 起点
  endAt: number; // 终点
}

const externals = ['family'];

export default class EditSelectedCode {
  public activeTextEditor: vscode.TextEditor;
  private document: vscode.TextDocument; // 当前文件的文档（文档包含文件的代码信息、选中信息等）
  private fileName: string; // 当前文件的名字（其实是该文件的完整绝对路径）
  private wholeCode: string; // 当前文件的所有代码
  private selectedCodeStartAt: number; // 选中的代码在文件中的起点
  private selectedCodeEndAt: number; // 选中的代码在文件中的终点
  private selectedCode: string; // 选中的代码
  private cssMatcher = /(|\n| )([-a-z]+):([^;]*);/g; // 匹配css代码 简易版本
  // private cssMatcher = /(^|\n| )([-a-z]+):( *)([\w.\- (,+)%#]+)([;\n]?)/g; // 匹配css代码 复杂版本
  private jssMatchers = [/(|\n| )([a-zA-Z]+):( *)"(.*)",/g, /(|\n| )([a-zA-Z]+):([^,"']*),/g]; // 匹配jss代码 简易版本
  // private jssMatcher = /(^|\n| )([a-zA-Z]+):( *)(["'`]?[\w(, .%\-)]+["'`]?)([,;]?)/g; // 匹配jss代码 复杂版本
  private sheetBlocks: SheetBlock[] = [];
  // private specialAttrs = ['font-family'];
  constructor(activeTextEditor: vscode.TextEditor) {
    this.activeTextEditor = activeTextEditor;
    const document = this.document = activeTextEditor.document;
    const selection = activeTextEditor.selection; // 当前文件中的选中范围
    this.fileName = document.fileName;
    const wholeCode = this.wholeCode = document.getText();
    const selectedCode = this.selectedCode = document.getText(new vscode.Range(selection.start, selection.end));
    const selectedCodeStartAt = this.selectedCodeStartAt = wholeCode.indexOf(selectedCode);
    this.selectedCodeEndAt = selectedCodeStartAt + selectedCode.length;
  }

  stringSplice(this: string, start: number, end: number, newString: string) {
    return this.slice(0, start).concat(newString, this.slice(end));
  }

  match() {
    const type: "jss" | "css" = (() => {
      const jssSheets = (() => {
        let result: string[] = [];
        this.jssMatchers.forEach(matcher => {
          result = [...result, ...this.selectedCode.match(matcher) || []];
        });
        return result;
      })();
      const cssSheets = this.selectedCode.match(this.cssMatcher) || [];
      return jssSheets.length > cssSheets.length ? 'jss' : 'css';
    })();

    return (() => {
      this.sheetBlocks = [];
      if (type === 'jss') {
        this.jssMatchers.forEach(
          matcher =>
            this.matchWhile(matcher)
        );
      } else {
        this.matchWhile(this.cssMatcher);
      }
      return {
        type,
        value: this.sheetBlocks
      };
    })();
  }

  private matchWhile(matcher: RegExp) {
    let matched;
    while ((matched = matcher.exec(this.selectedCode)) !== null) {
      this.sheetBlocks.push({
        value: matched[0],
        startAt: matched.index,
        endAt: matched.index + matched[0].length
      });
    }
  }

  private transform(type: 'css' | 'jss') {
    const sheetBlocks = this.sheetBlocks;
    if (this.selectedCode && sheetBlocks && sheetBlocks.length) {
      return type === 'css'
        ? this.toJss(sheetBlocks)
        : this.toCss(sheetBlocks);
    }
    return false;
  }

  toCss(attributes: SheetBlock[]) {
    let newCode: string = this.selectedCode;
    for (let i = attributes.length - 1; i >= 0; i--) {
      const item = attributes[i];
      let [key, value] = item.value.split(':');
      if (externals.includes(key)) continue;
      key = key.replace(/[A-Z]/g, (word) => {
        return '-' + word.toLowerCase();
      });
      value = value
        .trim()
        .replace(/^("|')|("|')(?=,$)/g, "")
        .replace(/,$/, '');
      newCode = this.stringSplice.call(newCode, item.startAt, item.endAt, `${key}:${value};`);
    }
    return newCode;
  }

  toJss(attributes: SheetBlock[]) {
    let newCode: string = this.selectedCode;
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
      value = value.trim().replace(/"/g, "'").replace(/;$/, '');
      newCode = this.stringSplice.call(newCode, item.startAt, item.endAt, `${key}:"${value}",`);
    }
    return newCode;
  }

  generate(successCb: (fileName: string, newWholeCode: string) => void, failCb: () => void) {
    const wholeCode = this.wholeCode;
    const selectedCodeStartAt = this.selectedCodeStartAt;
    const selectedCodeEndAt = this.selectedCodeEndAt;
    const fileName = this.fileName;
    const match = this.match();
    const result = this.transform(match.type);

    if (result) {
      this.saveDocument(() => {
        const newWholeCode = this.stringSplice.call(
          wholeCode,
          selectedCodeStartAt,
          selectedCodeEndAt,
          result
        );
        successCb(fileName, newWholeCode);
      });
    } else failCb();
  }

  saveDocument(successCb: () => void) {
    this.document.save().then(() => successCb());
  }
}
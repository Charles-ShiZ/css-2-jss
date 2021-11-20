/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
const vscode = __webpack_require__(1);
const fs = __webpack_require__(2);
const EditSelectedCode_1 = __webpack_require__(3);
function transformTo(textEditor) {
    const editSelected = new EditSelectedCode_1.default(textEditor);
    editSelected.generate((fileName, newWholeCode) => {
        fs.writeFile(fileName, newWholeCode, (err) => {
            if (err)
                return;
            // vscode.window.showInformationMessage(`已转为${type}`, '好的');
        });
    }, () => {
        // vscode.window.showInformationMessage('没有需要转换的代码.', '好的')
    });
}
function activate(context) {
    const JCSS = vscode.commands.registerCommand('main.JCSS', (uri) => __awaiter(this, void 0, void 0, function* () {
        const textEditor = vscode.window.activeTextEditor;
        textEditor && transformTo(textEditor);
    }));
    context.subscriptions.push(JCSS);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("fs");

/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const vscode = __webpack_require__(1);
const externals = ['family'];
class EditSelectedCode {
    // private specialAttrs = ['font-family'];
    constructor(activeTextEditor) {
        this.cssMatcher = /(|\n| )([-a-z]+):([^;]*);/g; // 匹配css代码 简易版本
        // private cssMatcher = /(^|\n| )([-a-z]+):( *)([\w.\- (,+)%#]+)([;\n]?)/g; // 匹配css代码 复杂版本
        this.jssMatchers = [/(|\n| )([a-zA-Z]+):( *)"(.*)",/g, /(|\n| )([a-zA-Z]+):([^,"']*),/g]; // 匹配jss代码 简易版本
        // private jssMatcher = /(^|\n| )([a-zA-Z]+):( *)(["'`]?[\w(, .%\-)]+["'`]?)([,;]?)/g; // 匹配jss代码 复杂版本
        this.sheetBlocks = [];
        this.activeTextEditor = activeTextEditor;
        const document = this.document = activeTextEditor.document;
        const selection = activeTextEditor.selection; // 当前文件中的选中范围
        this.fileName = document.fileName;
        const wholeCode = this.wholeCode = document.getText();
        const selectedCode = this.selectedCode = document.getText(new vscode.Range(selection.start, selection.end));
        const selectedCodeStartAt = this.selectedCodeStartAt = wholeCode.indexOf(selectedCode);
        this.selectedCodeEndAt = selectedCodeStartAt + selectedCode.length;
    }
    stringSplice(start, end, newString) {
        return this.slice(0, start).concat(newString, this.slice(end));
    }
    match() {
        const type = (() => {
            const jssSheets = (() => {
                let result = [];
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
                this.jssMatchers.forEach(matcher => this.matchWhile(matcher));
            }
            else {
                this.matchWhile(this.cssMatcher);
            }
            return {
                type,
                value: this.sheetBlocks
            };
        })();
    }
    matchWhile(matcher) {
        let matched;
        while ((matched = matcher.exec(this.selectedCode)) !== null) {
            this.sheetBlocks.push({
                value: matched[0],
                startAt: matched.index,
                endAt: matched.index + matched[0].length
            });
        }
    }
    transform(type) {
        const sheetBlocks = this.sheetBlocks;
        if (this.selectedCode && sheetBlocks && sheetBlocks.length) {
            return type === 'css'
                ? this.toJss(sheetBlocks)
                : this.toCss(sheetBlocks);
        }
        return false;
    }
    toCss(attributes) {
        let newCode = this.selectedCode;
        for (let i = attributes.length - 1; i >= 0; i--) {
            const item = attributes[i];
            let [key, value] = item.value.split(':');
            if (externals.includes(key))
                continue;
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
    toJss(attributes) {
        let newCode = this.selectedCode;
        for (let i = attributes.length - 1; i >= 0; i--) {
            const item = attributes[i];
            let [key, value] = item.value.split(':');
            key = (() => {
                if (!/-/g.test(key)) {
                    return key;
                }
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
    generate(successCb, failCb) {
        const wholeCode = this.wholeCode;
        const selectedCodeStartAt = this.selectedCodeStartAt;
        const selectedCodeEndAt = this.selectedCodeEndAt;
        const fileName = this.fileName;
        const match = this.match();
        const result = this.transform(match.type);
        if (result) {
            this.saveDocument(() => {
                const newWholeCode = this.stringSplice.call(wholeCode, selectedCodeStartAt, selectedCodeEndAt, result);
                successCb(fileName, newWholeCode);
            });
        }
        else
            failCb();
    }
    saveDocument(successCb) {
        this.document.save().then(() => successCb());
    }
}
exports["default"] = EditSelectedCode;


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map
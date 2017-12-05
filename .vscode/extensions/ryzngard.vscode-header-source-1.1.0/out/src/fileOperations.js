"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
function findMatchedFileAsync(currentFileName) {
    let dir = path.dirname(currentFileName);
    let extension = path.extname(currentFileName);
    // If there's no extension, then nothing to do
    if (!extension) {
        return;
    }
    let fileWithoutExtension = path.basename(currentFileName).replace(extension, '');
    // Determine if the file is a header or source file.
    let extensions = null;
    let cfg = vscode.workspace.getConfiguration('headerSourceSwitch');
    let mappings = cfg.get('mappings');
    for (let i = 0; i < mappings.length; i++) {
        let mapping = mappings[i];
        if (mapping.header.indexOf(extension) != -1) {
            extensions = mapping.source;
        }
        else if (mapping.source.indexOf(extension) != -1) {
            extensions = mapping.header;
        }
        if (extensions) {
            console.log("Detected extension using map: " + mapping.name);
            break;
        }
    }
    if (!extensions) {
        console.log("No matching extension found");
        return;
    }
    let extRegex = "(\\" + extensions.join("|\\") + ")$";
    let newFileName = fileWithoutExtension;
    let found = false;
    // Search the current directory for a matching file
    let filesInDir = fs.readdirSync(dir).filter((value, index, array) => {
        return (path.extname(value).match(extRegex) != undefined);
    });
    for (var i = 0; i < filesInDir.length; i++) {
        let fileName = filesInDir[i];
        let match = fileName.match(fileWithoutExtension + extRegex);
        if (match) {
            found = true;
            newFileName = match[0];
            break;
        }
    }
    if (found) {
        let newFile = path.join(dir, newFileName);
        return new Promise((resolve, reject) => {
            resolve(newFile);
        });
    }
    else {
        return new Promise((resolve, reject) => {
            let promises = new Array();
            extensions.forEach(ext => {
                promises.push(new Promise((resolve, reject) => {
                    vscode.workspace.findFiles('**/' + fileWithoutExtension + ext).then((uris) => {
                        resolve(uris);
                    });
                }));
            });
            Promise.all(promises).then((values) => {
                let resolved = false;
                if (values.length == 0) {
                    resolve(null);
                    return;
                }
                values = values.filter((value) => {
                    return value && value.length > 0;
                });
                // flatten the values to a single array
                let filePaths = [].concat.apply([], values);
                filePaths = filePaths.map((uri, index) => {
                    return path.normalize(uri.fsPath);
                });
                // Try to order the filepaths based on closeness to original file
                filePaths.sort((a, b) => {
                    let aRelative = path.relative(currentFileName, a);
                    let bRelative = path.relative(currentFileName, b);
                    let aDistance = aRelative.split(path.sep).length;
                    let bDistance = bRelative.split(path.sep).length;
                    return aDistance - bDistance;
                });
                if (filePaths && filePaths.length > 0) {
                    resolve(filePaths[0]);
                }
                else {
                    reject('no paths matching');
                }
            });
        });
    }
}
exports.findMatchedFileAsync = findMatchedFileAsync;
//# sourceMappingURL=fileOperations.js.map
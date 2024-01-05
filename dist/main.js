"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_process_1 = require("node:process");
const readline = __importStar(require("node:readline/promises"));
const fs = __importStar(require("fs"));
const handlebars_1 = __importDefault(require("handlebars"));
async function main() {
    const rl = readline.createInterface({ input: node_process_1.stdin, output: node_process_1.stdout });
    const commandName = await rl.question("Command name: ");
    if (commandName === "") {
        console.log("Cancelled");
        (0, node_process_1.exit)();
    }
    const args = process.argv.slice(2);
    const configJson = args[0];
    const currentDirectory = process.cwd();
    const configs = JSON.parse(fs.readFileSync(configJson, "utf8"));
    for (const config of configs) {
        if (config.type === "patch") {
            const targetFilePath = currentDirectory + config.target;
            patchFile(targetFilePath, commandName);
        }
        else if (config.type === "template") {
            const targetDirPath = currentDirectory + config.target;
            const templateFilePath = currentDirectory + config.template;
            templateFile(targetDirPath, templateFilePath, commandName);
        }
    }
    (0, node_process_1.exit)();
}
main();
function patchFile(targetFilePath, commandName) {
    const codegenTag = "codegen:";
    const begincodegenTag = "begincodegen:";
    const endcodegenTag = "endcodegen:";
    const templateData = makeTemplateData(commandName);
    const fileContent = fs.readFileSync(targetFilePath, "utf8");
    const lines = fileContent.split("\n");
    let result = "";
    let codegenBlock = "";
    let begincodegenLine = "";
    let endcodegenLine = "";
    let isInCodegenBlock = false;
    for (const line of lines) {
        const codegenIndex = line.indexOf(codegenTag);
        const begincodegenIndex = line.indexOf(begincodegenTag);
        const endcodegenIndex = line.indexOf(endcodegenTag);
        if (codegenIndex !== -1) {
            if (begincodegenIndex === -1 && endcodegenIndex === -1) {
                const j = codegenIndex + codegenTag.length;
                const template = line.substring(j).trim();
                const leadingSpace = line.substring(0, line.indexOf(line.trim()[0]));
                const spaceCount = leadingSpace.length;
                result +=
                    " ".repeat(spaceCount) +
                        handlebars_1.default.compile(template)(templateData) +
                        "\n";
            }
        }
        if (begincodegenIndex !== -1) {
            isInCodegenBlock = true;
            begincodegenLine = line;
            codegenBlock = "";
        }
        if (endcodegenIndex !== -1) {
            isInCodegenBlock = false;
            endcodegenLine = line;
            result += handlebars_1.default.compile(codegenBlock)(templateData).trimEnd() + "\n";
            result += begincodegenLine + "\n";
            result += codegenBlock.trimEnd() + "\n";
            result += endcodegenLine + "\n";
        }
        if (begincodegenIndex === -1 && endcodegenIndex === -1) {
            codegenBlock += line + "\n";
            if (isInCodegenBlock === false) {
                result += line + "\n";
            }
        }
    }
    fs.writeFileSync(targetFilePath, result.trim(), {
        encoding: "utf8",
    });
}
function templateFile(targetDirPath, templateFilePath, commandName) {
    const templateData = makeTemplateData(commandName);
    const filename = templateFilePath.split("/").pop();
    const targetFilePath = (targetDirPath + handlebars_1.default.compile(filename)(templateData)).replace(".template", "");
    const templateFileText = fs.readFileSync(templateFilePath, "utf8");
    const targetFileText = handlebars_1.default.compile(templateFileText)(templateData);
    fs.writeFileSync(targetFilePath, targetFileText, {
        encoding: "utf8",
    });
}
function makeTemplateData(commandName) {
    const upperCaseCommandName = commandName.charAt(0).toUpperCase() + commandName.slice(1);
    const lowerCaseCommandName = commandName.charAt(0).toLowerCase() + commandName.slice(1);
    return {
        Name: upperCaseCommandName,
        name: lowerCaseCommandName,
    };
}

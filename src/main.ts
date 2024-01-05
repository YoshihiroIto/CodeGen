import { exit, stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import * as fs from "fs";
import Handlebars from "handlebars";

async function main() {
  const rl = readline.createInterface({ input, output });
  const commandName = await rl.question("Command name: ");
  if (commandName === "") {
    console.log("Cancelled");
    exit();
  }

  const args = process.argv.slice(2);
  const configJson = args[0];
  const currentDirectory = process.cwd();

  const configs = JSON.parse(fs.readFileSync(configJson, "utf8")) as Config[];

  for (const config of configs) {
    if (config.type === "patch") {
      const targetFilePath = currentDirectory + config.target;
      patchFile(targetFilePath, commandName);
    } else if (config.type === "template") {
      const targetDirPath = currentDirectory + config.target;
      const templateFilePath = currentDirectory + config.template;
      templateFile(targetDirPath, templateFilePath, commandName);
    }
  }

  exit();
}

main();

//-------------------------------------------------------------------------------

interface Config {
  type: string;
  target: string;
  template: string;
}

function patchFile(targetFilePath: string, commandName: string) {
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
          Handlebars.compile(template)(templateData) +
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

      result += Handlebars.compile(codegenBlock)(templateData).trimEnd() + "\n";
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

function templateFile(
  targetDirPath: string,
  templateFilePath: string,
  commandName: string,
) {
  const templateData = makeTemplateData(commandName);

  const filename = templateFilePath.split("/").pop();
  const targetFilePath = (
    targetDirPath + Handlebars.compile(filename)(templateData)
  ).replace(".template", "");

  const templateFileText = fs.readFileSync(templateFilePath, "utf8");
  const targetFileText = Handlebars.compile(templateFileText)(templateData);

  fs.writeFileSync(targetFilePath, targetFileText, {
    encoding: "utf8",
  });
}

function makeTemplateData(commandName: string) {
  const upperCaseCommandName =
    commandName.charAt(0).toUpperCase() + commandName.slice(1);
  const lowerCaseCommandName =
    commandName.charAt(0).toLowerCase() + commandName.slice(1);

  return {
    Name: upperCaseCommandName,
    name: lowerCaseCommandName,
  };
}

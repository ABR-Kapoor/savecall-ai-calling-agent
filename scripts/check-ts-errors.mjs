import ts from 'typescript';

const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './');

const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
const diagnostics = ts.getPreEmitDiagnostics(program);

const targetFile = 'insurance.functions.ts';
const fileDiags = diagnostics.filter(d => d.file && d.file.fileName.includes(targetFile));

console.log('Total diagnostics for insurance.functions.ts:', fileDiags.length);
fileDiags.forEach(d => {
  const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
  const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
  console.log(`Line ${line + 1}:${character + 1} [TS${d.code}] ${message}`);
});

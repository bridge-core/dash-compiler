var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
import { ProjectConfig } from "mc-project-core";
import { dirname, join } from "path-browserify";
class DashProjectConfig extends ProjectConfig {
  constructor(fileSystem, configPath) {
    super(dirname(configPath));
    this.fileSystem = fileSystem;
    this.configPath = configPath;
  }
  readConfig() {
    return this.fileSystem.readJson(this.configPath);
  }
  writeConfig(configJson) {
    return this.fileSystem.writeJson(this.configPath, configJson);
  }
}
function run(context) {
  return createRunner(context)(...Object.values(context.env));
}
function createRunner({ script, env, async = false }) {
  let transformedScript = transformScript(script);
  try {
    if (async)
      return new Function(...Object.keys(env), `return (async () => {
${transformedScript}
})()`);
    return new Function(...Object.keys(env), transformedScript);
  } catch (err) {
    console.error(script);
    throw new Error(`Error within script: ${err}`);
  }
}
function transformScript(script) {
  return script.replace(/export default /g, "module.exports = ").replace(/import\s+(\* as [a-z][a-z0-9]*|[a-z][a-z0-9]+|{[a-z\s][a-z0-9,\s]*})\s+from\s+["'](.+)["']/gi, (_, imports, moduleName) => {
    if (imports.startsWith(`* as `))
      imports = imports.replace("* as ", "");
    return `const ${imports} = await require('${moduleName}')`;
  });
}
class Plugin {
  constructor(plugin) {
    this.plugin = plugin;
  }
  runBuildStartHook() {
    var _a, _b;
    return (_b = (_a = this.plugin).buildStart) == null ? void 0 : _b.call(_a);
  }
  runIncludeHook() {
    var _a, _b;
    return (_b = (_a = this.plugin).include) == null ? void 0 : _b.call(_a);
  }
  runTransformPathHook(filePath) {
    var _a, _b;
    return (_b = (_a = this.plugin).transformPath) == null ? void 0 : _b.call(_a, filePath);
  }
  runReadHook(filePath, fileHandle) {
    var _a, _b;
    return (_b = (_a = this.plugin).read) == null ? void 0 : _b.call(_a, filePath, fileHandle);
  }
  runLoadHook(filePath, fileContent) {
    var _a, _b;
    return (_b = (_a = this.plugin).load) == null ? void 0 : _b.call(_a, filePath, fileContent);
  }
  runRegisterAliasesHook(filePath, fileContent) {
    var _a, _b;
    return (_b = (_a = this.plugin).registerAliases) == null ? void 0 : _b.call(_a, filePath, fileContent);
  }
  runRequireHook(filePath, fileContent) {
    var _a, _b;
    return (_b = (_a = this.plugin).require) == null ? void 0 : _b.call(_a, filePath, fileContent);
  }
  runTransformHook(filePath, fileContent, dependencies) {
    var _a, _b;
    return (_b = (_a = this.plugin).transform) == null ? void 0 : _b.call(_a, filePath, fileContent, dependencies);
  }
  runFinalizeBuildHook(filePath, fileContent) {
    var _a, _b;
    return (_b = (_a = this.plugin).finalizeBuild) == null ? void 0 : _b.call(_a, filePath, fileContent);
  }
  runBuildEndHook() {
    var _a, _b;
    return (_b = (_a = this.plugin).buildEnd) == null ? void 0 : _b.call(_a);
  }
}
const SimpleRewrite = ({
  options,
  outputFileSystem,
  hasComMojangDirectory,
  projectConfig,
  projectRoot
}) => {
  var _a;
  if (!options.buildName)
    options.buildName = options.mode === "development" ? "dev" : "dist";
  if (!options.packName)
    options.packName = "Bridge";
  if (!((_a = options.rewriteToComMojang) != null ? _a : true))
    hasComMojangDirectory = false;
  const folders = {
    BP: "development_behavior_packs",
    RP: "development_resource_packs",
    SP: "skin_packs",
    WT: "minecraftWorlds"
  };
  const pathPrefix = (pack) => hasComMojangDirectory && options.mode === "development" ? `${folders[pack]}` : `${projectRoot}/builds/${options.buildName}`;
  const pathPrefixWithPack = (pack) => `${pathPrefix(pack)}/${options.packName} ${pack}`;
  return {
    async buildStart() {
      if (options.mode === "production" || options.restartDevServer) {
        if (hasComMojangDirectory) {
          for (const pack in folders) {
            await outputFileSystem.unlink(pathPrefixWithPack(pack)).catch(() => {
            });
            await outputFileSystem.mkdir(pathPrefixWithPack(pack));
          }
        } else {
          await outputFileSystem.unlink(pathPrefix("BP")).catch(() => {
          });
        }
      }
    },
    transformPath(filePath) {
      if (!filePath)
        return;
      if (filePath.includes("BP/scripts/gametests/") && options.mode === "production")
        return;
      const pathParts = filePath.split("/");
      const pack = pathParts.shift();
      if (["BP", "RP", "SP", "WT"].includes(pack))
        return `${pathPrefixWithPack(pack)}/${pathParts.join("/")}`;
    }
  };
};
class AllPlugins {
  constructor(dash) {
    this.dash = dash;
    this.plugins = [];
  }
  async loadPlugins(scriptEnv = {}) {
    var _a, _b, _c;
    const extensions = [
      ...(await this.dash.fileSystem.readdir(join(this.dash.projectRoot, ".bridge/extensions")).catch(() => [])).map((entry) => entry.kind === "directory" ? join(this.dash.projectRoot, ".bridge/extensions", entry.name) : void 0),
      ...(await this.dash.fileSystem.readdir("extensions").catch(() => [])).map((entry) => entry.kind === "directory" ? join("extensions", entry.name) : void 0)
    ];
    const plugins = {
      simpleRewrite: SimpleRewrite.toString()
    };
    for (const extension of extensions) {
      if (!extension)
        continue;
      let manifest;
      try {
        manifest = await this.dash.fileSystem.readJson(join(extension, "manifest.json"));
      } catch {
        continue;
      }
      if (!((_a = manifest == null ? void 0 : manifest.compiler) == null ? void 0 : _a.plugins))
        continue;
      for (const pluginId in manifest.compiler.plugins) {
        plugins[pluginId] = join(extension, manifest.compiler.plugins[pluginId]);
      }
    }
    const compilerPlugins = (_c = (_b = this.dash.projectConfig.get().compiler) == null ? void 0 : _b.plugins) != null ? _c : [];
    const pluginOptsMap = {};
    for (const pluginName in plugins) {
      const currentPlugin = compilerPlugins.find((p) => typeof p === "string" ? p === pluginName : p[0] === pluginName);
      if (currentPlugin)
        pluginOptsMap[plugins[pluginName]] = typeof currentPlugin === "string" ? {} : currentPlugin[1];
      else
        console.warn(`Missing plugin with name ${pluginName}`);
    }
    for (const pluginPath in pluginOptsMap) {
      const pluginSrc = pluginPath.startsWith("/") ? await this.dash.fileSystem.readFile(pluginPath).then((file) => file.text()) : pluginPath;
      const module = {};
      await run({
        async: true,
        script: pluginSrc,
        env: __spreadValues({
          require: void 0,
          module
        }, scriptEnv)
      });
      if (typeof module.exports === "function")
        this.plugins.push(new Plugin(module.exports({
          options: __spreadValues({
            mode: this.dash.getMode()
          }, pluginOptsMap[pluginPath]),
          fileSystem: this.dash.fileSystem,
          outputFileSystem: this.dash.outputFileSystem,
          projectConfig: this.dash.projectConfig,
          projectRoot: this.dash.projectRoot,
          targetVersion: this.dash.projectConfig.get().targetVersion,
          getAliases: (filePath) => {
            var _a2, _b2;
            return [
              ...(_b2 = (_a2 = this.dash.includedFiles.get(filePath)) == null ? void 0 : _a2.aliases) != null ? _b2 : []
            ];
          },
          hasComMojangDirectory: this.dash.fileSystem !== this.dash.outputFileSystem,
          compileFiles: (filePaths) => this.dash.compileVirtualFiles(filePaths)
        })));
    }
  }
  async runBuildStartHooks() {
    for (const plugin of this.plugins) {
      await plugin.runBuildStartHook();
    }
  }
  async runIncludeHooks() {
    let includeFiles = [];
    for (const plugin of this.plugins) {
      const filesToInclude = await plugin.runIncludeHook();
      if (Array.isArray(filesToInclude))
        includeFiles.push(...filesToInclude);
    }
    return includeFiles;
  }
  async runTransformPathHooks(filePath) {
    let currentFilePath = filePath;
    for (const plugin of this.plugins) {
      const newPath = plugin.runTransformPathHook(currentFilePath);
      if (newPath === null)
        return null;
      else if (newPath !== void 0)
        currentFilePath = newPath;
    }
    return currentFilePath;
  }
  async runReadHooks(filePath, fileHandle) {
    for (const plugin of this.plugins) {
      const data = await plugin.runReadHook(filePath, fileHandle);
      if (data !== null && data !== void 0)
        return data;
    }
  }
  async runLoadHooks(filePath, readData) {
    let data = readData;
    for (const plugin of this.plugins) {
      const tmp = await plugin.runLoadHook(filePath, data);
      if (tmp === void 0)
        continue;
      data = tmp;
    }
    return data;
  }
  async runRegisterAliasesHooks(filePath, data) {
    const aliases = new Set();
    for (const plugin of this.plugins) {
      const tmp = await plugin.runRegisterAliasesHook(filePath, data);
      if (tmp === void 0 || tmp === null)
        continue;
      if (Array.isArray(tmp))
        tmp.forEach((alias) => aliases.add(alias));
      else
        aliases.add(tmp);
    }
    return aliases;
  }
  async runRequireHooks(filePath, data) {
    const requiredFiles = new Set();
    for (const plugin of this.plugins) {
      const tmp = await plugin.runRequireHook(filePath, data);
      if (tmp === void 0 || tmp === null)
        continue;
      if (Array.isArray(tmp))
        tmp.forEach((file) => requiredFiles.add(file));
      else
        requiredFiles.add(tmp);
    }
    return requiredFiles;
  }
  async runTransformHooks(file) {
    const dependencies = Object.fromEntries([...file.requiredFiles].map((fileId) => [
      fileId,
      this.dash.includedFiles.get(fileId)
    ]));
    let transformedData = file.data;
    for (const plugin of this.plugins) {
      const tmpData = await plugin.runTransformHook(file.filePath, transformedData, dependencies);
      if (tmpData === void 0)
        continue;
      transformedData = tmpData;
    }
    return transformedData;
  }
  async runFinalizeBuildHooks(file) {
    for (const plugin of this.plugins) {
      const finalizedData = await plugin.runFinalizeBuildHook(file.filePath, file.data);
      if (finalizedData !== void 0 && finalizedData !== null)
        return finalizedData;
    }
  }
  async runBuildEndHooks() {
    for (const plugin of this.plugins) {
      await plugin.runBuildEndHook();
    }
  }
}
class DashFile {
  constructor(dash, filePath) {
    this.dash = dash;
    this.filePath = filePath;
    this.isDone = false;
    this.requiredFiles = new Set();
    this.aliases = new Set();
    this.outputPath = filePath;
    this.fileHandle = {
      getFile: () => this.dash.fileSystem.readFile(filePath)
    };
  }
  setOutputPath(outputPath) {
    this.outputPath = outputPath;
  }
  setReadData(data) {
    this.data = data;
  }
  setAliases(aliases) {
    for (const alias of aliases)
      this.dash.includedFiles.addAlias(alias, this);
    this.aliases = aliases;
  }
  setRequiredFiles(requiredFiles) {
    this.requiredFiles = requiredFiles;
  }
  async processAfterLoad() {
    if (this.data === null || this.data === void 0) {
      this.isDone = true;
      if (this.filePath !== this.outputPath && this.outputPath !== null) {
        await this.dash.fileSystem.readFile(this.filePath);
      }
    }
  }
}
class IncludedFiles {
  constructor(dash) {
    this.dash = dash;
    this.files = [];
    this.aliases = new Map();
  }
  all() {
    return this.files;
  }
  filtered(cb) {
    return this.files.filter((file) => cb(file));
  }
  setFiltered(cb) {
    this.files = this.filtered(cb);
  }
  get(fileId) {
    var _a;
    return (_a = this.aliases.get(fileId)) != null ? _a : this.files.find((file) => file.filePath === fileId);
  }
  addAlias(alias, DashFile2) {
    this.aliases.set(alias, DashFile2);
  }
  async loadAll() {
    const allFiles = new Set();
    const packPaths = this.dash.projectConfig.getAvailablePackPaths();
    for (const packPath of packPaths) {
      const files = await this.dash.fileSystem.allFiles(packPath);
      for (const file of files)
        allFiles.add(file);
    }
    const includeFiles = await this.dash.plugins.runIncludeHooks();
    for (const file of includeFiles)
      allFiles.add(file);
    this.files = Array.from(allFiles).map((filePath) => new DashFile(this.dash, filePath));
  }
}
class LoadFiles {
  constructor(dash) {
    this.dash = dash;
  }
  async run() {
    var _a;
    for (const file of this.dash.includedFiles.all()) {
      const [outputPath, readData] = await Promise.all([
        this.dash.plugins.runTransformPathHooks(file.filePath),
        this.dash.plugins.runReadHooks(file.filePath, file.fileHandle)
      ]);
      file.setOutputPath(outputPath);
      file.setReadData(readData);
      await file.processAfterLoad();
    }
    for (const file of this.dash.includedFiles.all()) {
      if (file.isDone)
        continue;
      file.setReadData((_a = await this.dash.plugins.runLoadHooks(file.filePath, file.data)) != null ? _a : file.data);
      const [aliases, requiredFiles] = await Promise.all([
        this.dash.plugins.runRegisterAliasesHooks(file.filePath, file.data),
        this.dash.plugins.runRequireHooks(file.filePath, file.data)
      ]);
      file.setAliases(aliases);
      file.setRequiredFiles(requiredFiles);
    }
  }
}
class ResolveFileOrder {
  constructor(dash) {
    this.dash = dash;
  }
  run() {
    const resolved = new Set();
    for (const file of this.dash.includedFiles.all()) {
      if (file.isDone || resolved.has(file))
        continue;
      this.resolve(file, resolved, new Set());
    }
    return resolved;
  }
  resolve(file, resolved, unresolved) {
    const files = this.dash.includedFiles;
    unresolved.add(file);
    for (const depFileId of file.requiredFiles) {
      const depFile = files.get(depFileId);
      if (!depFile)
        throw new Error(`Undefined file dependency: "${file.filePath}" requires "${depFileId}"`);
      if (!resolved.has(depFile)) {
        if (unresolved.has(depFile))
          throw new Error("Circular dependency detected!");
        this.resolve(depFile, resolved, unresolved);
      }
    }
    resolved.add(file);
    unresolved.delete(file);
  }
}
function isWritableData(data) {
  return typeof data === "string" || data instanceof Blob || data instanceof File || data instanceof ArrayBuffer || (data == null ? void 0 : data.buffer) instanceof ArrayBuffer;
}
class FileTransformer {
  constructor(dash) {
    this.dash = dash;
  }
  async run(resolvedFileOrder) {
    var _a, _b;
    for (const file of resolvedFileOrder) {
      const transformedData = await this.dash.plugins.runTransformHooks(file);
      (_a = file.data) != null ? _a : file.data = transformedData;
      let writeData = (_b = await this.dash.plugins.runFinalizeBuildHooks(file)) != null ? _b : transformedData;
      if (writeData !== void 0 && writeData !== void 0) {
        if (!isWritableData(writeData)) {
          console.warn(`File "${file.filePath}" was not in a writable format: "${typeof writeData}". Trying to JSON.stringify(...) it...`, writeData);
          writeData = JSON.stringify(writeData);
        }
        await this.dash.outputFileSystem.writeFile(file.filePath, writeData);
      }
      file.isDone = true;
    }
  }
}
class Dash {
  constructor(fileSystem, outputFileSystem = fileSystem, options = {
    mode: "development",
    config: "config.json"
  }) {
    this.fileSystem = fileSystem;
    this.outputFileSystem = outputFileSystem;
    this.options = options;
    this.plugins = new AllPlugins(this);
    this.includedFiles = new IncludedFiles(this);
    this.loadFiles = new LoadFiles(this);
    this.fileOrderResolver = new ResolveFileOrder(this);
    this.fileTransformer = new FileTransformer(this);
    this.projectRoot = dirname(options.config);
    this.projectConfig = new DashProjectConfig(fileSystem, options.config);
  }
  getMode() {
    return this.options.mode;
  }
  async setup() {
    await this.projectConfig.setup();
    await this.plugins.loadPlugins(this.options.pluginEnvironment);
  }
  get isCompilerActivated() {
    var _a;
    return !!this.projectConfig.get().compiler || !Array.isArray((_a = this.projectConfig.get().compiler) == null ? void 0 : _a.plugins);
  }
  async build() {
    console.log("Starting compilation...");
    if (!this.isCompilerActivated)
      return;
    const startTime = Date.now();
    await this.plugins.runBuildStartHooks();
    await this.includedFiles.loadAll();
    await this.loadFiles.run();
    const resolvedFileOrder = this.fileOrderResolver.run();
    console.log(resolvedFileOrder);
    await this.plugins.runBuildEndHooks();
    console.log(`Dash compiled ${this.includedFiles.all().length} files in ${Date.now() - startTime}ms!`);
  }
  async compileVirtualFiles(filePaths) {
  }
  async updateFiles(filePaths) {
  }
  async unlink(path) {
  }
  async rename(oldPath, newPath) {
  }
  watch() {
  }
}
class FileSystem {
  async allFiles(path) {
    const files = [];
    const entries = await this.readdir(path);
    for (const { name, kind } of entries) {
      if (kind === "directory") {
        files.push(...await this.allFiles(join(path, name)));
      } else if (kind === "file") {
        files.push(join(path, name));
      }
    }
    return files;
  }
  async writeJson(path, content, beautify = true) {
    await this.writeFile(path, JSON.stringify(content, null, beautify ? "	" : 0));
  }
  async readJson(path) {
    return JSON.parse(await this.readFile(path).then((file) => file.text()));
  }
  watchDirectory(path, onChange) {
    console.warn("Watching a directory for changes is not supported on this platform!");
  }
}
export { Dash, FileSystem };

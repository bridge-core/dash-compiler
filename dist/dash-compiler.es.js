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
class AllPlugins {
  constructor(dash) {
    this.dash = dash;
    this.plugins = [];
  }
  loadPlugins(plugins) {
    var _a, _b;
    const compilerPlugins = (_b = (_a = this.dash.projectConfig.get().compiler) == null ? void 0 : _a.plugins) != null ? _b : [];
    const pluginOptsMap = {};
    for (const pluginName in plugins) {
      const currentPlugin = compilerPlugins.find((p) => typeof p === "string" ? p === pluginName : p[0] === pluginName);
      if (currentPlugin)
        pluginOptsMap[plugins[pluginName]] = typeof currentPlugin === "string" ? {} : currentPlugin[1];
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
  }
  async runBuildEndHooks() {
    for (const plugin of this.plugins) {
      await plugin.runBuildEndHook();
    }
  }
}
class IncludedFiles {
  constructor(dash) {
    this.dash = dash;
    this.files = [];
  }
  all() {
    return this.files;
  }
  filtered(cb) {
    return this.files.filter(cb);
  }
  async loadAll() {
    const allFiles = new Set();
    const packPaths = this.dash.projectConfig.getAvailablePackPaths();
    for (const packPath of packPaths) {
      const files = await this.dash.fileSystem.allFiles(packPath);
      for (const file of files)
        allFiles.add(join(packPath, file));
    }
    const includeFiles = await this.dash.plugins.runIncludeHooks();
    for (const file of includeFiles)
      allFiles.add(file);
    this.files = Array.from(allFiles);
  }
}
class Dash {
  constructor(fileSystem, options) {
    this.fileSystem = fileSystem;
    this.options = options;
    this.plugins = new AllPlugins(this);
    this.includedFiles = new IncludedFiles(this);
    this.projectRoot = dirname(options.config);
    this.projectConfig = new DashProjectConfig(fileSystem, options.config);
  }
  async setup() {
    await this.projectConfig.setup();
  }
  get isCompilerActivated() {
    var _a;
    return !!this.projectConfig.get().compiler || !Array.isArray((_a = this.projectConfig.get().compiler) == null ? void 0 : _a.plugins);
  }
  async build() {
    if (!this.isCompilerActivated)
      return;
    await this.plugins.runBuildStartHooks();
    await this.includedFiles.loadAll();
    await this.plugins.runBuildEndHooks();
  }
  watch() {
  }
}
class FileSystem {
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
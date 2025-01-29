import { ProjectConfig } from "@bridge-editor/mc-project-core";
import { dirname, relative, join, basename } from "path-browserify";
import { CustomMolang, expressions, Molang } from "@bridge-editor/molang";
import { setObjectAt, deepMerge, hashString, get, tokenizeCommand, castType, isMatch } from "@bridge-editor/common-utils";
import json5 from "json5";
import initSwc, { transformSync } from "@swc/wasm-web";
import { loadedWasm, Runtime, initRuntimes as initRuntimes$1 } from "@bridge-editor/js-runtime";
import isGlob from "is-glob";
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
class Plugin {
  constructor(dash, pluginId, plugin) {
    this.dash = dash;
    this.pluginId = pluginId;
    this.plugin = plugin;
  }
  implementsHook(hookName) {
    return typeof this.plugin[hookName] === "function";
  }
  async runBuildStartHook() {
    var _a, _b;
    try {
      return await ((_b = (_a = this.plugin).buildStart) == null ? void 0 : _b.call(_a));
    } catch (err) {
      this.dash.console.error(`The plugin "${this.pluginId}" threw an error while running the "buildStart" hook:`, err);
    }
  }
  async runIncludeHook() {
    var _a, _b;
    try {
      return await ((_b = (_a = this.plugin).include) == null ? void 0 : _b.call(_a));
    } catch (err) {
      this.dash.console.error(`The plugin "${this.pluginId}" threw an error while running the "include" hook:`, err);
    }
  }
  async runIgnoreHook(filePath) {
    var _a, _b;
    try {
      return await ((_b = (_a = this.plugin).ignore) == null ? void 0 : _b.call(_a, filePath));
    } catch (err) {
      this.dash.console.error(`The plugin "${this.pluginId}" threw an error while running the "ignore" hook for "${filePath}":`, err);
    }
  }
  async runTransformPathHook(filePath) {
    var _a, _b;
    try {
      return await ((_b = (_a = this.plugin).transformPath) == null ? void 0 : _b.call(_a, filePath));
    } catch (err) {
      this.dash.console.error(`The plugin "${this.pluginId}" threw an error while running the "transformPath" hook for "${filePath}":`, err);
    }
  }
  async runReadHook(filePath, fileHandle) {
    var _a, _b;
    try {
      return await ((_b = (_a = this.plugin).read) == null ? void 0 : _b.call(_a, filePath, fileHandle));
    } catch (err) {
      this.dash.console.error(`The plugin "${this.pluginId}" threw an error while running the "read" hook for "${filePath}":`, err);
    }
  }
  async runLoadHook(filePath, fileContent) {
    var _a, _b;
    try {
      return await ((_b = (_a = this.plugin).load) == null ? void 0 : _b.call(_a, filePath, fileContent));
    } catch (err) {
      this.dash.console.error(`The plugin "${this.pluginId}" threw an error while running the "load" hook for "${filePath}":`, err);
    }
  }
  async runRegisterAliasesHook(filePath, fileContent) {
    var _a, _b;
    try {
      return await ((_b = (_a = this.plugin).registerAliases) == null ? void 0 : _b.call(_a, filePath, fileContent));
    } catch (err) {
      this.dash.console.error(`The plugin "${this.pluginId}" threw an error while running the "registerAliases" hook for "${filePath}":`, err);
    }
  }
  async runRequireHook(filePath, fileContent) {
    var _a, _b;
    try {
      return await ((_b = (_a = this.plugin).require) == null ? void 0 : _b.call(_a, filePath, fileContent));
    } catch (err) {
      this.dash.console.error(`The plugin "${this.pluginId}" threw an error while running the "require" hook for "${filePath}":`, err);
    }
  }
  async runTransformHook(filePath, fileContent, dependencies) {
    var _a, _b;
    try {
      return await ((_b = (_a = this.plugin).transform) == null ? void 0 : _b.call(_a, filePath, fileContent, dependencies));
    } catch (err) {
      this.dash.console.error(`The plugin "${this.pluginId}" threw an error while running the "transform" hook for "${filePath}":`, err);
    }
  }
  async runFinalizeBuildHook(filePath, fileContent) {
    var _a, _b;
    try {
      return await ((_b = (_a = this.plugin).finalizeBuild) == null ? void 0 : _b.call(_a, filePath, fileContent));
    } catch (err) {
      this.dash.console.error(`The plugin "${this.pluginId}" threw an error while running the "finalizeBuild" hook for "${filePath}":`, err);
    }
  }
  async runBuildEndHook() {
    var _a, _b;
    try {
      return await ((_b = (_a = this.plugin).buildEnd) == null ? void 0 : _b.call(_a));
    } catch (err) {
      this.dash.console.error(`The plugin "${this.pluginId}" threw an error while running the "buildEnd" hook:`, err);
    }
  }
  async runBeforeFileUnlinked(filePath) {
    var _a, _b;
    try {
      return await ((_b = (_a = this.plugin).beforeFileUnlinked) == null ? void 0 : _b.call(_a, filePath));
    } catch (err) {
      this.dash.console.error(`The plugin "${this.pluginId}" threw an error while running the "beforeFileUnlinked" hook for "${filePath}":`, err);
    }
  }
}
const SimpleRewrite = ({
  options,
  outputFileSystem,
  hasComMojangDirectory,
  projectConfig,
  projectRoot,
  packType
}) => {
  var _a;
  if (!options.buildName)
    options.buildName = options.mode === "development" ? "dev" : "dist";
  if (!options.packName)
    options.packName = "Bridge";
  if (!((_a = options.rewriteToComMojang) != null ? _a : true))
    hasComMojangDirectory = false;
  const folders = {
    behaviorPack: "development_behavior_packs",
    resourcePack: "development_resource_packs",
    skinPack: "skin_packs",
    worldTemplate: "minecraftWorlds"
  };
  const pathPrefix = (pack) => hasComMojangDirectory && options.mode === "development" ? `${folders[pack]}` : `${projectRoot}/builds/${options.buildName}`;
  const pathPrefixWithPack = (pack, suffix) => `${pathPrefix(pack)}/${options.packName} ${suffix}`;
  return {
    async buildStart() {
      if (options.mode === "production" || options.buildType === "fullBuild") {
        if (hasComMojangDirectory) {
          for (const packId in folders) {
            const pack = packType.getFromId(packId);
            if (!pack)
              continue;
            await outputFileSystem.unlink(pathPrefixWithPack(packId, pack.defaultPackPath)).catch(() => {
            });
          }
        } else {
          await outputFileSystem.unlink(pathPrefix("BP")).catch(() => {
          });
        }
      }
    },
    transformPath(filePath) {
      var _a2, _b;
      if (!filePath)
        return;
      if (filePath.includes("BP/scripts/gametests/") && options.mode === "production")
        return;
      const pack = packType == null ? void 0 : packType.get(filePath);
      if (!pack)
        return;
      const packRoot = projectConfig.getAbsolutePackRoot(pack.id);
      const relPath = relative(packRoot, filePath);
      if ([
        "behaviorPack",
        "resourcePack",
        "skinPack",
        "worldTemplate"
      ].includes(pack.id))
        return join(pathPrefixWithPack(pack.id, (_b = (_a2 = options.packNameSuffix) == null ? void 0 : _a2[pack.id]) != null ? _b : pack.defaultPackPath), relPath);
    }
  };
};
const MolangPlugin = async ({
  fileType,
  projectConfig,
  requestJsonData,
  options,
  console: console2,
  jsRuntime
}) => {
  const resolve = (packId, path) => projectConfig.resolvePackPath(packId, path);
  const customMolang = new CustomMolang({});
  const molangDirPaths = [
    projectConfig.resolvePackPath("behaviorPack", "molang"),
    projectConfig.resolvePackPath("resourcePack", "molang")
  ];
  const isMolangFile = (filePath) => filePath && molangDirPaths.some((path) => filePath.startsWith(`${path}/`)) && filePath.endsWith(".molang");
  const molangScriptPath = projectConfig.resolvePackPath("behaviorPack", "scripts/molang");
  const isMolangScript = (filePath) => filePath == null ? void 0 : filePath.startsWith(`${molangScriptPath}/`);
  const cachedPaths = /* @__PURE__ */ new Map();
  const loadMolangFrom = (filePath) => {
    if (cachedPaths.has(filePath))
      return cachedPaths.get(filePath);
    const molangLocs = options.include[fileType.getId(filePath)];
    cachedPaths.set(filePath, molangLocs);
    return molangLocs;
  };
  let astTransformers = [];
  return {
    async buildStart() {
      options.include = Object.assign(await requestJsonData("data/packages/minecraftBedrock/location/validMolang.json"), options.include);
      cachedPaths.clear();
    },
    ignore(filePath) {
      return !isMolangFile(filePath) && !isMolangScript(filePath) && !loadMolangFrom(filePath);
    },
    transformPath(filePath) {
      if (isMolangFile(filePath) || isMolangScript(filePath))
        return null;
    },
    async read(filePath, fileHandle) {
      if ((isMolangFile(filePath) || isMolangScript(filePath)) && fileHandle) {
        const file = await fileHandle.getFile();
        return await (file == null ? void 0 : file.text());
      } else if (loadMolangFrom(filePath) && filePath.endsWith(".json") && fileHandle) {
        const file = await fileHandle.getFile();
        if (!file)
          return;
        try {
          return json5.parse(await file.text());
        } catch (err) {
          if (options.buildType !== "fileRequest")
            console2.error(`Error within file "${filePath}": ${err}`);
          return {
            __error__: `Failed to load original file: ${err}`
          };
        }
      }
    },
    async load(filePath, fileContent) {
      if (isMolangFile(filePath) && fileContent) {
        customMolang.parse(fileContent);
      } else if (isMolangScript(filePath)) {
        const module = await jsRuntime.run(filePath, { console: console2 }, fileContent).catch((err) => {
          console2.error(`Failed to execute Molang AST script "${filePath}": ${err}`);
          return null;
        });
        if (!module)
          return null;
        if (typeof module.__default__ === "function")
          astTransformers.push(module.__default__);
      }
    },
    async require(filePath) {
      if (loadMolangFrom(filePath)) {
        return [
          resolve("behaviorPack", "scripts/molang/**/*.[jt]s"),
          resolve("behaviorPack", "molang/**/*.molang"),
          resolve("resourcePack", "molang/**/*.molang")
        ];
      }
    },
    async transform(filePath, fileContent) {
      const includePaths = loadMolangFrom(filePath);
      if (includePaths && includePaths.length > 0) {
        includePaths.forEach((includePath) => setObjectAt(includePath, fileContent, (molang) => {
          if (typeof molang !== "string")
            return molang;
          if (molang[0] === "/" || molang[0] === "@")
            return molang;
          if (astTransformers.length > 0) {
            let ast = null;
            try {
              ast = customMolang.parse(molang);
            } catch (err) {
              if (options.buildType !== "fileRequest")
                console2.error(`Error within file "${filePath}"; script "${molang}": ${err}`);
            }
            if (ast) {
              for (const transformer of astTransformers) {
                ast = ast.walk(transformer);
              }
              molang = ast.toString();
            }
          }
          try {
            return customMolang.transform(molang);
          } catch (err) {
            if (options.buildType !== "fileRequest")
              console2.error(`Error within file "${filePath}"; script "${molang}": ${err}`);
            return molang;
          }
        }));
      }
    },
    finalizeBuild(filePath, fileContent) {
      if (loadMolangFrom(filePath) && typeof fileContent !== "string")
        return JSON.stringify(fileContent, null, "	");
    },
    buildEnd() {
      astTransformers = [];
    }
  };
};
const EntityIdentifierAlias = ({ fileType }) => {
  return {
    ignore(filePath) {
      return (fileType == null ? void 0 : fileType.getId(filePath)) !== "entity";
    },
    registerAliases(filePath, fileContent) {
      var _a, _b, _c, _d;
      if ((fileType == null ? void 0 : fileType.getId(filePath)) === "entity" && ((_b = (_a = fileContent == null ? void 0 : fileContent["minecraft:entity"]) == null ? void 0 : _a.description) == null ? void 0 : _b.identifier))
        return [
          (_d = (_c = fileContent == null ? void 0 : fileContent["minecraft:entity"]) == null ? void 0 : _c.description) == null ? void 0 : _d.identifier
        ];
    }
  };
};
function compareVersions(v1, v2) {
  const n1 = validateAndParse(v1);
  const n2 = validateAndParse(v2);
  const p1 = n1.pop();
  const p2 = n2.pop();
  const r = compareSegments(n1, n2);
  if (r !== 0)
    return r;
  if (p1 && p2) {
    return compareSegments(p1.split("."), p2.split("."));
  } else if (p1 || p2) {
    return p1 ? -1 : 1;
  }
  return 0;
}
const compare = (v1, v2, operator) => {
  assertValidOperator(operator);
  const res = compareVersions(v1, v2);
  return operatorResMap[operator].includes(res);
};
const semver = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
const validateAndParse = (v) => {
  if (typeof v !== "string") {
    throw new TypeError("Invalid argument expected string");
  }
  const match = v.match(semver);
  if (!match) {
    throw new Error(`Invalid argument not valid semver ('${v}' received)`);
  }
  match.shift();
  return match;
};
const isWildcard = (s) => s === "*" || s === "x" || s === "X";
const tryParse = (v) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? v : n;
};
const forceType = (a, b) => typeof a !== typeof b ? [String(a), String(b)] : [a, b];
const compareStrings = (a, b) => {
  if (isWildcard(a) || isWildcard(b))
    return 0;
  const [ap, bp] = forceType(tryParse(a), tryParse(b));
  if (ap > bp)
    return 1;
  if (ap < bp)
    return -1;
  return 0;
};
const compareSegments = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const r = compareStrings(a[i] || 0, b[i] || 0);
    if (r !== 0)
      return r;
  }
  return 0;
};
const operatorResMap = {
  ">": [1],
  ">=": [0, 1],
  "=": [0],
  "<=": [-1, 0],
  "<": [-1]
};
const allowedOperators = Object.keys(operatorResMap);
const assertValidOperator = (op) => {
  if (typeof op !== "string") {
    throw new TypeError(`Invalid operator type, expected string but got ${typeof op}`);
  }
  if (allowedOperators.indexOf(op) === -1) {
    throw new Error(`Invalid operator, expected one of ${allowedOperators.join("|")}`);
  }
};
const v1Compat$1 = (v1CompatModule, fileType) => ({
  register: (componentClass) => {
    var _a;
    if (((_a = componentClass.type) != null ? _a : "entity") !== fileType)
      return;
    v1CompatModule.component = ({ name, schema, template }) => {
      const component = new componentClass();
      name(componentClass.component_name);
      schema(transformV1AutoCompletions(Object.values(component.onPropose())[0]));
      template((componentArgs, { create }) => {
        create(component.onApply(componentArgs, "components")[`minecraft:${fileType}`]);
      });
    };
  }
});
function transformV1AutoCompletions(completions) {
  const v2Completions = {};
  const keys = Object.keys(completions);
  if (keys.length === 1 && keys[0].startsWith("$dynamic.list.")) {
    return {
      type: "array",
      items: transformV1AutoCompletions(Object.values(completions)[0])
    };
  }
  for (const [propertyName, value] of Object.entries(completions)) {
    if (propertyName.startsWith("$"))
      continue;
    if (typeof value === "string")
      v2Completions[propertyName] = transformV1Value(value);
    else if (Array.isArray(value))
      v2Completions[propertyName] = { enum: value };
    else if (value === "object")
      v2Completions[propertyName] = transformV1AutoCompletions(value);
  }
  return { type: "object", properties: v2Completions };
}
function transformV1Value(value) {
  switch (value) {
    case "$general.boolean":
      return { type: "boolean" };
    case "$general.number":
      return { type: "integer" };
    case "$general.decimal":
      return { type: "number" };
    default:
      return {
        type: [
          "number",
          "integer",
          "string",
          "boolean",
          "object",
          "array"
        ]
      };
  }
}
class Component {
  constructor(console2, fileType, componentSrc, mode, v1Compat2, targetVersion) {
    this.console = console2;
    this.fileType = fileType;
    this.componentSrc = componentSrc;
    this.mode = mode;
    this.v1Compat = v1Compat2;
    this.targetVersion = targetVersion;
    this.animations = [];
    this.animationControllers = [];
    this.createOnPlayer = [];
    this.dialogueScenes = {};
    this.serverFiles = [];
    this.clientFiles = {};
    this.lifecycleHookCount = {
      activated: 0,
      deactivated: 0
    };
  }
  setProjectConfig(projectConfig) {
    this.projectConfig = projectConfig;
  }
  get name() {
    return this._name;
  }
  async load(jsRuntime, filePath, type) {
    let v1CompatModule = { component: null };
    const module = await jsRuntime.run(filePath, {
      defineComponent: (x) => x,
      console: this.console,
      Bridge: this.v1Compat ? v1Compat$1(v1CompatModule, this.fileType) : void 0
    }).catch((err) => {
      this.console.error(`Failed to execute component "${filePath}": ${err}`);
      return null;
    });
    if (!module)
      return false;
    if (typeof module.__default__ !== "function") {
      if (v1CompatModule.component) {
        module.__default__ = v1CompatModule.component;
      } else {
        this.console.error(`Component ${filePath} is not a valid component. Expected a function as the default export.`);
        return false;
      }
    }
    const name = (name2) => this._name = name2;
    let schema = (schema2) => this.schema = schema2;
    let template = () => {
    };
    if (!type || type === "server") {
      schema = () => {
      };
      template = (func) => {
        this.template = (componentArgs, opts) => {
          try {
            func(componentArgs, opts);
          } catch (err) {
            this.console.log(func.toString());
            this.console.error(err);
          }
        };
      };
    }
    await module.__default__({
      name,
      schema,
      template
    });
    return true;
  }
  reset() {
    if (this.fileType !== "item") {
      this.animations = [];
      this.animationControllers = [];
    }
    this.clientFiles = {};
    this.serverFiles = [];
  }
  getSchema() {
    return this.schema;
  }
  toString() {
    return this.componentSrc;
  }
  create(fileContent, template, location = `minecraft:${this.fileType}`, operation) {
    var _a;
    const keys = location.split("/");
    const lastKey = keys.pop();
    const current = this.getObjAtLocation(fileContent, [...keys]);
    current[lastKey] = (operation ? (oldData, newData) => operation(deepMerge, oldData, newData) : deepMerge)((_a = current[lastKey]) != null ? _a : {}, template != null ? template : {});
  }
  getObjAtLocation(fileContent, location) {
    let current = fileContent;
    while (location.length > 0) {
      const key = location.shift();
      if (current[key] === void 0) {
        if (current[Number(key)] !== void 0) {
          current = current[Number(key)];
        } else {
          current[key] = {};
          current = current[key];
        }
      } else {
        current = current[key];
      }
    }
    return current;
  }
  async processTemplates(fileContent, componentArgs, location) {
    var _a, _b, _c, _d, _e, _f;
    if (typeof this.template !== "function")
      return;
    const identifier = (_c = (_b = (_a = fileContent[`minecraft:${this.fileType}`]) == null ? void 0 : _a.description) == null ? void 0 : _b.identifier) != null ? _c : "bridge:no_identifier";
    const fileName = await hashString(`${this.name}/${identifier}`);
    const projectNamespace = (_f = (_e = (_d = this.projectConfig) == null ? void 0 : _d.get()) == null ? void 0 : _e.namespace) != null ? _f : "bridge";
    let folderNamespace;
    if (projectNamespace.includes("_")) {
      const studioname = projectNamespace.split("_")[0];
      const packname = projectNamespace.split("_").slice(1).join("_");
      folderNamespace = `${studioname}/${packname}`;
    } else {
      folderNamespace = "bridge";
    }
    const animation = (animation2, molangCondition) => {
      this.animations.push([animation2, molangCondition]);
      return this.getShortAnimName("a", fileName, this.animations.length - 1);
    };
    const animationController = (animationController2, molangCondition) => {
      this.animationControllers.push([
        animationController2,
        molangCondition
      ]);
      return this.getShortAnimName("ac", fileName, this.animationControllers.length - 1);
    };
    const lootTable = (lootTableDef) => {
      const lootId = `loot_tables/${folderNamespace}/${this.getShortAnimName("lt", fileName, this.serverFiles.length)}.json`;
      this.serverFiles.push([lootId, lootTableDef]);
      return lootId;
    };
    const tradeTable = (tradeTableDef) => {
      const tradeId = `trading/${folderNamespace}/${this.getShortAnimName("tt", fileName, this.serverFiles.length)}.json`;
      this.serverFiles.push([tradeId, tradeTableDef]);
      return tradeId;
    };
    const recipe = (recipeDef) => {
      this.serverFiles.push([
        `recipes/${folderNamespace}/${this.getShortAnimName("recipe", fileName, this.serverFiles.length)}.json`,
        recipeDef
      ]);
    };
    const spawnRule = (spawnRuleDef) => {
      this.serverFiles.push([
        `spawn_rules/${folderNamespace}/${this.getShortAnimName("sr", fileName, this.serverFiles.length)}.json`,
        spawnRuleDef
      ]);
    };
    const permutationEventName = (await hashString(`${this.name}/${location}`)).slice(0, 16);
    const onActivated = (eventResponse) => this.registerLifecycleHook(fileContent, location, eventResponse, permutationEventName, "activated");
    const onDeactivated = (eventResponse) => this.registerLifecycleHook(fileContent, location, eventResponse, permutationEventName, "deactivated");
    if (this.fileType === "entity") {
      this.template(componentArgs != null ? componentArgs : {}, {
        mode: this.mode,
        compilerMode: this.mode,
        sourceEntity: () => JSON.parse(JSON.stringify(fileContent)),
        create: (template, location2, operation) => this.create(fileContent, template, location2, operation),
        location,
        identifier,
        projectNamespace,
        animationController,
        animation,
        lootTable,
        tradeTable,
        spawnRule,
        dialogueScene: !this.targetVersion || compare(this.targetVersion, "1.17.10", ">=") ? (scene, openDialogue = true) => {
          if (!this.dialogueScenes[fileName])
            this.dialogueScenes[fileName] = [];
          this.dialogueScenes[fileName].push(scene);
          if (scene.scene_tag && openDialogue)
            onActivated({
              run_command: {
                command: [
                  `/dialogue open @s @p ${scene.scene_tag}`
                ]
              }
            });
        } : void 0,
        onActivated,
        onDeactivated,
        client: {
          create: (clientEntity, formatVersion = "1.10.0") => {
            this.clientFiles[`entity/${folderNamespace}/${fileName}.json`] = {
              format_version: formatVersion,
              "minecraft:client_entity": Object.assign({
                description: {
                  identifier
                }
              }, clientEntity)
            };
          }
        }
      });
    } else if (this.fileType === "item") {
      this.template(componentArgs != null ? componentArgs : {}, {
        mode: this.mode,
        compilerMode: this.mode,
        sourceItem: () => JSON.parse(JSON.stringify(fileContent)),
        create: (template, location2, operation) => this.create(fileContent, template, location2, operation),
        location,
        identifier,
        projectNamespace,
        lootTable,
        recipe,
        player: {
          animationController,
          animation,
          create: (template, location2, operation) => {
            this.createOnPlayer.push([
              location2 != null ? location2 : `minecraft:entity`,
              template,
              operation
            ]);
          }
        }
      });
    } else if (this.fileType === "block") {
      this.template(componentArgs != null ? componentArgs : {}, {
        mode: this.mode,
        compilerMode: this.mode,
        sourceBlock: () => JSON.parse(JSON.stringify(fileContent)),
        create: (template, location2, operation) => this.create(fileContent, template, location2, operation),
        lootTable,
        recipe,
        location,
        identifier,
        projectNamespace
      });
    }
  }
  async processAdditionalFiles(filePath, fileContent, isPlayerFile = false) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const bpRoot = (_b = (_a = this.projectConfig) == null ? void 0 : _a.getRelativePackRoot("behaviorPack")) != null ? _b : "BP";
    const rpRoot = (_c = this.projectConfig) == null ? void 0 : _c.getRelativePackRoot("resourcePack");
    const identifier = isPlayerFile ? "minecraft:player" : (_f = (_e = (_d = fileContent[`minecraft:${this.fileType}`]) == null ? void 0 : _d.description) == null ? void 0 : _e.identifier) != null ? _f : "bridge:no_identifier";
    const projectNamespace = (_i = (_h = (_g = this.projectConfig) == null ? void 0 : _g.get()) == null ? void 0 : _h.namespace) != null ? _i : "bridge";
    let folderNamespace;
    if (projectNamespace.includes("_")) {
      const studioname = projectNamespace.split("_")[0];
      const packname = projectNamespace.split("_").slice(1).join("_");
      folderNamespace = `${studioname}/${packname}`;
    } else {
      folderNamespace = "bridge";
    }
    const fileName = (await hashString(`${this.name}/${identifier}`)).slice(0, 25);
    const animFileName = `${bpRoot}/animations/${folderNamespace}/${fileName}.json`;
    const animControllerFileName = `${bpRoot}/animation_controllers/${folderNamespace}/${fileName}.json`;
    if (identifier === "minecraft:player") {
      this.createOnPlayer.forEach(([location, template, operation]) => {
        this.create(fileContent, template, location, operation);
      });
    }
    if (!rpRoot) {
      this.clientFiles = {};
      this.console.error(`[${this.name}] Dash was unable to load the root of your resource pack and therefore cannot generate client files for this component.`);
    }
    let anims = {};
    if (this.fileType !== "item" || identifier === "minecraft:player") {
      anims = {
        [animFileName]: {
          baseFile: filePath,
          fileContent: this.createAnimations(fileName, fileContent)
        },
        [animControllerFileName]: {
          baseFile: filePath,
          fileContent: this.createAnimationControllers(fileName, fileContent)
        }
      };
    }
    return {
      ...anims,
      [join(bpRoot, `dialogue/${folderNamespace}/${fileName}.json`)]: this.dialogueScenes[fileName] && this.dialogueScenes[fileName].length > 0 ? {
        baseFile: filePath,
        fileContent: JSON.stringify({
          format_version: this.targetVersion,
          "minecraft:npc_dialogue": {
            scenes: this.dialogueScenes[fileName]
          }
        }, null, "	")
      } : void 0,
      ...Object.fromEntries(this.serverFiles.map(([currFilePath, fileDef]) => [
        join(bpRoot, currFilePath),
        {
          baseFile: filePath,
          fileContent: JSON.stringify(fileDef, null, "	")
        }
      ])),
      ...Object.fromEntries(Object.entries(this.clientFiles).map(([currFilePath, jsonContent]) => [
        join(rpRoot, currFilePath),
        {
          baseFile: filePath,
          fileContent: JSON.stringify(jsonContent, null, "	")
        }
      ]))
    };
  }
  createAnimations(fileName, fileContent) {
    var _a, _b, _c;
    if (this.animations.length === 0)
      return;
    const projectNamespace = (_c = (_b = (_a = this.projectConfig) == null ? void 0 : _a.get()) == null ? void 0 : _b.namespace) != null ? _c : "bridge";
    let id = 0;
    const animations = { format_version: "1.10.0", animations: {} };
    for (const [anim, condition] of this.animations) {
      if (!anim) {
        id++;
        continue;
      }
      const animId = this.getAnimName("animation", projectNamespace, fileName, id);
      const shortAnimId = this.getShortAnimName("a", fileName, id);
      animations.animations[animId] = anim;
      this.create(fileContent, {
        animations: {
          [shortAnimId]: animId
        }
      }, "minecraft:entity/description");
      if (condition !== false)
        this.create(fileContent, {
          scripts: {
            animate: [
              !condition ? shortAnimId : { [shortAnimId]: condition }
            ]
          }
        }, "minecraft:entity/description");
      id++;
    }
    return JSON.stringify(animations, null, "	");
  }
  createAnimationControllers(fileName, fileContent) {
    var _a, _b, _c;
    if (this.animationControllers.length === 0)
      return;
    const projectNamespace = (_c = (_b = (_a = this.projectConfig) == null ? void 0 : _a.get()) == null ? void 0 : _b.namespace) != null ? _c : "bridge";
    let id = 0;
    const animationControllers = {
      format_version: "1.10.0",
      animation_controllers: {}
    };
    for (const [anim, condition] of this.animationControllers) {
      if (!anim) {
        id++;
        continue;
      }
      const animId = this.getAnimName("controller.animation", projectNamespace, fileName, id);
      const shortAnimId = this.getShortAnimName("ac", fileName, id);
      animationControllers.animation_controllers[animId] = anim;
      this.create(fileContent, {
        animations: {
          [shortAnimId]: animId
        }
      }, "minecraft:entity/description");
      if (condition !== false)
        this.create(fileContent, {
          scripts: {
            animate: [
              !condition ? shortAnimId : { [shortAnimId]: condition }
            ]
          }
        }, "minecraft:entity/description");
      id++;
    }
    return JSON.stringify(animationControllers, null, "	");
  }
  getAnimName(prefix, namespace, fileName, id) {
    return `${prefix}.${namespace}.${fileName}_${id}`;
  }
  getShortAnimName(category, fileName, id) {
    var _a;
    return `${(_a = fileName.slice(0, 16)) != null ? _a : "bridge_auto"}_${category}_${id}`;
  }
  registerLifecycleHook(fileContent, location, eventResponse, permutationEventName, type) {
    if (!fileContent[`minecraft:${this.fileType}`].events)
      fileContent[`minecraft:${this.fileType}`].events = {};
    const entityEvents = fileContent[`minecraft:${this.fileType}`].events;
    if (type === "activated" && location === `minecraft:${this.fileType}/components`) {
      if (!entityEvents["minecraft:entity_spawned"])
        entityEvents["minecraft:entity_spawned"] = {};
      this.addEventReponse(entityEvents["minecraft:entity_spawned"], eventResponse);
    } else if (this.fileType === "entity" && location.startsWith(`minecraft:${this.fileType}/component_groups/`)) {
      const componentGroupName = location.split("/").pop();
      const eventsWithReferences = this.findComponentGroupReferences(entityEvents, type === "activated" ? "add" : "remove", componentGroupName);
      eventsWithReferences.forEach((eventWithReference) => this.addEventReponse(eventWithReference, eventResponse));
    } else if (location.startsWith(`minecraft:${this.fileType}/permutations/`)) {
      const keys = location.split("/");
      if (keys.pop() !== "components")
        throw new Error("Invalid component location inside of permutation");
      const permutation = this.getObjAtLocation(fileContent, [...keys]);
      const eventName = `bridge:${permutationEventName}_${type}_${type === "activated" ? this.lifecycleHookCount.activated++ : this.lifecycleHookCount.deactivated++}`;
      if (permutation.condition)
        this.animationControllers.push([
          {
            states: {
              default: {
                on_entry: [`@s ${eventName}`]
              }
            }
          },
          type === "activated" ? permutation.condition : `!(${permutation.condition})`
        ]);
      entityEvents[eventName] = eventResponse;
    }
  }
  addEventReponse(event, eventResponse) {
    if (Array.isArray(event.sequence)) {
      event.sequence.push(eventResponse);
    } else if (Object.keys(event).length === 0) {
      Object.assign(event, eventResponse);
    } else {
      let oldEvent = Object.assign({}, event, { filters: void 0 });
      for (const key in event) {
        if (key !== "filters")
          event[key] = void 0;
      }
      event.sequence = [oldEvent, eventResponse];
    }
  }
  findComponentGroupReferences(events, type, componentGroupName) {
    var _a, _b;
    let eventsWithComponentGroups = [];
    for (const eventName in events) {
      const event = events[eventName];
      if (Array.isArray(event.sequence))
        eventsWithComponentGroups.push(...this.findComponentGroupReferences(event.sequence, type, componentGroupName));
      else if (Array.isArray(event.randomize))
        eventsWithComponentGroups.push(...this.findComponentGroupReferences(event.randomize, type, componentGroupName));
      else {
        const componentGroups = (_b = (_a = event[type]) == null ? void 0 : _a.component_groups) != null ? _b : [];
        if (componentGroups.includes(componentGroupName))
          eventsWithComponentGroups.push(event);
      }
    }
    return eventsWithComponentGroups;
  }
}
function findCustomComponents(componentObjects) {
  const components = [];
  for (const [location, componentObject] of componentObjects) {
    components.push(...scanComponentObject(componentObject, location));
  }
  return components;
}
function scanComponentObject(componentObject, location) {
  const components = [];
  for (const componentName in componentObject) {
    if (componentName.startsWith("minecraft:") || componentName.startsWith("tag:"))
      continue;
    components.push([componentName, location]);
  }
  return components;
}
function createCustomComponentPlugin({
  fileType,
  getComponentObjects
}) {
  const usedComponents = /* @__PURE__ */ new Map();
  let createAdditionalFiles = {};
  return ({
    console: console2,
    projectConfig,
    projectRoot,
    compileFiles,
    getAliases,
    getAliasesWhere,
    options,
    jsRuntime,
    targetVersion,
    fileType: fileTypeLib,
    fileSystem
  }) => {
    let playerFile = null;
    const isPlayerFile = (filePath, getAliases2) => {
      if (!filePath)
        return false;
      if (playerFile && filePath === playerFile)
        return true;
      const isPlayerFile2 = fileType === "item" && (fileTypeLib == null ? void 0 : fileTypeLib.getId(filePath)) === "entity" && getAliases2(filePath).includes("minecraft:player");
      if (isPlayerFile2)
        playerFile = filePath;
      return isPlayerFile2;
    };
    const cachedIsComponent = /* @__PURE__ */ new Map();
    const isComponent = (filePath) => {
      if (!filePath)
        return false;
      if (cachedIsComponent.has(filePath))
        return cachedIsComponent.get(filePath);
      const isComponent2 = options.v1CompatMode ? filePath.includes(`/components/`) : (fileTypeLib == null ? void 0 : fileTypeLib.getId(filePath)) === `customComponent` && filePath.includes(`/${fileType}/`);
      cachedIsComponent.set(filePath, isComponent2);
      return isComponent2;
    };
    const cachedMayUseComponents = /* @__PURE__ */ new Map();
    const mayUseComponent = (filePath) => {
      if (!filePath)
        return false;
      if (cachedMayUseComponents.has(filePath))
        return cachedMayUseComponents.get(filePath);
      const result = (fileTypeLib == null ? void 0 : fileTypeLib.getId(filePath)) === fileType;
      cachedMayUseComponents.set(filePath, result);
      return result;
    };
    let hasComponentFiles = false;
    return {
      async buildStart() {
        var _a, _b;
        usedComponents.clear();
        cachedIsComponent.clear();
        cachedMayUseComponents.clear();
        playerFile = null;
        createAdditionalFiles = {};
        hasComponentFiles = (await fileSystem.allFiles(`${projectRoot}${(_b = (_a = projectConfig.get().packs) == null ? void 0 : _a.behaviorPack) == null ? void 0 : _b.substring(1)}/components`).catch(() => [])).length > 0;
      },
      ignore(filePath) {
        return !createAdditionalFiles[filePath] && !isComponent(filePath) && !mayUseComponent(filePath) && !(fileType === "item" && fileTypeLib.getId(filePath) === "entity");
      },
      transformPath(filePath) {
        if (isComponent(filePath) && options.buildType !== "fileRequest")
          return null;
      },
      async read(filePath, fileHandle) {
        if (!fileHandle)
          return createAdditionalFiles[filePath] ? json5.parse(createAdditionalFiles[filePath].fileContent) : void 0;
        if (isComponent(filePath)) {
          hasComponentFiles = true;
          const file = await fileHandle.getFile();
          return await (file == null ? void 0 : file.text());
        } else if (mayUseComponent(filePath) || isPlayerFile(filePath, getAliases)) {
          const file = await fileHandle.getFile();
          if (!file)
            return;
          try {
            return json5.parse(await file.text());
          } catch (err) {
            if (options.buildType !== "fileRequest")
              console2.error(`Error within file "${filePath}": ${err}`);
            return {
              __error__: `Failed to load original file: ${err}`
            };
          }
        }
      },
      async load(filePath, fileContent) {
        if (!hasComponentFiles)
          return;
        if (isComponent(filePath) && typeof fileContent === "string") {
          const component = new Component(console2, fileType, fileContent, options.mode, !!options.v1CompatMode, targetVersion);
          component.setProjectConfig(projectConfig);
          const loadedCorrectly = await component.load(jsRuntime, filePath);
          return loadedCorrectly ? component : fileContent;
        }
      },
      async registerAliases(filePath, fileContent) {
        if (!hasComponentFiles)
          return;
        if (isComponent(filePath)) {
          return [`${fileType}Component#${fileContent.name}`];
        }
      },
      async require(filePath, fileContent) {
        if (!hasComponentFiles)
          return;
        if (isPlayerFile(filePath, getAliases)) {
          return getAliasesWhere((alias) => alias.startsWith("itemComponent#"));
        }
        if (mayUseComponent(filePath)) {
          const components = findCustomComponents(getComponentObjects(fileContent));
          usedComponents.set(filePath, components);
          return components.map((component) => `${fileType}Component#${component[0]}`);
        } else if (createAdditionalFiles[filePath]) {
          return [createAdditionalFiles[filePath].baseFile];
        }
      },
      async transform(filePath, fileContent, dependencies = {}) {
        var _a;
        if (!hasComponentFiles)
          return;
        if (isPlayerFile(filePath, getAliases)) {
          const itemComponents = Object.entries(dependencies).filter(([depName]) => depName.startsWith("itemComponent#")).map(([_, component]) => component);
          for (const component of itemComponents) {
            if (!component)
              return;
            createAdditionalFiles = deepMerge(createAdditionalFiles, await component.processAdditionalFiles(filePath, fileContent, true));
          }
        } else if (mayUseComponent(filePath)) {
          const components = /* @__PURE__ */ new Set();
          for (const [componentName, location] of (_a = usedComponents.get(filePath)) != null ? _a : []) {
            const component = dependencies[`${fileType}Component#${componentName}`];
            if (!component)
              continue;
            const parentObj = get(fileContent, location.split("/"), {});
            const componentArgs = parentObj[componentName];
            delete parentObj[componentName];
            await component.processTemplates(fileContent, componentArgs, location);
            components.add(component);
          }
          for (const component of components) {
            createAdditionalFiles = deepMerge(createAdditionalFiles, await component.processAdditionalFiles(filePath, fileContent));
          }
          for (const component of components) {
            component.reset();
          }
        }
      },
      finalizeBuild(filePath, fileContent) {
        if (!hasComponentFiles)
          return;
        if (isComponent(filePath) && fileContent) {
          return fileContent.toString();
        } else if (mayUseComponent(filePath) || createAdditionalFiles[filePath])
          return JSON.stringify(fileContent, null, "	");
      },
      async buildEnd() {
        if (!hasComponentFiles)
          return;
        if (options.buildType === "fileRequest")
          return;
        createAdditionalFiles = Object.fromEntries(Object.entries(createAdditionalFiles).filter(([_, fileData]) => (fileData == null ? void 0 : fileData.fileContent) !== void 0).map(([filePath, fileData]) => [
          join(projectRoot, filePath),
          fileData
        ]));
        const compilePaths = Object.keys(createAdditionalFiles);
        if (compilePaths.length > 0)
          await compileFiles(compilePaths);
        createAdditionalFiles = {};
      }
    };
  };
}
const CustomEntityComponentPlugin = createCustomComponentPlugin({
  fileType: "entity",
  getComponentObjects: (fileContent) => {
    var _a, _b, _c, _d, _e, _f;
    return [
      [
        "minecraft:entity/components",
        (_b = (_a = fileContent == null ? void 0 : fileContent["minecraft:entity"]) == null ? void 0 : _a.components) != null ? _b : {}
      ],
      ...Object.entries((_d = (_c = fileContent == null ? void 0 : fileContent["minecraft:entity"]) == null ? void 0 : _c.component_groups) != null ? _d : {}).map(([groupName, groupContent]) => [
        `minecraft:entity/component_groups/${groupName}`,
        groupContent
      ]),
      ...((_f = (_e = fileContent == null ? void 0 : fileContent["minecraft:entity"]) == null ? void 0 : _e.permutations) != null ? _f : []).map((permutation, index) => {
        var _a2;
        return [
          `minecraft:entity/permutations/${index}/components`,
          (_a2 = permutation == null ? void 0 : permutation.components) != null ? _a2 : {}
        ];
      })
    ];
  }
});
const CustomItemComponentPlugin = createCustomComponentPlugin({
  fileType: "item",
  getComponentObjects: (fileContent) => {
    var _a, _b;
    return [
      [
        "minecraft:item/components",
        (_b = (_a = fileContent == null ? void 0 : fileContent["minecraft:item"]) == null ? void 0 : _a.components) != null ? _b : {}
      ]
    ];
  }
});
const CustomBlockComponentPlugin = createCustomComponentPlugin({
  fileType: "block",
  getComponentObjects: (fileContent) => {
    var _a, _b, _c, _d;
    return [
      [
        "minecraft:block/components",
        (_b = (_a = fileContent == null ? void 0 : fileContent["minecraft:block"]) == null ? void 0 : _a.components) != null ? _b : {}
      ],
      ...((_d = (_c = fileContent == null ? void 0 : fileContent["minecraft:block"]) == null ? void 0 : _c.permutations) != null ? _d : []).map((permutation, index) => {
        var _a2;
        return [
          `minecraft:block/permutations/${index}/components`,
          (_a2 = permutation.components) != null ? _a2 : {}
        ];
      })
    ];
  }
});
function transformCommands(commands, dependencies, includeComments, nestingDepth = 0) {
  const processedCommands = [];
  for (const writtenCommand of commands) {
    if (!writtenCommand.startsWith("/")) {
      processedCommands.push(writtenCommand);
      continue;
    }
    const [commandName, ...args] = tokenizeCommand(writtenCommand.slice(1)).tokens.map(({ word }) => word);
    const command = dependencies[`command#${commandName}`];
    if (commandName === "execute") {
      let nestedCommandIndex = 4;
      if (args[nestedCommandIndex] === "detect") {
        nestedCommandIndex += 6;
      }
      if (args[nestedCommandIndex] === void 0) {
        processedCommands.push(writtenCommand);
        continue;
      }
      const [nestedCommandName, ...nestedArgs] = args.slice(nestedCommandIndex);
      const nestedCommand = dependencies[`command#${nestedCommandName}`];
      if (!(nestedCommand instanceof Command)) {
        processedCommands.push(writtenCommand);
        continue;
      }
      processedCommands.push(...nestedCommand.process(`${nestedCommandName} ${nestedArgs.join(" ")}`, dependencies, nestingDepth + 1).map((command2) => command2.startsWith("/") ? `/execute ${args.slice(0, nestedCommandIndex).join(" ")} ${command2.slice(1)}` : command2));
      continue;
    } else if (!(command instanceof Command)) {
      processedCommands.push(writtenCommand);
      continue;
    }
    processedCommands.push(...command.process(writtenCommand, dependencies, nestingDepth));
  }
  return processedCommands.filter((command) => includeComments || !command.startsWith("#")).map((command) => command.trim());
}
const v1Compat = (v1CompatModule) => ({
  register: (commandClass) => {
    v1CompatModule.command = ({ name, schema, template }) => {
      name(commandClass.command_name);
      schema([]);
      template((commandArgs) => {
        const command = new commandClass();
        return command.onApply(commandArgs);
      });
    };
  }
});
class Command {
  constructor(console2, commandSrc, mode, v1Compat2) {
    this.console = console2;
    this.commandSrc = commandSrc;
    this.mode = mode;
    this.v1Compat = v1Compat2;
  }
  get name() {
    var _a;
    return (_a = this._name) != null ? _a : "unknown";
  }
  async load(jsRuntime, filePath, type) {
    const v1CompatModule = { command: null };
    const module = await jsRuntime.run(filePath, {
      console: this.console,
      defineCommand: (x) => x,
      Bridge: this.v1Compat ? v1Compat(v1CompatModule) : void 0
    }).catch((err) => {
      this.console.error(`Failed to execute command ${this.name}: ${err}`);
      return null;
    });
    if (!module)
      return null;
    if (typeof module.__default__ !== "function") {
      if (v1CompatModule.command) {
        module.__default__ = v1CompatModule.command;
      } else {
        this.console.error(`Component ${filePath} is not a valid component. Expected a function as the default export.`);
        return false;
      }
    }
    const name = (name2) => this._name = name2;
    let schema = (schema2) => this.schema = schema2;
    let template = () => {
    };
    if (!type || type === "server") {
      schema = () => {
      };
      template = (func) => {
        this.template = (commandArgs, opts) => {
          try {
            return func(commandArgs, opts);
          } catch (err) {
            this.console.error(err);
            return [];
          }
        };
      };
    }
    await module.__default__({
      name,
      schema,
      template
    });
  }
  process(command, dependencies, nestingDepth) {
    var _a;
    if (command.startsWith("/"))
      command = command.slice(1);
    const [commandName, ...args] = tokenizeCommand(command).tokens.map(({ word }) => word);
    const commands = (_a = this.template) == null ? void 0 : _a.call(this, args.map((arg) => castType(arg)), {
      compilerMode: this.mode,
      commandNestingDepth: nestingDepth,
      compileCommands: (customCommands) => {
        return transformCommands(customCommands.map((command2) => command2.startsWith("/") ? command2 : `/${command2}`), dependencies, false, nestingDepth + 1).map((command2) => command2.startsWith("/") ? command2.slice(1) : command2);
      }
    });
    let processedCommands = [];
    if (typeof commands === "string")
      processedCommands = commands.split("\n");
    else if (Array.isArray(commands))
      processedCommands = commands.filter((command2) => typeof command2 === "string");
    else {
      const errrorMsg = `Failed to process command ${this._name}; Invalid command template return type: Expected string[] or string, received ${typeof commands}`;
      this.console.error(errrorMsg);
      processedCommands.push(`# ${errrorMsg}`);
    }
    return processedCommands.map((command2) => command2.startsWith("/") || command2.startsWith("#") ? command2 : `/${command2}`);
  }
  getSchema() {
    if (!this.schema)
      return [{ commandName: this.name }];
    else if (Array.isArray(this.schema)) {
      if (this.schema.length === 0)
        return [{ commandName: this.name }];
      return this.schema.map((schema) => ({
        commandName: this.name,
        ...schema
      }));
    }
    if (!this.schema.commandName)
      this.schema.commandName = this.name;
    return [this.schema];
  }
  toString() {
    return this.commandSrc;
  }
}
const CustomCommandsPlugin = ({
  projectConfig,
  jsRuntime,
  console: console2,
  fileType: fileTypeLib,
  requestJsonData,
  options
}) => {
  const resolve = (packId, path) => projectConfig.resolvePackPath(packId, path);
  const isCommand = (filePath) => filePath && fileTypeLib.getId(filePath) === "customCommand";
  const isMcfunction = (filePath) => filePath && fileTypeLib.getId(filePath) === "function";
  const cachedPaths = /* @__PURE__ */ new Map();
  const loadCommandsFor = (filePath) => {
    if (cachedPaths.has(filePath))
      return cachedPaths.get(filePath);
    const commandLocs = options.include[fileTypeLib.getId(filePath)];
    cachedPaths.set(filePath, commandLocs);
    return commandLocs;
  };
  const withSlashPrefix = (filePath) => {
    var _a, _b, _c;
    return (_c = (_b = (_a = fileTypeLib.get(filePath)) == null ? void 0 : _a.meta) == null ? void 0 : _b.commandsUseSlash) != null ? _c : false;
  };
  return {
    async buildStart() {
      options.include = Object.assign(await requestJsonData("data/packages/minecraftBedrock/location/validCommand.json"), options.include);
      cachedPaths.clear();
    },
    ignore(filePath) {
      return !isCommand(filePath) && !isMcfunction(filePath) && !loadCommandsFor(filePath);
    },
    transformPath(filePath) {
      if (isCommand(filePath) && options.buildType !== "fileRequest")
        return null;
    },
    async read(filePath, fileHandle) {
      if (!fileHandle)
        return;
      if (isCommand(filePath) && filePath.endsWith(".js")) {
        const file = await fileHandle.getFile();
        return await (file == null ? void 0 : file.text());
      } else if (isMcfunction(filePath)) {
        const file = await fileHandle.getFile();
        return await (file == null ? void 0 : file.text());
      } else if (loadCommandsFor(filePath) && fileHandle) {
        const file = await fileHandle.getFile();
        if (!file)
          return;
        try {
          return json5.parse(await file.text());
        } catch (err) {
          console2.error(err);
        }
      }
    },
    async load(filePath, fileContent) {
      var _a;
      if (isCommand(filePath)) {
        const command = new Command(console2, fileContent, options.mode, (_a = options.v1CompatMode) != null ? _a : false);
        await command.load(jsRuntime, filePath);
        return command;
      }
    },
    async registerAliases(filePath, fileContent) {
      if (isCommand(filePath))
        return [`command#${fileContent.name}`];
    },
    async require(filePath) {
      if (loadCommandsFor(filePath) || isMcfunction(filePath)) {
        return [
          resolve("behaviorPack", "commands/**/*.[jt]s"),
          resolve("behaviorPack", "commands/*.[jt]s")
        ];
      }
    },
    async transform(filePath, fileContent, dependencies = {}) {
      const includePaths = loadCommandsFor(filePath);
      if (includePaths && includePaths.length > 0) {
        const hasSlashPrefix = withSlashPrefix(filePath);
        includePaths.forEach((includePath) => setObjectAt(includePath, fileContent, (commands) => {
          if (!commands)
            return commands;
          commands = Array.isArray(commands) ? commands : [commands];
          const filteredCommands = [];
          for (const command of commands) {
            if (typeof command === "string") {
              filteredCommands.push(command);
              continue;
            }
            console2.error(`The file "${filePath}" contains invalid commands. Expected type "string" within array but got type "${typeof command}"`);
          }
          return transformCommands(filteredCommands.map((command) => !hasSlashPrefix && !command.startsWith("/") ? `/${command}` : command), dependencies, false).map((command) => hasSlashPrefix ? command : command.slice(1));
        }));
      } else if (isMcfunction(filePath)) {
        const commands = fileContent.split("\n").map((command) => command.trim()).filter((command) => command !== "" && !command.startsWith("#")).map((command) => `/${command}`);
        return transformCommands(commands, dependencies, true).map((command) => command.startsWith("/") ? command.slice(1) : command).join("\n");
      }
    },
    finalizeBuild(filePath, fileContent) {
      if (isCommand(filePath) && fileContent) {
        return fileContent.toString();
      } else if (loadCommandsFor(filePath) && typeof fileContent !== "string")
        return JSON.stringify(fileContent, null, "	");
    }
  };
};
const TypeScriptPlugin = ({ options }) => {
  return {
    ignore(filePath) {
      return !filePath.endsWith(".ts");
    },
    async transformPath(filePath) {
      if (!(filePath == null ? void 0 : filePath.endsWith(".ts")))
        return;
      if (filePath == null ? void 0 : filePath.endsWith(".d.ts"))
        return null;
      return `${filePath.slice(0, -3)}.js`;
    },
    async read(filePath, fileHandle) {
      if (!filePath.endsWith(".ts") || !fileHandle)
        return;
      const file = await fileHandle.getFile();
      return await (file == null ? void 0 : file.text());
    },
    async load(filePath, fileContent) {
      if (!filePath.endsWith(".ts") || fileContent === null || typeof fileContent !== "string")
        return;
      await loadedWasm;
      return transformSync(fileContent, {
        filename: basename(filePath),
        sourceMaps: (options == null ? void 0 : options.inlineSourceMap) ? "inline" : void 0,
        jsc: {
          parser: {
            syntax: "typescript"
          },
          preserveAllComments: false,
          target: "es2020",
          transform: {
            useDefineForClassFields: false
          }
        }
      }).code;
    },
    finalizeBuild(filePath, fileContent) {
      if (filePath.endsWith(".ts") && typeof fileContent === "string")
        return fileContent;
    }
  };
};
const RewriteForPackaging = ({
  options,
  outputFileSystem,
  projectRoot,
  packType,
  fileType,
  console: console2
}) => {
  if (!options.packName)
    options.packName = "bridge project";
  const relevantFilePath = (path) => path.split(/\\|\//g).filter((part) => part !== ".." && part !== ".").slice(1).join("/");
  const rewriteForMcaddon = (filePath) => {
    const packId = packType.getId(filePath);
    const relativePath = relative(projectRoot, filePath);
    if (packId === "behaviorPack" || packId === "resourcePack" || packId === "skinPack")
      return join(projectRoot, "builds/dist", packId, relevantFilePath(relativePath));
  };
  const rewriteForMctemplate = (filePath) => {
    const packId = packType.getId(filePath);
    const relativePath = relative(projectRoot, filePath);
    if (packId === "worldTemplate")
      return join(projectRoot, "builds/dist", relevantFilePath(relativePath));
    else if (packId === "behaviorPack" || packId === "resourcePack") {
      return join(projectRoot, "builds/dist", packId === "behaviorPack" ? "behavior_packs" : "resource_packs", options.packName, relevantFilePath(relativePath));
    }
  };
  const rewriteForMcworld = (filePath) => {
    const fileId = fileType.getId(filePath);
    if (fileId === "worldManifest")
      return null;
    return rewriteForMctemplate(filePath);
  };
  return {
    async buildStart() {
      await outputFileSystem.unlink(`${projectRoot}/builds/dist`).catch(() => {
      });
    },
    transformPath(filePath) {
      if (!filePath)
        return;
      switch (options.format) {
        case "mcaddon":
          return rewriteForMcaddon(filePath);
        case "mcworld":
          return rewriteForMcworld(filePath);
        case "mctemplate":
          return rewriteForMctemplate(filePath);
        default:
          console2.error(`Unknown packaging format: ${options.format}`);
      }
    }
  };
};
const ContentsFilePlugin = ({
  projectConfig,
  packType,
  options
}) => {
  const packs = Object.keys(projectConfig.getAvailablePacks());
  const packContents = Object.fromEntries(packs.map((packId) => [packId, []]));
  const isContentsFile = (filePath) => {
    const packId = packType.getId(filePath);
    if (packId === "unknown")
      return;
    return [packId, projectConfig.resolvePackPath(packId, "contents.json")];
  };
  if (options.buildType !== "fullBuild")
    return {};
  return {
    include() {
      return packs.map((id) => [
        projectConfig.resolvePackPath(id, "contents.json"),
        { isVirtual: true }
      ]);
    },
    read(filePath) {
      const details = isContentsFile(filePath);
      if (!details)
        return;
      const [packId, contentsPath] = details;
      if (filePath === contentsPath)
        return;
      return packContents[packId];
    },
    transformPath(filePath) {
      if (!filePath)
        return;
      const packId = packType.getId(filePath);
      if (packId === "unknown")
        return;
      packContents[packId].push(filePath);
      return void 0;
    },
    finalizeBuild(filePath) {
      const details = isContentsFile(filePath);
      if (!details)
        return;
      const [packId, contentsPath] = details;
      if (filePath === contentsPath)
        return;
      return JSON.stringify(packContents[packId]);
    }
  };
};
const FormatVersionCorrection = ({
  fileType
}) => {
  const toTransform = /* @__PURE__ */ new Set();
  for (const ft of fileType.all) {
    if (ft.formatVersionMap)
      toTransform.add(ft.id);
  }
  const needsTransformationCache = /* @__PURE__ */ new Map();
  const needsTransformation = (filePath) => {
    if (!filePath)
      return;
    let needsTransform = needsTransformationCache.get(filePath);
    if (needsTransform)
      return needsTransform;
    needsTransform = toTransform.has(fileType.getId(filePath));
    needsTransformationCache.set(filePath, needsTransform);
    return needsTransform;
  };
  return {
    ignore(filePath) {
      return !needsTransformation(filePath);
    },
    async read(filePath, fileHandle) {
      if (!fileHandle)
        return;
      if (needsTransformation(filePath)) {
        const file = await fileHandle.getFile();
        if (!file)
          return;
        try {
          return json5.parse(await file.text());
        } catch (err) {
          console.error(err);
        }
      }
    },
    load(filePath, fileContent) {
      if (needsTransformation(filePath))
        return fileContent;
    },
    transform(filePath, fileContent) {
      if (needsTransformation(filePath)) {
        const currentFileType = fileType.get(filePath);
        const formatVersionMap = currentFileType == null ? void 0 : currentFileType.formatVersionMap;
        if (!formatVersionMap)
          return;
        const formatVersion = fileContent == null ? void 0 : fileContent.format_version;
        if (formatVersion && formatVersionMap[formatVersion])
          fileContent.format_version = formatVersionMap[formatVersion];
        return fileContent;
      }
    },
    finalizeBuild(filePath, fileContent) {
      if (needsTransformation(filePath))
        return JSON.stringify(fileContent);
    }
  };
};
class Collection {
  constructor(console2) {
    this.console = console2;
    this.__isCollection = true;
    this.files = /* @__PURE__ */ new Map();
  }
  get hasFiles() {
    return this.files.size > 0;
  }
  getAll() {
    return [...this.files.entries()];
  }
  get(filePath) {
    return this.files.get(filePath);
  }
  clear() {
    this.files.clear();
  }
  add(filePath, fileContent) {
    if (this.files.has(filePath)) {
      this.console.warn(`Omitting file "${filePath}" from collection because it would overwrite a previously generated file!`);
      return;
    }
    this.files.set(filePath, fileContent);
  }
  has(filePath) {
    return this.files.has(filePath);
  }
  addFrom(collection, baseDir) {
    for (const [filePath, fileContent] of collection.getAll()) {
      const resolvedPath = baseDir ? join(baseDir, filePath) : filePath;
      this.add(resolvedPath, fileContent);
    }
  }
}
var GeneratorScriptModule = "import { dirname, join } from 'path-browserify'\r\nimport type { FileSystem } from '../../../FileSystem/FileSystem'\r\nimport type { Console } from '../../../Common/Console'\r\n// @ts-expect-error\r\nimport { Collection } from '@bridge-interal/collection'\r\n\r\ndeclare const __fileSystem: FileSystem\r\ndeclare const console: Console\r\ndeclare const __omitUsedTemplates: Set<string>\r\ndeclare const __baseDirectory: string\r\n\r\nexport interface IModuleOpts {\r\n	generatorPath: string\r\n	omitUsedTemplates: Set<string>\r\n	fileSystem: FileSystem\r\n	console: Console\r\n}\r\n\r\ninterface IUseTemplateOptions {\r\n	omitTemplate?: boolean\r\n}\r\n\r\nexport function useTemplate(\r\n	filePath: string,\r\n	{ omitTemplate = true }: IUseTemplateOptions = {}\r\n) {\r\n	const templatePath = join(__baseDirectory, filePath)\r\n	if (omitTemplate) __omitUsedTemplates.add(templatePath)\r\n\r\n	// TODO(@solvedDev): Pipe file through compileFile API\r\n	if (filePath.endsWith('.json')) return __fileSystem.readJson(templatePath)\r\n	else return __fileSystem.readFile(templatePath).then((file) => file.text())\r\n}\r\n\r\nexport function createCollection() {\r\n	return new Collection(console)\r\n}\r\n";
var CollectionModule = "import { join } from 'path-browserify'\r\nimport { Console } from '../../../Common/Console'\r\n\r\nexport class Collection {\r\n	public readonly __isCollection = true\r\n	protected files = new Map<string, any>()\r\n	constructor(protected console: Console) {}\r\n\r\n	get hasFiles() {\r\n		return this.files.size > 0\r\n	}\r\n\r\n	getAll() {\r\n		return [...this.files.entries()]\r\n	}\r\n\r\n	get(filePath: string) {\r\n		return this.files.get(filePath)\r\n	}\r\n\r\n	clear() {\r\n		this.files.clear()\r\n	}\r\n	add(filePath: string, fileContent: any) {\r\n		if (this.files.has(filePath)) {\r\n			this.console.warn(\r\n				`Omitting file \"${filePath}\" from collection because it would overwrite a previously generated file!`\r\n			)\r\n			return\r\n		}\r\n		this.files.set(filePath, fileContent)\r\n	}\r\n	has(filePath: string) {\r\n		return this.files.has(filePath)\r\n	}\r\n	addFrom(collection: Collection, baseDir?: string) {\r\n		for (const [filePath, fileContent] of collection.getAll()) {\r\n			const resolvedPath = baseDir ? join(baseDir, filePath) : filePath\r\n			this.add(resolvedPath, fileContent)\r\n		}\r\n	}\r\n}\r\n";
const GeneratorScriptsPlugin = ({
  options,
  fileType,
  console: console2,
  jsRuntime,
  fileSystem,
  compileFiles,
  getFileMetadata,
  unlinkOutputFiles,
  addFileDependencies
}) => {
  var _a;
  const ignoredFileTypes = /* @__PURE__ */ new Set([
    "gameTest",
    "customCommand",
    "customComponent",
    "molangAstScript",
    ...(_a = options.ignoredFileTypes) != null ? _a : []
  ]);
  const getFileType = (filePath) => fileType.getId(filePath);
  const getFileContentType = (filePath) => {
    var _a2;
    const def = fileType.get(filePath, void 0, false);
    if (!def)
      return "raw";
    return (_a2 = def.type) != null ? _a2 : "json";
  };
  const isGeneratorScript = (filePath) => !ignoredFileTypes.has(getFileType(filePath)) && (filePath.endsWith(".js") || filePath.endsWith(".ts"));
  const getScriptExtension = (filePath) => {
    var _a2, _b, _c, _d;
    const fileContentType = getFileContentType(filePath);
    if (fileContentType === "json")
      return ".json";
    return (_d = (_c = (_b = (_a2 = fileType.get(filePath, void 0, false)) == null ? void 0 : _a2.detect) == null ? void 0 : _b.fileExtensions) == null ? void 0 : _c[0]) != null ? _d : ".txt";
  };
  const transformPath = (filePath) => filePath.replace(/\.(js|ts)$/, getScriptExtension(filePath));
  const omitUsedTemplates = /* @__PURE__ */ new Set();
  const fileCollection = new Collection(console2);
  const filesToUpdate = /* @__PURE__ */ new Set();
  const usedTemplateMap = /* @__PURE__ */ new Map();
  return {
    buildStart() {
      fileCollection.clear();
      omitUsedTemplates.clear();
      filesToUpdate.clear();
      usedTemplateMap.clear();
      jsRuntime.registerModule("@bridge-interal/collection", CollectionModule);
      jsRuntime.registerModule("@bridge/generate", GeneratorScriptModule);
      jsRuntime.registerModule("path-browserify", {
        dirname,
        join
      });
    },
    ignore(filePath) {
      return !isGeneratorScript(filePath) && !omitUsedTemplates.has(filePath) && !fileCollection.has(filePath);
    },
    transformPath(filePath) {
      if (filePath && isGeneratorScript(filePath))
        return transformPath(filePath);
    },
    async read(filePath, fileHandle) {
      if (isGeneratorScript(filePath) && fileHandle) {
        const file = await fileHandle.getFile();
        if (!file)
          return;
        return file.text();
      }
      const fromCollection = fileCollection.get(filePath);
      if (fromCollection)
        return fromCollection;
    },
    async load(filePath, fileContent) {
      var _a2, _b;
      if (!isGeneratorScript(filePath))
        return;
      if (!fileContent)
        return null;
      const currentTemplates = /* @__PURE__ */ new Set();
      const module = await jsRuntime.run(filePath, {
        console: console2,
        __baseDirectory: dirname(filePath),
        __omitUsedTemplates: omitUsedTemplates,
        __fileSystem: fileSystem
      }, fileContent).catch((err) => {
        console2.error(`Failed to execute generator script "${filePath}": ${err}`);
        return null;
      });
      if (!module)
        return null;
      if (!module.__default__) {
        console2.error(`Expected generator script "${filePath}" to provide file content as default export!`);
        return null;
      }
      const fileMetadata = getFileMetadata(filePath);
      const previouslyUnlinkedFiles = ((_a2 = fileMetadata.get("unlinkedFiles")) != null ? _a2 : []).filter((filePath2) => !currentTemplates.has(filePath2));
      previouslyUnlinkedFiles.forEach((file) => filesToUpdate.add(file));
      fileMetadata.set("unlinkedFiles", [...currentTemplates]);
      const generatedFiles = (_b = fileMetadata.get("generatedFiles")) != null ? _b : [];
      await unlinkOutputFiles([
        ...generatedFiles,
        ...currentTemplates
      ]).catch(() => {
      });
      usedTemplateMap.set(filePath, currentTemplates);
      return module.__default__;
    },
    require(filePath) {
      const usedTemplates = usedTemplateMap.get(filePath);
      if (usedTemplates)
        return [...usedTemplates];
    },
    finalizeBuild(filePath, fileContent) {
      if (fileCollection.get(filePath)) {
        if (filePath.endsWith(".json") && typeof fileContent !== "string")
          return JSON.stringify(fileContent, null, "	");
        return fileContent;
      }
      if (omitUsedTemplates.has(filePath))
        return null;
      if (isGeneratorScript(filePath)) {
        if (fileContent === null)
          return null;
        const fileMetadata = getFileMetadata(filePath);
        if (fileContent.__isCollection) {
          fileCollection.addFrom(fileContent, dirname(filePath));
          fileMetadata.set("generatedFiles", fileContent.getAll().map(([filePath2]) => filePath2));
          return null;
        }
        fileMetadata.set("generatedFiles", [transformPath(filePath)]);
        return typeof fileContent === "object" ? JSON.stringify(fileContent) : fileContent;
      }
    },
    async buildEnd() {
      jsRuntime.deleteModule("@bridge/generate");
      jsRuntime.deleteModule("@bridge-interal/collection");
      jsRuntime.deleteModule("path-browserify");
      if (filesToUpdate.size > 0)
        await compileFiles([...filesToUpdate].filter((filePath) => !fileCollection.has(filePath)), false);
      if (fileCollection.hasFiles)
        await compileFiles(fileCollection.getAll().map(([filePath]) => filePath));
    },
    async beforeFileUnlinked(filePath) {
      var _a2, _b;
      if (isGeneratorScript(filePath)) {
        let fileMetadata = null;
        try {
          fileMetadata = getFileMetadata(filePath);
        } catch {
        }
        if (!fileMetadata)
          return;
        const unlinkedFiles = (_a2 = fileMetadata.get("unlinkedFiles")) != null ? _a2 : [];
        const generatedFiles = (_b = fileMetadata.get("generatedFiles")) != null ? _b : [];
        await unlinkOutputFiles(generatedFiles);
        await compileFiles(unlinkedFiles);
      }
    }
  };
};
class JsRuntime extends Runtime {
  constructor(fs, modules) {
    super(modules);
    this.fs = fs;
  }
  readFile(filePath) {
    return this.fs.readFile(filePath);
  }
  deleteModule(moduleName) {
    this.baseModules.delete(moduleName);
  }
}
const builtInPlugins = {
  simpleRewrite: SimpleRewrite,
  rewriteForPackaging: RewriteForPackaging,
  moLang: MolangPlugin,
  molang: MolangPlugin,
  entityIdentifierAlias: EntityIdentifierAlias,
  customEntityComponents: CustomEntityComponentPlugin,
  customItemComponents: CustomItemComponentPlugin,
  customBlockComponents: CustomBlockComponentPlugin,
  customCommands: CustomCommandsPlugin,
  typeScript: TypeScriptPlugin,
  contentsFile: ContentsFilePlugin,
  formatVersionCorrection: FormatVersionCorrection,
  generatorScripts: GeneratorScriptsPlugin
};
const availableHooks = [
  "buildStart",
  "buildEnd",
  "include",
  "ignore",
  "transformPath",
  "read",
  "load",
  "registerAliases",
  "require",
  "transform",
  "finalizeBuild",
  "beforeFileUnlinked"
];
class AllPlugins {
  constructor(dash) {
    this.dash = dash;
    this.implementedHooks = /* @__PURE__ */ new Map();
    this.pluginRuntime = new JsRuntime(this.dash.fileSystem);
  }
  pluginsFor(hook, file) {
    var _a, _b;
    if (file)
      return (_a = file.myImplementedHooks.get(hook)) != null ? _a : [];
    return (_b = this.implementedHooks.get(hook)) != null ? _b : [];
  }
  getImplementedHooks() {
    return this.implementedHooks;
  }
  async loadPlugins(scriptEnv = {}) {
    var _a;
    this.implementedHooks.clear();
    this.pluginRuntime.clearCache();
    const extensions = [
      ...(await this.dash.fileSystem.readdir(join(this.dash.projectRoot, ".bridge/extensions")).catch(() => [])).map((entry) => entry.kind === "directory" ? join(this.dash.projectRoot, ".bridge/extensions", entry.name) : void 0),
      ...(await this.dash.fileSystem.readdir("extensions").catch(() => [])).map((entry) => entry.kind === "directory" ? join("extensions", entry.name) : void 0)
    ];
    const plugins = {};
    const manifestReadPromises = [];
    for (const extension of extensions) {
      if (!extension)
        continue;
      manifestReadPromises.push(this.dash.fileSystem.readJson(join(extension, "manifest.json")).then((manifest) => {
        var _a2;
        if (!((_a2 = manifest == null ? void 0 : manifest.compiler) == null ? void 0 : _a2.plugins))
          return;
        for (const pluginId in manifest.compiler.plugins) {
          plugins[pluginId] = join(extension, manifest.compiler.plugins[pluginId]);
        }
      }).catch(() => {
      }));
    }
    await Promise.all(manifestReadPromises);
    const usedPlugins = (_a = (await this.getCompilerOptions()).plugins) != null ? _a : [];
    const evaluatedPlugins = [];
    const promises = [];
    for (let i = 0; i < usedPlugins.length; i++) {
      const usedPlugin = usedPlugins[i];
      const pluginId = typeof usedPlugin === "string" ? usedPlugin : usedPlugin[0];
      if (plugins[pluginId]) {
        promises.push(this.pluginRuntime.run(plugins[pluginId], {
          console: this.dash.console,
          ...scriptEnv
        }).catch((err) => {
          this.dash.console.error(`Failed to execute plugin ${pluginId}: ${err}`);
          return null;
        }).then((module) => {
          if (!module)
            return;
          if (typeof module.__default__ === "function") {
            evaluatedPlugins[i] = module.__default__;
          } else {
            evaluatedPlugins[i] = null;
            this.dash.console.error(`Plugin ${pluginId} is invalid: It does not provide a function as a default export.`);
          }
        }));
      } else if (builtInPlugins[pluginId]) {
        evaluatedPlugins[i] = builtInPlugins[pluginId];
      } else {
        evaluatedPlugins[i] = null;
        this.dash.console.error(`Unknown compiler plugin: ${pluginId}`);
      }
    }
    await Promise.all(promises);
    for (let i = 0; i < usedPlugins.length; i++) {
      const currPlugin = evaluatedPlugins[i];
      if (!currPlugin)
        continue;
      const usedPlugin = usedPlugins[i];
      const pluginOpts = typeof usedPlugin === "string" ? {} : usedPlugin[1];
      const pluginId = typeof usedPlugin === "string" ? usedPlugin : usedPlugin[0];
      this.addPlugin(pluginId, currPlugin, pluginOpts);
    }
  }
  async addPlugin(pluginId, pluginImpl, pluginOpts) {
    const plugin = new Plugin(this.dash, pluginId, await pluginImpl(this.getPluginContext(pluginId, pluginOpts)));
    for (const hook of availableHooks) {
      if (plugin.implementsHook(hook)) {
        let hooks = this.implementedHooks.get(hook);
        if (!hooks) {
          hooks = [];
          this.implementedHooks.set(hook, hooks);
        }
        hooks.push(plugin);
      }
    }
  }
  async getCompilerOptions() {
    var _a;
    const compilerConfigPath = await this.dash.getCompilerConfigPath();
    if (!compilerConfigPath)
      return (_a = this.dash.projectConfig.get().compiler) != null ? _a : {};
    return await this.dash.fileSystem.readJson(compilerConfigPath);
  }
  getPluginContext(pluginId, pluginOpts = {}) {
    const dash = this.dash;
    return {
      options: {
        get mode() {
          return dash.getMode();
        },
        get buildType() {
          return dash.buildType;
        },
        ...pluginOpts
      },
      jsRuntime: this.dash.jsRuntime,
      console: this.dash.console,
      fileSystem: this.dash.fileSystem,
      outputFileSystem: this.dash.outputFileSystem,
      projectConfig: this.dash.projectConfig,
      projectRoot: this.dash.projectRoot,
      packType: this.dash.packType,
      fileType: this.dash.fileType,
      targetVersion: this.dash.projectConfig.get().targetVersion,
      requestJsonData: this.dash.requestJsonData,
      getAliases: (filePath) => {
        var _a, _b;
        return [
          ...(_b = (_a = this.dash.includedFiles.get(filePath)) == null ? void 0 : _a.aliases) != null ? _b : []
        ];
      },
      getAliasesWhere: (criteria) => {
        return this.dash.includedFiles.getAliasesWhere(criteria);
      },
      getFileMetadata: (filePath) => {
        const file = this.dash.includedFiles.get(filePath);
        if (!file)
          throw new Error(`File ${filePath} to get metadata from not found`);
        return {
          get(key) {
            return file.getMetadata(key);
          },
          set(key, value) {
            file.addMetadata(key, value);
          },
          delete(key) {
            file.deleteMetadata(key);
          }
        };
      },
      addFileDependencies: (filePath, filePaths, clearPrevious = false) => {
        const file = this.dash.includedFiles.get(filePath);
        if (!file)
          throw new Error(`File ${filePath} to add dependency to not found`);
        if (clearPrevious)
          file.setRequiredFiles(new Set(filePaths));
        else
          filePaths.forEach((filePath2) => file.addRequiredFile(filePath2));
      },
      getOutputPath: (filePath) => {
        return this.dash.getCompilerOutputPath(filePath);
      },
      unlinkOutputFiles: (filePaths) => {
        return this.dash.unlinkMultiple(filePaths, false, true);
      },
      hasComMojangDirectory: this.dash.fileSystem !== this.dash.outputFileSystem,
      compileFiles: (filePaths, virtual = true) => this.dash.compileAdditionalFiles(filePaths, virtual)
    };
  }
  async runBuildStartHooks() {
    await Promise.all(this.pluginsFor("buildStart").map((plugin) => plugin.runBuildStartHook()));
  }
  async runIncludeHooks() {
    let includeFiles = [];
    for (const plugin of this.pluginsFor("include")) {
      const filesToInclude = await plugin.runIncludeHook();
      if (Array.isArray(filesToInclude))
        includeFiles.push(...filesToInclude);
    }
    return includeFiles;
  }
  async runIgnoreHooks(file) {
    for (const plugin of this.pluginsFor("ignore")) {
      const ignore = await plugin.runIgnoreHook(file.filePath);
      if (ignore)
        file.addIgnoredPlugin(plugin.pluginId);
    }
    file.createImplementedHooksMap();
  }
  async runTransformPathHooks(file) {
    let currentFilePath = file.filePath;
    for (const plugin of this.pluginsFor("transformPath")) {
      const newPath = await plugin.runTransformPathHook(currentFilePath);
      if (newPath === null)
        return null;
      else if (newPath !== void 0)
        currentFilePath = newPath;
    }
    return currentFilePath;
  }
  async runReadHooks(file) {
    for (const plugin of this.pluginsFor("read", file)) {
      const data = await plugin.runReadHook(file.filePath, file.fileHandle);
      if (data !== null && data !== void 0)
        return data;
    }
  }
  async runLoadHooks(file) {
    let data = file.data;
    for (const plugin of this.pluginsFor("load", file)) {
      const tmp = await plugin.runLoadHook(file.filePath, data);
      if (tmp === void 0)
        continue;
      data = tmp;
    }
    return data;
  }
  async runRegisterAliasesHooks(file) {
    const aliases = /* @__PURE__ */ new Set();
    for (const plugin of this.pluginsFor("registerAliases", file)) {
      const tmp = await plugin.runRegisterAliasesHook(file.filePath, file.data);
      if (tmp === void 0 || tmp === null)
        continue;
      if (Array.isArray(tmp))
        tmp.forEach((alias) => aliases.add(alias));
      else
        aliases.add(tmp);
    }
    return aliases;
  }
  async runRequireHooks(file) {
    const requiredFiles = /* @__PURE__ */ new Set();
    for (const plugin of this.pluginsFor("require", file)) {
      const tmp = await plugin.runRequireHook(file.filePath, file.data);
      if (tmp === void 0 || tmp === null)
        continue;
      if (Array.isArray(tmp))
        tmp.forEach((file2) => requiredFiles.add(file2));
      else
        requiredFiles.add(tmp);
    }
    return requiredFiles;
  }
  async runTransformHooks(file) {
    const dependencies = Object.fromEntries([...file.requiredFiles].map((query) => this.dash.includedFiles.query(query)).flat().map((file2) => [
      [file2.filePath, file2.data],
      ...[...file2.aliases].map((alias) => [alias, file2.data])
    ]).flat());
    let transformedData = file.data;
    for (const plugin of this.pluginsFor("transform", file)) {
      const tmpData = await plugin.runTransformHook(file.filePath, transformedData, dependencies);
      if (tmpData === void 0)
        continue;
      transformedData = tmpData;
    }
    return transformedData;
  }
  async runFinalizeBuildHooks(file) {
    for (const plugin of this.pluginsFor("finalizeBuild", file)) {
      const finalizedData = await plugin.runFinalizeBuildHook(file.filePath, file.data);
      if (finalizedData !== void 0)
        return finalizedData;
    }
  }
  async runBuildEndHooks() {
    await Promise.allSettled(this.pluginsFor("buildEnd").map((plugin) => plugin.runBuildEndHook()));
  }
  async runBeforeFileUnlinked(filePath) {
    for (const plugin of this.pluginsFor("beforeFileUnlinked")) {
      await plugin.runBeforeFileUnlinked(filePath);
    }
  }
}
class DashFile {
  constructor(dash, filePath, isVirtual = false) {
    this.dash = dash;
    this.filePath = filePath;
    this.isVirtual = isVirtual;
    this.isDone = false;
    this.requiredFiles = /* @__PURE__ */ new Set();
    this.aliases = /* @__PURE__ */ new Set();
    this.updateFiles = /* @__PURE__ */ new Set();
    this.metadata = /* @__PURE__ */ new Map();
    this.ignoredByPlugins = /* @__PURE__ */ new Set();
    this._myImplementedHooks = null;
    this._cachedFile = null;
    this.outputPath = filePath;
    if (!this.isVirtual)
      this.setDefaultFileHandle();
  }
  isIgnoredBy(pluginId) {
    return this.ignoredByPlugins.has(pluginId);
  }
  addIgnoredPlugin(pluginId) {
    this.ignoredByPlugins.add(pluginId);
  }
  createImplementedHooksMap() {
    var _a;
    this._myImplementedHooks = /* @__PURE__ */ new Map();
    for (const [
      hookType,
      plugins
    ] of this.dash.plugins.getImplementedHooks()) {
      const availablePlugins = plugins.filter((plugin) => !this.isIgnoredBy(plugin.pluginId));
      this._myImplementedHooks.set(hookType, availablePlugins);
    }
    const readHooks = (_a = this.myImplementedHooks.get("read")) != null ? _a : [];
    const hasReadHooks = readHooks.length > 0;
    if (hasReadHooks) {
      this._cachedFile = this.dash.fileSystem.readFile(this.filePath).catch(() => null);
    }
  }
  get myImplementedHooks() {
    if (this._myImplementedHooks)
      return this._myImplementedHooks;
    throw new Error(`Tried to access implemented hooks before they were created`);
  }
  setFileHandle(fileHandle) {
    this.fileHandle = fileHandle;
  }
  setDefaultFileHandle() {
    this.setFileHandle({
      getFile: () => this._cachedFile
    });
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
  addRequiredFile(filePath) {
    this.requiredFiles.add(filePath);
  }
  setUpdateFiles(files) {
    this.updateFiles = new Set(files.map((filePath) => this.dash.includedFiles.get(filePath)).filter((file) => file !== void 0));
  }
  addUpdateFile(file) {
    this.updateFiles.add(file);
  }
  removeUpdateFile(file) {
    this.updateFiles.delete(file);
  }
  setMetadata(from) {
    if (typeof from === "object")
      this.metadata = new Map(Object.entries(from));
  }
  addMetadata(key, value) {
    this.metadata.set(key, value);
  }
  deleteMetadata(key) {
    this.metadata.delete(key);
  }
  getMetadata(key) {
    return this.metadata.get(key);
  }
  getAllMetadata() {
    return Object.fromEntries(this.metadata.entries());
  }
  getHotUpdateChain() {
    const chain = /* @__PURE__ */ new Set([this]);
    for (const updateFile of this.updateFiles) {
      updateFile.getHotUpdateChain().forEach((file) => {
        chain.add(file);
      });
    }
    return chain;
  }
  filesToLoadForHotUpdate(visited = /* @__PURE__ */ new Set(), didFileChange = true) {
    const chain = /* @__PURE__ */ new Set();
    if (visited.has(this))
      return chain;
    visited.add(this);
    for (const depFileId of this.requiredFiles) {
      const depFiles = this.dash.includedFiles.query(depFileId);
      for (const depFile of depFiles) {
        depFile.filesToLoadForHotUpdate(visited, false).forEach((file) => {
          chain.add(file);
        });
      }
    }
    chain.add(this);
    if (didFileChange) {
      for (const updateFile of this.updateFiles) {
        updateFile.filesToLoadForHotUpdate(visited, true).forEach((file) => {
          chain.add(file);
        });
      }
    }
    return chain;
  }
  processAfterLoad(writeFiles, copyFilePromises) {
    if (this.data === null || this.data === void 0) {
      this.isDone = true;
      if (this.filePath !== this.outputPath && this.outputPath !== null && !this.isVirtual && writeFiles) {
        copyFilePromises.push(this.dash.fileSystem.copyFile(this.filePath, this.outputPath, this.dash.outputFileSystem));
      }
    }
  }
  serialize() {
    return {
      isVirtual: this.isVirtual,
      filePath: this.filePath,
      aliases: [...this.aliases],
      requiredFiles: [...this.requiredFiles],
      updateFiles: [...this.updateFiles].map((file) => file.filePath),
      metadata: this.metadata.size > 0 ? Object.fromEntries(this.metadata.entries()) : void 0
    };
  }
  reset() {
    this.isDone = false;
    this.data = null;
    this._myImplementedHooks = null;
    this._cachedFile = null;
    if (!this.isVirtual)
      this.setDefaultFileHandle();
  }
}
class IncludedFiles {
  constructor(dash) {
    this.dash = dash;
    this.files = /* @__PURE__ */ new Map();
    this.aliases = /* @__PURE__ */ new Map();
    this.queryCache = /* @__PURE__ */ new Map();
  }
  all() {
    return [...this.files.values()];
  }
  filtered(cb) {
    return this.all().filter((file) => cb(file));
  }
  get(fileId) {
    var _a;
    return (_a = this.aliases.get(fileId)) != null ? _a : this.files.get(fileId);
  }
  getFromFilePath(filePath) {
    return this.files.get(filePath);
  }
  query(query) {
    const aliasedFile = this.aliases.get(query);
    if (aliasedFile)
      return [aliasedFile];
    const file = this.files.get(query);
    if (file)
      return [file];
    if (isGlob(query))
      return this.queryGlob(query);
    return [];
  }
  addAlias(alias, DashFile2) {
    this.aliases.set(alias, DashFile2);
  }
  getAliasesWhere(keepAlias) {
    const aliases = [...this.aliases.keys()].filter(keepAlias);
    return aliases;
  }
  queryGlob(glob) {
    if (this.queryCache.has(glob)) {
      return this.queryCache.get(glob);
    }
    const files = this.filtered((file) => isMatch(file.filePath, glob));
    this.queryCache.set(glob, files);
    return files;
  }
  async loadAll() {
    this.dash.console.time("Load all files");
    this.queryCache = /* @__PURE__ */ new Map();
    const allFiles = /* @__PURE__ */ new Set();
    const packPaths = this.dash.projectConfig.getAvailablePackPaths();
    const promises = [];
    for (const packPath of packPaths) {
      promises.push(this.dash.fileSystem.allFiles(packPath).catch((err) => {
        this.dash.console.warn(err);
        return [];
      }).then((files) => {
        for (const file of files)
          allFiles.add(file);
      }));
    }
    await Promise.all(promises);
    const includeFiles = await this.dash.plugins.runIncludeHooks();
    for (const includedFile of includeFiles) {
      if (typeof includedFile === "string")
        allFiles.add(includedFile);
      else
        this.addOne(includedFile[0], includedFile[1].isVirtual);
    }
    this.add([...allFiles]);
    this.dash.console.timeEnd("Load all files");
  }
  addOne(filePath, isVirtual = false) {
    const file = new DashFile(this.dash, filePath, isVirtual);
    this.files.set(filePath, file);
    return file;
  }
  add(filePaths, isVirtual = false) {
    let files = [];
    for (const filePath of filePaths) {
      const file = this.files.get(filePath);
      if (file) {
        files.push(file);
        continue;
      }
      files.push(new DashFile(this.dash, filePath, isVirtual));
      this.files.set(filePath, files[files.length - 1]);
    }
    return files;
  }
  remove(filePath) {
    const file = this.files.get(filePath);
    if (!file)
      return;
    this.files.delete(filePath);
    for (const alias of file.aliases) {
      this.aliases.delete(alias);
    }
  }
  async save(filePath) {
    await this.dash.fileSystem.writeJson(filePath, this.all().map((file) => file.serialize()));
  }
  async load(filePath) {
    this.removeAll();
    const sFiles = await this.dash.fileSystem.readJson(filePath).catch(() => null);
    const files = [];
    if (!sFiles)
      return;
    for (const sFile of sFiles) {
      const file = new DashFile(this.dash, sFile.filePath, sFile.isVirtual);
      file.setAliases(new Set(sFile.aliases));
      file.setRequiredFiles(new Set(sFile.requiredFiles));
      file.setMetadata(sFile.metadata);
      file.createImplementedHooksMap();
      files.push(file);
      for (const alias of sFile.aliases) {
        this.aliases.set(alias, file);
      }
    }
    this.files = new Map(files.map((file) => [file.filePath, file]));
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      file.setUpdateFiles(sFiles[i].updateFiles);
    }
  }
  resetAll() {
    for (const file of this.all()) {
      file.reset();
    }
  }
  removeAll() {
    this.files = /* @__PURE__ */ new Map();
    this.aliases = /* @__PURE__ */ new Map();
    this.queryCache = /* @__PURE__ */ new Map();
  }
}
class LoadFiles {
  constructor(dash) {
    this.dash = dash;
    this.copyFilePromises = [];
  }
  async run(files, writeFiles = true) {
    this.copyFilePromises = [];
    let promises = [];
    for (const file of files) {
      if (file.isDone)
        continue;
      promises.push(this.loadFile(file, writeFiles));
    }
    await Promise.allSettled(promises);
    await Promise.allSettled(files.map(async (file) => {
      const requiredFiles = await this.dash.plugins.runRequireHooks(file);
      file.setRequiredFiles(requiredFiles);
    }));
  }
  async loadFile(file, writeFiles = true) {
    var _a;
    const [_, outputPath] = await Promise.all([
      this.dash.plugins.runIgnoreHooks(file),
      this.dash.plugins.runTransformPathHooks(file)
    ]);
    const readData = await this.dash.plugins.runReadHooks(file);
    file.setOutputPath(outputPath);
    file.setReadData(readData);
    file.processAfterLoad(writeFiles, this.copyFilePromises);
    if (file.isDone)
      return;
    file.setReadData((_a = await this.dash.plugins.runLoadHooks(file)) != null ? _a : file.data);
    const aliases = await this.dash.plugins.runRegisterAliasesHooks(file);
    file.setAliases(aliases);
  }
  async awaitAllFilesCopied() {
    if (this.copyFilePromises.length === 0)
      return;
    await Promise.allSettled(this.copyFilePromises);
    this.copyFilePromises = [];
  }
}
class ResolveFileOrder {
  constructor(dash) {
    this.dash = dash;
  }
  run(files) {
    const resolved = /* @__PURE__ */ new Set();
    for (const file of files) {
      if (file.isDone || resolved.has(file))
        continue;
      this.resolveSingle(file, resolved);
    }
    return resolved;
  }
  resolveSingle(file, resolved, unresolved = /* @__PURE__ */ new Set()) {
    const files = this.dash.includedFiles;
    unresolved.add(file);
    for (const depFileId of file.requiredFiles) {
      const depFiles = files.query(depFileId);
      for (const depFile of depFiles) {
        if (!depFile) {
          this.dash.console.error(`Undefined file dependency: "${file.filePath}" requires "${depFileId}"`);
          continue;
        }
        depFile.addUpdateFile(file);
        if (!resolved.has(depFile)) {
          if (unresolved.has(depFile)) {
            this.dash.console.error(`Circular dependency detected: ${depFile.filePath} is required by ${file.filePath} but also depends on this file.`);
            continue;
          }
          this.resolveSingle(depFile, resolved, unresolved);
        }
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
  async run(resolvedFileOrder, skipTransform = false) {
    const promises = [];
    for (const file of resolvedFileOrder) {
      if (file.isDone)
        continue;
      let writeData = await this.transformFile(file, true, skipTransform);
      if (writeData !== void 0 && writeData !== null && file.outputPath !== null && file.filePath !== file.outputPath) {
        promises.push(this.dash.outputFileSystem.writeFile(file.outputPath, writeData));
      }
    }
    await Promise.allSettled(promises);
  }
  async transformFile(file, runFinalizeHook = false, skipTransform = false) {
    var _a;
    if (!skipTransform) {
      file.data = (_a = await this.dash.plugins.runTransformHooks(file)) != null ? _a : file.data;
    }
    if (!runFinalizeHook)
      return file.data;
    let writeData = await this.dash.plugins.runFinalizeBuildHooks(file);
    if (writeData === void 0)
      writeData = file.data;
    if (writeData !== void 0 && writeData !== null) {
      if (!isWritableData(writeData)) {
        this.dash.console.warn(`File "${file.filePath}" was not in a writable format: "${typeof writeData}". Trying to JSON.stringify(...) it...`, writeData);
        writeData = JSON.stringify(writeData);
      }
    }
    file.isDone = true;
    return writeData;
  }
}
class Progress {
  constructor(total = 1) {
    this.total = total;
    this.current = 0;
    this.onChangeCbs = /* @__PURE__ */ new Set();
  }
  get percentage() {
    return this.current / this.total;
  }
  onChange(cb) {
    this.onChangeCbs.add(cb);
    return {
      dispose: () => this.onChangeCbs.delete(cb)
    };
  }
  setTotal(total) {
    this.total = total;
    this.current = 0;
    this.onChangeCbs.forEach((cb) => cb(this));
  }
  updateCurrent(current) {
    this.current = current;
    this.onChangeCbs.forEach((cb) => cb(this));
  }
  advance() {
    this.current++;
    this.onChangeCbs.forEach((cb) => cb(this));
  }
  addToTotal(amount) {
    this.total += amount;
    this.onChangeCbs.forEach((cb) => cb(this));
  }
}
class Console {
  constructor(verboseLogs = false) {
    this.verboseLogs = verboseLogs;
    this._timers = /* @__PURE__ */ new Map();
  }
  time(timerName) {
    if (!this.verboseLogs)
      return;
    if (this._timers.has(timerName)) {
      this.warn(`Timer "${timerName}" already exists.`);
      return;
    } else {
      this._timers.set(timerName, Date.now());
    }
  }
  timeEnd(timerName) {
    if (!this.verboseLogs)
      return;
    const time = this._timers.get(timerName);
    if (!time) {
      this.warn(`Timer "${timerName}" does not exist.`);
      return;
    } else {
      this._timers.delete(timerName);
      this.log(`${timerName}: ${Date.now() - time}ms`);
    }
  }
}
class DefaultConsole extends Console {
  constructor(verboseLogs) {
    super(verboseLogs);
  }
  log(...args) {
    console.log(...args);
  }
  error(...args) {
    console.error(...args);
  }
  warn(...args) {
    console.warn(...args);
  }
  info(...args) {
    console.info(...args);
  }
}
class Dash {
  constructor(fileSystem, outputFileSystem, options) {
    var _a;
    this.fileSystem = fileSystem;
    this.options = options;
    this.progress = new Progress();
    this.plugins = new AllPlugins(this);
    this.includedFiles = new IncludedFiles(this);
    this.loadFiles = new LoadFiles(this);
    this.fileOrderResolver = new ResolveFileOrder(this);
    this.fileTransformer = new FileTransformer(this);
    this.buildType = "fullBuild";
    this.outputFileSystem = outputFileSystem != null ? outputFileSystem : fileSystem;
    this.projectRoot = dirname(options.config);
    this.projectConfig = new DashProjectConfig(fileSystem, options.config);
    this.console = (_a = options.console) != null ? _a : new DefaultConsole(options.verbose);
    this.jsRuntime = new JsRuntime(this.fileSystem, [
      ["@molang/expressions", expressions],
      ["@molang/core", { Molang }],
      [
        "molang",
        {
          Molang,
          ...expressions
        }
      ],
      ["@bridge/compiler", { mode: options.mode }]
    ]);
    this.packType = options.packType;
    this.fileType = options.fileType;
  }
  getMode() {
    var _a;
    return (_a = this.options.mode) != null ? _a : "development";
  }
  getCompilerConfigPath() {
    return this.options.compilerConfig;
  }
  get requestJsonData() {
    return this.options.requestJsonData;
  }
  get dashFilePath() {
    return join(this.projectRoot, `.bridge/.dash.${this.getMode()}.json`);
  }
  async setup(setupArg) {
    var _a, _b, _c, _d;
    try {
      await this.projectConfig.setup();
    } catch (err) {
      this.console.error("Failed to load project config: " + err);
    }
    (_a = this.fileType) == null ? void 0 : _a.setProjectConfig(this.projectConfig);
    (_b = this.packType) == null ? void 0 : _b.setProjectConfig(this.projectConfig);
    await ((_c = this.fileType) == null ? void 0 : _c.setup(setupArg));
    await ((_d = this.packType) == null ? void 0 : _d.setup(setupArg));
    await this.plugins.loadPlugins(this.options.pluginEnvironment);
  }
  async reload() {
    try {
      await this.projectConfig.refreshConfig();
    } catch {
    }
    await this.plugins.loadPlugins(this.options.pluginEnvironment);
  }
  get isCompilerActivated() {
    const config = this.projectConfig.get();
    return config.compiler !== void 0 && Array.isArray(config.compiler.plugins);
  }
  async build() {
    this.console.log("Starting compilation...");
    if (!this.isCompilerActivated)
      return;
    this.jsRuntime.clearCache();
    this.buildType = "fullBuild";
    this.includedFiles.removeAll();
    const startTime = Date.now();
    this.progress.setTotal(7);
    this.console.time("[HOOK] Build start");
    await this.plugins.runBuildStartHooks();
    this.console.timeEnd("[HOOK] Build start");
    this.progress.advance();
    await this.includedFiles.loadAll();
    this.progress.advance();
    await this.compileIncludedFiles();
    this.console.time("[HOOK] Build end");
    await this.plugins.runBuildEndHooks();
    this.console.timeEnd("[HOOK] Build end");
    this.progress.advance();
    if (this.getMode() === "development")
      await this.saveDashFile();
    this.includedFiles.resetAll();
    this.progress.advance();
    this.console.log(`Dash compiled ${this.includedFiles.all().length} files in ${Date.now() - startTime}ms!`);
  }
  async updateFiles(filePaths, saveDashFile = true) {
    var _a;
    if (!this.isCompilerActivated || filePaths.length === 0)
      return;
    this.buildType = "hotUpdate";
    this.jsRuntime.clearCache();
    this.progress.setTotal(8);
    this.console.log(`Dash is starting to update ${filePaths.length} files...`);
    await this.includedFiles.load(this.dashFilePath);
    await this.plugins.runBuildStartHooks();
    const files = [];
    for (const filePath of filePaths) {
      let file = this.includedFiles.get(filePath);
      if (!file) {
        [file] = await this.includedFiles.add([filePath]);
      }
      files.push(file);
    }
    this.progress.advance();
    const oldDeps = [];
    for (const file of files) {
      oldDeps.push(/* @__PURE__ */ new Set([...file.requiredFiles]));
    }
    this.progress.advance();
    await this.loadFiles.run(files);
    this.progress.advance();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const newDeps = [...file.requiredFiles].filter((dep) => !oldDeps[i].has(dep));
      newDeps.forEach((dep) => this.includedFiles.query(dep).forEach((depFile) => depFile.addUpdateFile(file)));
      const removedDeps = [...oldDeps[i]].filter((dep) => !file.requiredFiles.has(dep));
      removedDeps.forEach((dep) => this.includedFiles.query(dep).forEach((depFile) => depFile.removeUpdateFile(file)));
    }
    this.progress.advance();
    const filesToLoad = new Set(files.map((file) => [...file.filesToLoadForHotUpdate()]).flat());
    this.console.log(`Dash is loading ${filesToLoad.size} files...`);
    await this.loadFiles.run([...filesToLoad.values()].filter((currFile) => !files.includes(currFile)));
    this.progress.advance();
    const filesToTransform = new Set(files.map((file) => [...file.getHotUpdateChain()]).flat());
    for (const file of filesToLoad) {
      if (file.isDone)
        continue;
      file.data = (_a = await this.plugins.runTransformHooks(file)) != null ? _a : file.data;
      if (!filesToTransform.has(file))
        file.isDone = true;
    }
    this.progress.advance();
    this.console.log(`Dash is compiling ${filesToTransform.size} files...`);
    await this.fileTransformer.run(filesToTransform, true);
    await this.loadFiles.awaitAllFilesCopied();
    this.progress.advance();
    await this.plugins.runBuildEndHooks();
    if (saveDashFile)
      await this.saveDashFile();
    this.includedFiles.resetAll();
    this.console.log(`Dash finished updating ${filesToTransform.size} files!`);
    this.progress.advance();
  }
  async compileFile(filePath, fileData) {
    var _a;
    if (!this.isCompilerActivated)
      return [[], fileData];
    this.buildType = "fileRequest";
    this.jsRuntime.clearCache();
    this.progress.setTotal(7);
    await this.plugins.runBuildStartHooks();
    await this.includedFiles.load(this.dashFilePath);
    let file = this.includedFiles.get(filePath);
    if (!file) {
      [file] = await this.includedFiles.add([filePath]);
    }
    file.setFileHandle({
      getFile: async () => new File([fileData], basename(filePath))
    });
    await this.loadFiles.loadFile(file, false);
    this.progress.advance();
    const filesToLoad = file.filesToLoadForHotUpdate();
    await this.loadFiles.run([...filesToLoad.values()].filter((currFile) => file !== currFile), false);
    this.progress.advance();
    for (const file2 of filesToLoad) {
      if (file2.isDone)
        continue;
      file2.data = (_a = await this.plugins.runTransformHooks(file2)) != null ? _a : file2.data;
    }
    this.progress.advance();
    const transformedData = await this.fileTransformer.transformFile(file, true, true);
    this.progress.advance();
    await this.includedFiles.load(this.dashFilePath);
    this.progress.advance();
    await this.plugins.runBuildEndHooks();
    return [[...filesToLoad].map((file2) => file2.filePath), transformedData];
  }
  async unlinkMultiple(paths, saveDashFile = true, onlyChangeOutput = false) {
    if (!this.isCompilerActivated || paths.length === 0)
      return;
    const errors = [];
    for (const path of paths) {
      await this.unlink(path, false, onlyChangeOutput).catch((err) => errors.push(err));
    }
    if (errors.length > 0) {
      throw errors[0];
    }
    if (saveDashFile)
      await this.saveDashFile();
  }
  async unlink(path, updateDashFile = true, onlyChangeOutput = false) {
    if (!this.isCompilerActivated)
      return;
    const outputPath = await this.getCompilerOutputPath(path);
    if (!outputPath || outputPath === path)
      return;
    if (!onlyChangeOutput) {
      await this.plugins.runBeforeFileUnlinked(path);
      this.includedFiles.remove(path);
    }
    await this.outputFileSystem.unlink(outputPath);
    if (updateDashFile)
      await this.saveDashFile();
  }
  async rename(oldPath, newPath) {
    if (!this.isCompilerActivated)
      return;
    await this.unlink(oldPath, false);
    await this.updateFiles([newPath], false);
    await this.saveDashFile();
  }
  async getCompilerOutputPath(filePath) {
    var _a, _b;
    if (!this.isCompilerActivated)
      return;
    const includedFile = (_a = this.includedFiles.get(filePath)) != null ? _a : new DashFile(this, filePath);
    if (includedFile && includedFile.outputPath !== filePath)
      return (_b = includedFile.outputPath) != null ? _b : void 0;
    const outputPath = await this.plugins.runTransformPathHooks(includedFile);
    if (!outputPath)
      return;
    return outputPath;
  }
  async getFileMetadata(filePath) {
    if (!this.isCompilerActivated)
      return;
    const includedFile = this.includedFiles.get(filePath);
    if (includedFile)
      return includedFile.getAllMetadata();
    return null;
  }
  async getFileDependencies(filePath) {
    if (!this.isCompilerActivated)
      return [];
    await this.includedFiles.load(this.dashFilePath);
    const file = this.includedFiles.get(filePath);
    if (!file)
      return [];
    return [...file.filesToLoadForHotUpdate()].filter((file2) => !file2.isVirtual).map((file2) => file2.filePath).filter((currFilePath) => currFilePath !== null && currFilePath !== filePath);
  }
  async saveDashFile() {
    await this.includedFiles.save(this.dashFilePath);
  }
  async compileIncludedFiles(files = this.includedFiles.all()) {
    this.console.time("Loading files...");
    await this.loadFiles.run(files);
    this.console.timeEnd("Loading files...");
    this.progress.advance();
    this.console.time("Resolving file order...");
    const resolvedFileOrder = this.fileOrderResolver.run(files);
    this.console.timeEnd("Resolving file order...");
    this.progress.advance();
    this.console.time("Transforming files...");
    await this.fileTransformer.run(resolvedFileOrder);
    this.console.timeEnd("Transforming files...");
    this.progress.advance();
    await this.loadFiles.awaitAllFilesCopied();
  }
  async compileAdditionalFiles(filePaths, virtual = true) {
    const virtualFiles = await this.includedFiles.add(filePaths, virtual);
    this.progress.addToTotal(3);
    virtualFiles.forEach((virtual2) => virtual2.reset());
    await this.compileIncludedFiles(virtualFiles);
  }
}
function initRuntimes(wasmLocation) {
  initRuntimes$1(wasmLocation);
  initSwc(wasmLocation);
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
  async directoryHasAnyFile(path) {
    const entries = await this.readdir(path).catch(() => []);
    return entries.length > 0;
  }
  async copyFile(from, to, outputFs = this) {
    const file = await this.readFile(from);
    await outputFs.writeFile(to, new Uint8Array(await file.arrayBuffer()));
  }
  async writeJson(path, content, beautify = true) {
    await this.writeFile(path, JSON.stringify(content, null, beautify ? "	" : 0));
  }
  async readJson(path) {
    const file = await this.readFile(path);
    try {
      return await json5.parse(await file.text());
    } catch {
      throw new Error(`Invalid JSON: ${path}`);
    }
  }
  watchDirectory(path, onChange) {
    console.warn("Watching a directory for changes is not supported on this platform!");
  }
}
export { Command, Component, Console, Dash, DefaultConsole, FileSystem, initRuntimes };

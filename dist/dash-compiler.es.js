import { ProjectConfig } from "mc-project-core";
import { dirname, relative, join, basename } from "path-browserify";
import { CustomMoLang, expressions, MoLang } from "molang";
import { setObjectAt, deepMerge, hashString, get, tokenizeCommand, castType, isMatch } from "bridge-common-utils";
import json5 from "json5";
import { transformSync } from "@swc/wasm-web";
import { loadedWasm, Runtime } from "bridge-js-runtime";
export { initRuntimes } from "bridge-js-runtime";
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
const MoLangPlugin = ({
  fileType,
  projectConfig,
  requestJsonData,
  options,
  console: console2,
  jsRuntime
}) => {
  const resolve = (packId, path) => projectConfig.resolvePackPath(packId, path);
  const customMoLang = new CustomMoLang({});
  const isMoLangFile = (filePath) => filePath == null ? void 0 : filePath.endsWith(".molang");
  const isMoLangScript = (filePath) => filePath == null ? void 0 : filePath.startsWith(projectConfig.resolvePackPath("behaviorPack", "scripts/molang/"));
  const loadMoLangFrom = (filePath) => {
    var _a;
    return (_a = Object.entries(options.include).find(([currentId]) => (fileType == null ? void 0 : fileType.getId(filePath)) === currentId)) == null ? void 0 : _a[1];
  };
  let astTransformers = [];
  return {
    async buildStart() {
      options.include = Object.assign(await requestJsonData("data/packages/minecraftBedrock/location/validMoLang.json"), options.include);
    },
    transformPath(filePath) {
      if (isMoLangFile(filePath) || isMoLangScript(filePath))
        return null;
    },
    async read(filePath, fileHandle) {
      if ((isMoLangFile(filePath) || isMoLangScript(filePath)) && fileHandle) {
        const file = await fileHandle.getFile();
        return await (file == null ? void 0 : file.text());
      } else if (loadMoLangFrom(filePath) && filePath.endsWith(".json") && fileHandle) {
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
      if (isMoLangFile(filePath) && fileContent) {
        customMoLang.parse(fileContent);
      } else if (isMoLangScript(filePath)) {
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
      if (loadMoLangFrom(filePath)) {
        return [
          resolve("behaviorPack", "scripts/molang/**/*.[jt]s"),
          resolve("behaviorPack", "molang/**/*.molang"),
          resolve("resourcePack", "molang/**/*.molang")
        ];
      }
    },
    async transform(filePath, fileContent) {
      const includePaths = loadMoLangFrom(filePath);
      if (includePaths && includePaths.length > 0) {
        includePaths.forEach((includePath) => setObjectAt(includePath, fileContent, (molang) => {
          if (typeof molang !== "string")
            return molang;
          if (molang[0] === "/" || molang[0] === "@")
            return molang;
          if (astTransformers.length > 0) {
            let ast = null;
            try {
              ast = customMoLang.parse(molang);
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
            return customMoLang.transform(molang);
          } catch (err) {
            if (options.buildType !== "fileRequest")
              console2.error(`Error within file "${filePath}"; script "${molang}": ${err}`);
            return molang;
          }
        }));
      }
    },
    finalizeBuild(filePath, fileContent) {
      if (loadMoLangFrom(filePath) && typeof fileContent !== "string")
        return JSON.stringify(fileContent, null, "	");
    },
    buildEnd() {
      astTransformers = [];
    }
  };
};
const EntityIdentifierAlias = ({ fileType }) => {
  return {
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
    }).catch(() => {
      this.console.error(`Failed to execute component ${filePath}`);
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
    this.animations = [];
    this.animationControllers = [];
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
      const lootId = `loot_tables/bridge/${this.getShortAnimName("lt", fileName, this.serverFiles.length)}.json`;
      this.serverFiles.push([lootId, lootTableDef]);
      return lootId;
    };
    const tradeTable = (tradeTableDef) => {
      const tradeId = `trading/bridge/${this.getShortAnimName("tt", fileName, this.serverFiles.length)}.json`;
      this.serverFiles.push([tradeId, tradeTableDef]);
      return tradeId;
    };
    const recipe = (recipeDef) => {
      this.serverFiles.push([
        `recipes/bridge/${this.getShortAnimName("recipe", fileName, this.serverFiles.length)}.json`,
        recipeDef
      ]);
    };
    const spawnRule = (spawnRuleDef) => {
      this.serverFiles.push([
        `spawn_rules/bridge/${this.getShortAnimName("sr", fileName, this.serverFiles.length)}.json`,
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
            this.clientFiles[`entity/bridge/${fileName}.json`] = {
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
          create: (template, location2, operation) => this.createOnPlayer.push([
            location2 != null ? location2 : `minecraft:entity`,
            template,
            operation
          ])
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
  async processAdditionalFiles(filePath, fileContent) {
    var _a, _b, _c, _d, _e, _f;
    const bpRoot = (_b = (_a = this.projectConfig) == null ? void 0 : _a.getRelativePackRoot("behaviorPack")) != null ? _b : "BP";
    const rpRoot = (_c = this.projectConfig) == null ? void 0 : _c.getRelativePackRoot("resourcePack");
    const identifier = (_f = (_e = (_d = fileContent[`minecraft:${this.fileType}`]) == null ? void 0 : _d.description) == null ? void 0 : _e.identifier) != null ? _f : "bridge:no_identifier";
    const fileName = await hashString(`${this.name}/${identifier}`);
    const animFileName = `${bpRoot}/animations/bridge/${fileName}.json`;
    const animControllerFileName = `${bpRoot}/animation_controllers/bridge/${fileName}.json`;
    if (identifier === "minecraft:player") {
      this.createOnPlayer.forEach(([location, template, operation]) => {
        this.create(fileContent, template, location, operation);
      });
    }
    if (!rpRoot) {
      this.clientFiles = {};
      this.console.error(`[${this.name}] Dash was unable to load the root of your resource pack and therefore cannot generate client files for this component.`);
    }
    return {
      [animFileName]: {
        baseFile: filePath,
        fileContent: this.createAnimations(fileName, fileContent)
      },
      [animControllerFileName]: {
        baseFile: filePath,
        fileContent: this.createAnimationControllers(fileName, fileContent)
      },
      [join(bpRoot, `dialogue/bridge/${fileName}.json`)]: this.dialogueScenes[fileName] && this.dialogueScenes[fileName].length > 0 ? {
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
    if (this.animations.length === 0)
      return;
    let id = 0;
    const animations = { format_version: "1.10.0", animations: {} };
    for (const [anim, condition] of this.animations) {
      if (!anim) {
        id++;
        continue;
      }
      const animId = this.getAnimName("animation", fileName, id);
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
    if (this.animationControllers.length === 0)
      return;
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
      const animId = this.getAnimName("controller.animation", fileName, id);
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
  getAnimName(prefix, fileName, id) {
    return `${prefix}.${fileName}_${id}`;
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
    options,
    jsRuntime,
    targetVersion,
    fileType: fileTypeLib
  }) => {
    const isPlayerFile = (filePath, getAliases2) => filePath && fileType === "item" && (fileTypeLib == null ? void 0 : fileTypeLib.getId(filePath)) === "entity" && getAliases2(filePath).includes("minecraft:player");
    const isComponent = (filePath) => options.v1CompatMode ? filePath == null ? void 0 : filePath.includes(`/components/`) : filePath && (fileTypeLib == null ? void 0 : fileTypeLib.getId(filePath)) === `customComponent` && filePath.includes(`/${fileType}/`);
    const mayUseComponent = (filePath) => filePath && (fileTypeLib == null ? void 0 : fileTypeLib.getId(filePath)) === fileType;
    return {
      buildStart() {
        usedComponents.clear();
        createAdditionalFiles = {};
      },
      transformPath(filePath) {
        if (isComponent(filePath) && options.buildType !== "fileRequest")
          return null;
      },
      async read(filePath, fileHandle) {
        if (!fileHandle)
          return createAdditionalFiles[filePath] ? json5.parse(createAdditionalFiles[filePath].fileContent) : void 0;
        if (isComponent(filePath) && filePath.endsWith(".js")) {
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
        if (isComponent(filePath) && typeof fileContent === "string") {
          const component = new Component(console2, fileType, fileContent, options.mode, !!options.v1CompatMode, targetVersion);
          component.setProjectConfig(projectConfig);
          const loadedCorrectly = await component.load(jsRuntime, filePath);
          return loadedCorrectly ? component : fileContent;
        }
      },
      async registerAliases(filePath, fileContent) {
        if (isComponent(filePath)) {
          return [`${fileType}Component#${fileContent.name}`];
        }
      },
      async require(filePath, fileContent) {
        if (isPlayerFile(filePath, getAliases))
          return [
            `.${projectConfig.getRelativePackRoot("behaviorPack")}/components/item/**/*.[jt]s`,
            `.${projectConfig.getRelativePackRoot("behaviorPack")}/items/**/*.json`
          ];
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
        if (isPlayerFile(filePath, getAliases)) {
          const itemComponents = Object.entries(dependencies).filter(([depName]) => depName.startsWith("itemComponent#")).map(([_, component]) => component);
          for (const component of itemComponents) {
            if (!component)
              return;
            createAdditionalFiles = deepMerge(createAdditionalFiles, await component.processAdditionalFiles(filePath, fileContent));
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
        if (isComponent(filePath) && fileContent) {
          return fileContent.toString();
        } else if (mayUseComponent(filePath) || createAdditionalFiles[filePath])
          return JSON.stringify(fileContent, null, "	");
      },
      async buildEnd() {
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
  const loadCommandsFor = (filePath) => {
    var _a;
    return (_a = Object.entries(options.include).find(([fileType]) => fileTypeLib.getId(filePath) === fileType)) == null ? void 0 : _a[1];
  };
  const withSlashPrefix = (filePath) => {
    var _a, _b, _c;
    return (_c = (_b = (_a = fileTypeLib.get(filePath)) == null ? void 0 : _a.meta) == null ? void 0 : _b.commandsUseSlash) != null ? _c : false;
  };
  return {
    async buildStart() {
      options.include = Object.assign(await requestJsonData("data/packages/minecraftBedrock/location/validCommand.json"), options.include);
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
    async transformPath(filePath) {
      if (!(filePath == null ? void 0 : filePath.endsWith(".ts")))
        return;
      return `${filePath.slice(0, -3)}.js`;
    },
    async read(filePath, fileHandle) {
      if (!filePath.endsWith(".ts") || !fileHandle)
        return;
      const file = await fileHandle.getFile();
      return await (file == null ? void 0 : file.text());
    },
    async load(filePath, fileContent) {
      if (!filePath.endsWith(".ts"))
        return;
      await loadedWasm;
      return transformSync(fileContent, {
        filename: basename(filePath),
        sourceMaps: (options == null ? void 0 : options.inlineSourceMap) ? "inline" : void 0,
        jsc: {
          parser: {
            syntax: "typescript",
            preserveAllComments: false,
            topLevelAwait: true
          },
          target: "es2020"
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
  const toTransform = [];
  for (const ft of fileType.all) {
    if (ft.formatVersionMap)
      toTransform.push(ft.id);
  }
  const needsTransformation = (filePath) => filePath && toTransform.includes(fileType.getId(filePath));
  return {
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
  constructor(console2, baseDir) {
    this.console = console2;
    this.baseDir = baseDir;
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
    const resolvedPath = this.baseDir ? join(this.baseDir, filePath) : filePath;
    if (this.files.has(resolvedPath)) {
      this.console.warn(`Omitting file "${resolvedPath}" from collection because it would overwrite a previously generated file!`);
      return;
    }
    this.files.set(resolvedPath, fileContent);
  }
  has(filePath) {
    return this.files.has(filePath);
  }
  addFrom(collection) {
    for (const [filePath, fileContent] of collection.getAll()) {
      this.add(filePath, fileContent);
    }
  }
}
function createModule({
  generatorPath,
  omitUsedTemplates,
  fileSystem,
  console: console2
}) {
  return {
    useTemplate: (filePath, { omitTemplate = true } = {}) => {
      const templatePath = join(dirname(generatorPath), filePath);
      if (omitTemplate)
        omitUsedTemplates.add(templatePath);
      if (filePath.endsWith(".json"))
        return fileSystem.readJson(templatePath);
      else
        return fileSystem.readFile(templatePath).then((file) => file.text());
    },
    createCollection: () => new Collection(console2, dirname(generatorPath))
  };
}
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
    return (_d = (_c = (_b = (_a2 = fileType.get(filePath)) == null ? void 0 : _a2.detect) == null ? void 0 : _b.fileExtensions) == null ? void 0 : _c[0]) != null ? _d : ".txt";
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
      const currentTemplates = /* @__PURE__ */ new Set();
      jsRuntime.registerModule("@bridge/generate", createModule({
        generatorPath: filePath,
        fileSystem,
        omitUsedTemplates: currentTemplates,
        console: console2
      }));
      if (isGeneratorScript(filePath)) {
        if (!fileContent)
          return null;
        const module = await jsRuntime.run(filePath, {
          console: console2
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
      }
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
        if (fileContent instanceof Collection) {
          fileCollection.addFrom(fileContent);
          fileMetadata.set("generatedFiles", fileContent.getAll().map(([filePath2]) => filePath2));
          return null;
        }
        fileMetadata.set("generatedFiles", [transformPath(filePath)]);
        return typeof fileContent === "object" ? JSON.stringify(fileContent) : fileContent;
      }
    },
    async buildEnd() {
      jsRuntime.deleteModule("@bridge/generate");
      if (filesToUpdate.size > 0)
        await compileFiles([...filesToUpdate].filter((filePath) => !fileCollection.has(filePath)), false);
      if (fileCollection.hasFiles)
        await compileFiles(fileCollection.getAll().map(([filePath]) => filePath));
    },
    async beforeFileUnlinked(filePath) {
      var _a2, _b;
      if (isGeneratorScript(filePath)) {
        const fileMetadata = getFileMetadata(filePath);
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
    return this.fs.readFile(filePath).then((file) => file.text());
  }
  deleteModule(moduleName) {
    this.baseModules.delete(moduleName);
  }
}
const builtInPlugins = {
  simpleRewrite: SimpleRewrite,
  rewriteForPackaging: RewriteForPackaging,
  moLang: MoLangPlugin,
  molang: MoLangPlugin,
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
class AllPlugins {
  constructor(dash) {
    this.dash = dash;
    this.plugins = [];
    this.pluginRuntime = new JsRuntime(this.dash.fileSystem);
  }
  async loadPlugins(scriptEnv = {}) {
    var _a, _b;
    this.plugins = [];
    this.pluginRuntime.clearCache();
    const extensions = [
      ...(await this.dash.fileSystem.readdir(join(this.dash.projectRoot, ".bridge/extensions")).catch(() => [])).map((entry) => entry.kind === "directory" ? join(this.dash.projectRoot, ".bridge/extensions", entry.name) : void 0),
      ...(await this.dash.fileSystem.readdir("extensions").catch(() => [])).map((entry) => entry.kind === "directory" ? join("extensions", entry.name) : void 0)
    ];
    const plugins = {};
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
    const usedPlugins = (_b = (await this.getCompilerOptions()).plugins) != null ? _b : [];
    for (const usedPlugin of usedPlugins) {
      const pluginId = typeof usedPlugin === "string" ? usedPlugin : usedPlugin[0];
      const pluginOpts = typeof usedPlugin === "string" ? {} : usedPlugin[1];
      if (plugins[pluginId]) {
        const module = await this.pluginRuntime.run(plugins[pluginId], {
          console: this.dash.console,
          ...scriptEnv
        }).catch((err) => {
          this.dash.console.error(`Failed to execute plugin ${pluginId}: ${err}`);
          return null;
        });
        if (!module)
          continue;
        if (typeof module.__default__ === "function")
          this.plugins.push(new Plugin(this.dash, pluginId, module.__default__(await this.getPluginContext(pluginId, pluginOpts))));
        else
          this.dash.console.error(`Plugin ${pluginId} is invalid: It does not provide a function as a default export.`);
      } else if (builtInPlugins[pluginId]) {
        this.plugins.push(new Plugin(this.dash, pluginId, builtInPlugins[pluginId](await this.getPluginContext(pluginId, pluginOpts))));
      } else {
        this.dash.console.error(`Unknown compiler plugin: ${pluginId}`);
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
  async getPluginContext(pluginId, pluginOpts = {}) {
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
      getFileMetadata: (filePath) => {
        const file = this.dash.includedFiles.get(filePath);
        if (!file)
          throw new Error(`File ${filePath} to add metadata to not found`);
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
      const newPath = await plugin.runTransformPathHook(currentFilePath);
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
    const aliases = /* @__PURE__ */ new Set();
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
    const requiredFiles = /* @__PURE__ */ new Set();
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
    const dependencies = Object.fromEntries([...file.requiredFiles].map((query) => this.dash.includedFiles.query(query)).flat().map((file2) => [
      [file2.filePath, file2.data],
      ...[...file2.aliases].map((alias) => [alias, file2.data])
    ]).flat());
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
      if (finalizedData !== void 0)
        return finalizedData;
    }
  }
  async runBuildEndHooks() {
    for (const plugin of this.plugins) {
      await plugin.runBuildEndHook();
    }
  }
  async runBeforeFileUnlinked(filePath) {
    for (const plugin of this.plugins) {
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
    this.outputPath = filePath;
    if (!this.isVirtual)
      this.setDefaultFileHandle();
  }
  setFileHandle(fileHandle) {
    this.fileHandle = fileHandle;
  }
  setDefaultFileHandle() {
    this.setFileHandle({
      getFile: () => this.dash.fileSystem.readFile(this.filePath).catch(() => null)
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
  async processAfterLoad(writeFiles) {
    if (this.data === null || this.data === void 0) {
      this.isDone = true;
      if (this.filePath !== this.outputPath && this.outputPath !== null && !this.isVirtual && writeFiles) {
        const file = await this.dash.fileSystem.readFile(this.filePath);
        await this.dash.outputFileSystem.writeFile(this.outputPath, new Uint8Array(await file.arrayBuffer()));
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
  query(query) {
    if (isGlob(query))
      return this.queryGlob(query);
    const aliasedFile = this.aliases.get(query);
    if (aliasedFile)
      return [aliasedFile];
    const file = this.files.get(query);
    if (file)
      return [file];
    return [];
  }
  addAlias(alias, DashFile2) {
    this.aliases.set(alias, DashFile2);
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
    this.queryCache = /* @__PURE__ */ new Map();
    const allFiles = /* @__PURE__ */ new Set();
    const packPaths = this.dash.projectConfig.getAvailablePackPaths();
    for (const packPath of packPaths) {
      const files = await this.dash.fileSystem.allFiles(packPath).catch((err) => {
        this.dash.console.warn(err);
        return [];
      });
      for (const file of files)
        allFiles.add(file);
    }
    const includeFiles = await this.dash.plugins.runIncludeHooks();
    for (const includedFile of includeFiles) {
      if (typeof includedFile === "string")
        allFiles.add(includedFile);
      else
        this.addOne(includedFile[0], includedFile[1].isVirtual);
    }
    this.add([...allFiles]);
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
    const sFiles = await this.dash.fileSystem.readJson(filePath);
    const files = [];
    for (const sFile of sFiles) {
      const file = new DashFile(this.dash, sFile.filePath, sFile.isVirtual);
      file.setAliases(new Set(sFile.aliases));
      file.setRequiredFiles(new Set(sFile.requiredFiles));
      file.setMetadata(sFile.metadata);
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
  }
  async run(files, writeFiles = true) {
    for (const file of files) {
      if (file.isDone)
        continue;
      await this.loadFile(file, writeFiles);
    }
    for (const file of files) {
      if (file.isDone)
        continue;
      await this.loadRequiredFiles(file);
    }
  }
  async loadFile(file, writeFiles = true) {
    var _a;
    const [outputPath, readData] = await Promise.all([
      this.dash.plugins.runTransformPathHooks(file.filePath),
      this.dash.plugins.runReadHooks(file.filePath, file.fileHandle)
    ]);
    file.setOutputPath(outputPath);
    file.setReadData(readData);
    await file.processAfterLoad(writeFiles);
    if (file.isDone)
      return;
    file.setReadData((_a = await this.dash.plugins.runLoadHooks(file.filePath, file.data)) != null ? _a : file.data);
    const aliases = await this.dash.plugins.runRegisterAliasesHooks(file.filePath, file.data);
    file.setAliases(aliases);
  }
  async loadRequiredFiles(file) {
    const requiredFiles = await this.dash.plugins.runRequireHooks(file.filePath, file.data);
    file.setRequiredFiles(requiredFiles);
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
    for (const file of resolvedFileOrder) {
      if (file.isDone)
        continue;
      let writeData = await this.transformFile(file, true, skipTransform);
      if (writeData !== void 0 && writeData !== null && file.outputPath) {
        await this.dash.outputFileSystem.writeFile(file.outputPath, writeData);
      }
    }
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
  constructor() {
    this._timers = /* @__PURE__ */ new Map();
  }
  time(timerName) {
    if (this._timers.has(timerName)) {
      this.warn(`Timer "${timerName}" already exists.`);
      return;
    } else {
      this._timers.set(timerName, Date.now());
    }
  }
  timeEnd(timerName) {
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
    this.console = (_a = options.console) != null ? _a : new DefaultConsole();
    this.jsRuntime = new JsRuntime(this.fileSystem, [
      ["@molang/expressions", expressions],
      ["@molang/core", { MoLang }],
      [
        "molang",
        {
          MoLang,
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
    await this.plugins.runBuildStartHooks();
    this.progress.advance();
    await this.includedFiles.loadAll();
    this.progress.advance();
    await this.compileIncludedFiles();
    await this.plugins.runBuildEndHooks();
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
        [file] = this.includedFiles.add([filePath]);
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
      [file] = this.includedFiles.add([filePath]);
    }
    file.setFileHandle({
      getFile: async () => new File([fileData], basename(filePath))
    });
    await this.loadFiles.loadFile(file, false);
    await this.loadFiles.loadRequiredFiles(file);
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
    var _a;
    if (!this.isCompilerActivated)
      return;
    const includedFile = this.includedFiles.get(filePath);
    if (includedFile && includedFile.outputPath !== filePath)
      return (_a = includedFile.outputPath) != null ? _a : void 0;
    const outputPath = await this.plugins.runTransformPathHooks(filePath);
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
    return [...file.filesToLoadForHotUpdate()].map((file2) => file2.isVirtual ? file2.outputPath : file2.filePath).filter((currFilePath) => currFilePath !== null && currFilePath !== filePath);
  }
  async saveDashFile() {
    await this.includedFiles.save(this.dashFilePath);
  }
  async compileIncludedFiles(files = this.includedFiles.all()) {
    await this.loadFiles.run(files);
    this.progress.advance();
    const resolvedFileOrder = this.fileOrderResolver.run(files);
    this.progress.advance();
    await this.fileTransformer.run(resolvedFileOrder);
    this.progress.advance();
  }
  async compileAdditionalFiles(filePaths, virtual = true) {
    const virtualFiles = this.includedFiles.add(filePaths, virtual);
    this.progress.addToTotal(3);
    virtualFiles.forEach((virtual2) => virtual2.reset());
    await this.compileIncludedFiles(virtualFiles);
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
export { Command, Component, Console, Dash, DefaultConsole, FileSystem };

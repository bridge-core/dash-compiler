import { ProjectConfig } from "mc-project-core";
import { dirname, relative, join, basename } from "path-browserify";
import { CustomMoLang, expressions, MoLang } from "molang";
import { setObjectAt, deepMerge, hashString, get, tokenizeCommand, castType, isMatch } from "bridge-common-utils";
import require$$2 from "fs";
import { Runtime } from "bridge-js-runtime";
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
        return join(pathPrefixWithPack(pack.id, pack.defaultPackPath), relPath);
    }
  };
};
var Space_Separator = /[\u1680\u2000-\u200A\u202F\u205F\u3000]/;
var ID_Start = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE83\uDE86-\uDE89\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]/;
var ID_Continue = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF9\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDE00-\uDE3E\uDE47\uDE50-\uDE83\uDE86-\uDE99\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/;
var unicode = {
  Space_Separator,
  ID_Start,
  ID_Continue
};
var util = {
  isSpaceSeparator(c2) {
    return typeof c2 === "string" && unicode.Space_Separator.test(c2);
  },
  isIdStartChar(c2) {
    return typeof c2 === "string" && (c2 >= "a" && c2 <= "z" || c2 >= "A" && c2 <= "Z" || c2 === "$" || c2 === "_" || unicode.ID_Start.test(c2));
  },
  isIdContinueChar(c2) {
    return typeof c2 === "string" && (c2 >= "a" && c2 <= "z" || c2 >= "A" && c2 <= "Z" || c2 >= "0" && c2 <= "9" || c2 === "$" || c2 === "_" || c2 === "\u200C" || c2 === "\u200D" || unicode.ID_Continue.test(c2));
  },
  isDigit(c2) {
    return typeof c2 === "string" && /[0-9]/.test(c2);
  },
  isHexDigit(c2) {
    return typeof c2 === "string" && /[0-9A-Fa-f]/.test(c2);
  }
};
let source;
let parseState;
let stack;
let pos;
let line;
let column;
let token;
let key;
let root;
var parse = function parse2(text, reviver) {
  source = String(text);
  parseState = "start";
  stack = [];
  pos = 0;
  line = 1;
  column = 0;
  token = void 0;
  key = void 0;
  root = void 0;
  do {
    token = lex();
    parseStates[parseState]();
  } while (token.type !== "eof");
  if (typeof reviver === "function") {
    return internalize({ "": root }, "", reviver);
  }
  return root;
};
function internalize(holder, name, reviver) {
  const value = holder[name];
  if (value != null && typeof value === "object") {
    for (const key2 in value) {
      const replacement = internalize(value, key2, reviver);
      if (replacement === void 0) {
        delete value[key2];
      } else {
        value[key2] = replacement;
      }
    }
  }
  return reviver.call(holder, name, value);
}
let lexState;
let buffer;
let doubleQuote;
let sign;
let c;
function lex() {
  lexState = "default";
  buffer = "";
  doubleQuote = false;
  sign = 1;
  for (; ; ) {
    c = peek();
    const token2 = lexStates[lexState]();
    if (token2) {
      return token2;
    }
  }
}
function peek() {
  if (source[pos]) {
    return String.fromCodePoint(source.codePointAt(pos));
  }
}
function read() {
  const c2 = peek();
  if (c2 === "\n") {
    line++;
    column = 0;
  } else if (c2) {
    column += c2.length;
  } else {
    column++;
  }
  if (c2) {
    pos += c2.length;
  }
  return c2;
}
const lexStates = {
  default() {
    switch (c) {
      case "	":
      case "\v":
      case "\f":
      case " ":
      case "\xA0":
      case "\uFEFF":
      case "\n":
      case "\r":
      case "\u2028":
      case "\u2029":
        read();
        return;
      case "/":
        read();
        lexState = "comment";
        return;
      case void 0:
        read();
        return newToken("eof");
    }
    if (util.isSpaceSeparator(c)) {
      read();
      return;
    }
    return lexStates[parseState]();
  },
  comment() {
    switch (c) {
      case "*":
        read();
        lexState = "multiLineComment";
        return;
      case "/":
        read();
        lexState = "singleLineComment";
        return;
    }
    throw invalidChar(read());
  },
  multiLineComment() {
    switch (c) {
      case "*":
        read();
        lexState = "multiLineCommentAsterisk";
        return;
      case void 0:
        throw invalidChar(read());
    }
    read();
  },
  multiLineCommentAsterisk() {
    switch (c) {
      case "*":
        read();
        return;
      case "/":
        read();
        lexState = "default";
        return;
      case void 0:
        throw invalidChar(read());
    }
    read();
    lexState = "multiLineComment";
  },
  singleLineComment() {
    switch (c) {
      case "\n":
      case "\r":
      case "\u2028":
      case "\u2029":
        read();
        lexState = "default";
        return;
      case void 0:
        read();
        return newToken("eof");
    }
    read();
  },
  value() {
    switch (c) {
      case "{":
      case "[":
        return newToken("punctuator", read());
      case "n":
        read();
        literal("ull");
        return newToken("null", null);
      case "t":
        read();
        literal("rue");
        return newToken("boolean", true);
      case "f":
        read();
        literal("alse");
        return newToken("boolean", false);
      case "-":
      case "+":
        if (read() === "-") {
          sign = -1;
        }
        lexState = "sign";
        return;
      case ".":
        buffer = read();
        lexState = "decimalPointLeading";
        return;
      case "0":
        buffer = read();
        lexState = "zero";
        return;
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        buffer = read();
        lexState = "decimalInteger";
        return;
      case "I":
        read();
        literal("nfinity");
        return newToken("numeric", Infinity);
      case "N":
        read();
        literal("aN");
        return newToken("numeric", NaN);
      case '"':
      case "'":
        doubleQuote = read() === '"';
        buffer = "";
        lexState = "string";
        return;
    }
    throw invalidChar(read());
  },
  identifierNameStartEscape() {
    if (c !== "u") {
      throw invalidChar(read());
    }
    read();
    const u = unicodeEscape();
    switch (u) {
      case "$":
      case "_":
        break;
      default:
        if (!util.isIdStartChar(u)) {
          throw invalidIdentifier();
        }
        break;
    }
    buffer += u;
    lexState = "identifierName";
  },
  identifierName() {
    switch (c) {
      case "$":
      case "_":
      case "\u200C":
      case "\u200D":
        buffer += read();
        return;
      case "\\":
        read();
        lexState = "identifierNameEscape";
        return;
    }
    if (util.isIdContinueChar(c)) {
      buffer += read();
      return;
    }
    return newToken("identifier", buffer);
  },
  identifierNameEscape() {
    if (c !== "u") {
      throw invalidChar(read());
    }
    read();
    const u = unicodeEscape();
    switch (u) {
      case "$":
      case "_":
      case "\u200C":
      case "\u200D":
        break;
      default:
        if (!util.isIdContinueChar(u)) {
          throw invalidIdentifier();
        }
        break;
    }
    buffer += u;
    lexState = "identifierName";
  },
  sign() {
    switch (c) {
      case ".":
        buffer = read();
        lexState = "decimalPointLeading";
        return;
      case "0":
        buffer = read();
        lexState = "zero";
        return;
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        buffer = read();
        lexState = "decimalInteger";
        return;
      case "I":
        read();
        literal("nfinity");
        return newToken("numeric", sign * Infinity);
      case "N":
        read();
        literal("aN");
        return newToken("numeric", NaN);
    }
    throw invalidChar(read());
  },
  zero() {
    switch (c) {
      case ".":
        buffer += read();
        lexState = "decimalPoint";
        return;
      case "e":
      case "E":
        buffer += read();
        lexState = "decimalExponent";
        return;
      case "x":
      case "X":
        buffer += read();
        lexState = "hexadecimal";
        return;
    }
    return newToken("numeric", sign * 0);
  },
  decimalInteger() {
    switch (c) {
      case ".":
        buffer += read();
        lexState = "decimalPoint";
        return;
      case "e":
      case "E":
        buffer += read();
        lexState = "decimalExponent";
        return;
    }
    if (util.isDigit(c)) {
      buffer += read();
      return;
    }
    return newToken("numeric", sign * Number(buffer));
  },
  decimalPointLeading() {
    if (util.isDigit(c)) {
      buffer += read();
      lexState = "decimalFraction";
      return;
    }
    throw invalidChar(read());
  },
  decimalPoint() {
    switch (c) {
      case "e":
      case "E":
        buffer += read();
        lexState = "decimalExponent";
        return;
    }
    if (util.isDigit(c)) {
      buffer += read();
      lexState = "decimalFraction";
      return;
    }
    return newToken("numeric", sign * Number(buffer));
  },
  decimalFraction() {
    switch (c) {
      case "e":
      case "E":
        buffer += read();
        lexState = "decimalExponent";
        return;
    }
    if (util.isDigit(c)) {
      buffer += read();
      return;
    }
    return newToken("numeric", sign * Number(buffer));
  },
  decimalExponent() {
    switch (c) {
      case "+":
      case "-":
        buffer += read();
        lexState = "decimalExponentSign";
        return;
    }
    if (util.isDigit(c)) {
      buffer += read();
      lexState = "decimalExponentInteger";
      return;
    }
    throw invalidChar(read());
  },
  decimalExponentSign() {
    if (util.isDigit(c)) {
      buffer += read();
      lexState = "decimalExponentInteger";
      return;
    }
    throw invalidChar(read());
  },
  decimalExponentInteger() {
    if (util.isDigit(c)) {
      buffer += read();
      return;
    }
    return newToken("numeric", sign * Number(buffer));
  },
  hexadecimal() {
    if (util.isHexDigit(c)) {
      buffer += read();
      lexState = "hexadecimalInteger";
      return;
    }
    throw invalidChar(read());
  },
  hexadecimalInteger() {
    if (util.isHexDigit(c)) {
      buffer += read();
      return;
    }
    return newToken("numeric", sign * Number(buffer));
  },
  string() {
    switch (c) {
      case "\\":
        read();
        buffer += escape();
        return;
      case '"':
        if (doubleQuote) {
          read();
          return newToken("string", buffer);
        }
        buffer += read();
        return;
      case "'":
        if (!doubleQuote) {
          read();
          return newToken("string", buffer);
        }
        buffer += read();
        return;
      case "\n":
      case "\r":
        throw invalidChar(read());
      case "\u2028":
      case "\u2029":
        separatorChar(c);
        break;
      case void 0:
        throw invalidChar(read());
    }
    buffer += read();
  },
  start() {
    switch (c) {
      case "{":
      case "[":
        return newToken("punctuator", read());
    }
    lexState = "value";
  },
  beforePropertyName() {
    switch (c) {
      case "$":
      case "_":
        buffer = read();
        lexState = "identifierName";
        return;
      case "\\":
        read();
        lexState = "identifierNameStartEscape";
        return;
      case "}":
        return newToken("punctuator", read());
      case '"':
      case "'":
        doubleQuote = read() === '"';
        lexState = "string";
        return;
    }
    if (util.isIdStartChar(c)) {
      buffer += read();
      lexState = "identifierName";
      return;
    }
    throw invalidChar(read());
  },
  afterPropertyName() {
    if (c === ":") {
      return newToken("punctuator", read());
    }
    throw invalidChar(read());
  },
  beforePropertyValue() {
    lexState = "value";
  },
  afterPropertyValue() {
    switch (c) {
      case ",":
      case "}":
        return newToken("punctuator", read());
    }
    throw invalidChar(read());
  },
  beforeArrayValue() {
    if (c === "]") {
      return newToken("punctuator", read());
    }
    lexState = "value";
  },
  afterArrayValue() {
    switch (c) {
      case ",":
      case "]":
        return newToken("punctuator", read());
    }
    throw invalidChar(read());
  },
  end() {
    throw invalidChar(read());
  }
};
function newToken(type, value) {
  return {
    type,
    value,
    line,
    column
  };
}
function literal(s) {
  for (const c2 of s) {
    const p = peek();
    if (p !== c2) {
      throw invalidChar(read());
    }
    read();
  }
}
function escape() {
  const c2 = peek();
  switch (c2) {
    case "b":
      read();
      return "\b";
    case "f":
      read();
      return "\f";
    case "n":
      read();
      return "\n";
    case "r":
      read();
      return "\r";
    case "t":
      read();
      return "	";
    case "v":
      read();
      return "\v";
    case "0":
      read();
      if (util.isDigit(peek())) {
        throw invalidChar(read());
      }
      return "\0";
    case "x":
      read();
      return hexEscape();
    case "u":
      read();
      return unicodeEscape();
    case "\n":
    case "\u2028":
    case "\u2029":
      read();
      return "";
    case "\r":
      read();
      if (peek() === "\n") {
        read();
      }
      return "";
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
      throw invalidChar(read());
    case void 0:
      throw invalidChar(read());
  }
  return read();
}
function hexEscape() {
  let buffer2 = "";
  let c2 = peek();
  if (!util.isHexDigit(c2)) {
    throw invalidChar(read());
  }
  buffer2 += read();
  c2 = peek();
  if (!util.isHexDigit(c2)) {
    throw invalidChar(read());
  }
  buffer2 += read();
  return String.fromCodePoint(parseInt(buffer2, 16));
}
function unicodeEscape() {
  let buffer2 = "";
  let count = 4;
  while (count-- > 0) {
    const c2 = peek();
    if (!util.isHexDigit(c2)) {
      throw invalidChar(read());
    }
    buffer2 += read();
  }
  return String.fromCodePoint(parseInt(buffer2, 16));
}
const parseStates = {
  start() {
    if (token.type === "eof") {
      throw invalidEOF();
    }
    push();
  },
  beforePropertyName() {
    switch (token.type) {
      case "identifier":
      case "string":
        key = token.value;
        parseState = "afterPropertyName";
        return;
      case "punctuator":
        pop();
        return;
      case "eof":
        throw invalidEOF();
    }
  },
  afterPropertyName() {
    if (token.type === "eof") {
      throw invalidEOF();
    }
    parseState = "beforePropertyValue";
  },
  beforePropertyValue() {
    if (token.type === "eof") {
      throw invalidEOF();
    }
    push();
  },
  beforeArrayValue() {
    if (token.type === "eof") {
      throw invalidEOF();
    }
    if (token.type === "punctuator" && token.value === "]") {
      pop();
      return;
    }
    push();
  },
  afterPropertyValue() {
    if (token.type === "eof") {
      throw invalidEOF();
    }
    switch (token.value) {
      case ",":
        parseState = "beforePropertyName";
        return;
      case "}":
        pop();
    }
  },
  afterArrayValue() {
    if (token.type === "eof") {
      throw invalidEOF();
    }
    switch (token.value) {
      case ",":
        parseState = "beforeArrayValue";
        return;
      case "]":
        pop();
    }
  },
  end() {
  }
};
function push() {
  let value;
  switch (token.type) {
    case "punctuator":
      switch (token.value) {
        case "{":
          value = {};
          break;
        case "[":
          value = [];
          break;
      }
      break;
    case "null":
    case "boolean":
    case "numeric":
    case "string":
      value = token.value;
      break;
  }
  if (root === void 0) {
    root = value;
  } else {
    const parent = stack[stack.length - 1];
    if (Array.isArray(parent)) {
      parent.push(value);
    } else {
      parent[key] = value;
    }
  }
  if (value !== null && typeof value === "object") {
    stack.push(value);
    if (Array.isArray(value)) {
      parseState = "beforeArrayValue";
    } else {
      parseState = "beforePropertyName";
    }
  } else {
    const current = stack[stack.length - 1];
    if (current == null) {
      parseState = "end";
    } else if (Array.isArray(current)) {
      parseState = "afterArrayValue";
    } else {
      parseState = "afterPropertyValue";
    }
  }
}
function pop() {
  stack.pop();
  const current = stack[stack.length - 1];
  if (current == null) {
    parseState = "end";
  } else if (Array.isArray(current)) {
    parseState = "afterArrayValue";
  } else {
    parseState = "afterPropertyValue";
  }
}
function invalidChar(c2) {
  if (c2 === void 0) {
    return syntaxError(`JSON5: invalid end of input at ${line}:${column}`);
  }
  return syntaxError(`JSON5: invalid character '${formatChar(c2)}' at ${line}:${column}`);
}
function invalidEOF() {
  return syntaxError(`JSON5: invalid end of input at ${line}:${column}`);
}
function invalidIdentifier() {
  column -= 5;
  return syntaxError(`JSON5: invalid identifier character at ${line}:${column}`);
}
function separatorChar(c2) {
  console.warn(`JSON5: '${formatChar(c2)}' in strings is not valid ECMAScript; consider escaping`);
}
function formatChar(c2) {
  const replacements = {
    "'": "\\'",
    '"': '\\"',
    "\\": "\\\\",
    "\b": "\\b",
    "\f": "\\f",
    "\n": "\\n",
    "\r": "\\r",
    "	": "\\t",
    "\v": "\\v",
    "\0": "\\0",
    "\u2028": "\\u2028",
    "\u2029": "\\u2029"
  };
  if (replacements[c2]) {
    return replacements[c2];
  }
  if (c2 < " ") {
    const hexString = c2.charCodeAt(0).toString(16);
    return "\\x" + ("00" + hexString).substring(hexString.length);
  }
  return c2;
}
function syntaxError(message) {
  const err = new SyntaxError(message);
  err.lineNumber = line;
  err.columnNumber = column;
  return err;
}
var stringify = function stringify2(value, replacer, space) {
  const stack2 = [];
  let indent = "";
  let propertyList;
  let replacerFunc;
  let gap = "";
  let quote;
  if (replacer != null && typeof replacer === "object" && !Array.isArray(replacer)) {
    space = replacer.space;
    quote = replacer.quote;
    replacer = replacer.replacer;
  }
  if (typeof replacer === "function") {
    replacerFunc = replacer;
  } else if (Array.isArray(replacer)) {
    propertyList = [];
    for (const v of replacer) {
      let item;
      if (typeof v === "string") {
        item = v;
      } else if (typeof v === "number" || v instanceof String || v instanceof Number) {
        item = String(v);
      }
      if (item !== void 0 && propertyList.indexOf(item) < 0) {
        propertyList.push(item);
      }
    }
  }
  if (space instanceof Number) {
    space = Number(space);
  } else if (space instanceof String) {
    space = String(space);
  }
  if (typeof space === "number") {
    if (space > 0) {
      space = Math.min(10, Math.floor(space));
      gap = "          ".substr(0, space);
    }
  } else if (typeof space === "string") {
    gap = space.substr(0, 10);
  }
  return serializeProperty("", { "": value });
  function serializeProperty(key2, holder) {
    let value2 = holder[key2];
    if (value2 != null) {
      if (typeof value2.toJSON5 === "function") {
        value2 = value2.toJSON5(key2);
      } else if (typeof value2.toJSON === "function") {
        value2 = value2.toJSON(key2);
      }
    }
    if (replacerFunc) {
      value2 = replacerFunc.call(holder, key2, value2);
    }
    if (value2 instanceof Number) {
      value2 = Number(value2);
    } else if (value2 instanceof String) {
      value2 = String(value2);
    } else if (value2 instanceof Boolean) {
      value2 = value2.valueOf();
    }
    switch (value2) {
      case null:
        return "null";
      case true:
        return "true";
      case false:
        return "false";
    }
    if (typeof value2 === "string") {
      return quoteString(value2);
    }
    if (typeof value2 === "number") {
      return String(value2);
    }
    if (typeof value2 === "object") {
      return Array.isArray(value2) ? serializeArray(value2) : serializeObject(value2);
    }
    return void 0;
  }
  function quoteString(value2) {
    const quotes = {
      "'": 0.1,
      '"': 0.2
    };
    const replacements = {
      "'": "\\'",
      '"': '\\"',
      "\\": "\\\\",
      "\b": "\\b",
      "\f": "\\f",
      "\n": "\\n",
      "\r": "\\r",
      "	": "\\t",
      "\v": "\\v",
      "\0": "\\0",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029"
    };
    let product = "";
    for (let i = 0; i < value2.length; i++) {
      const c2 = value2[i];
      switch (c2) {
        case "'":
        case '"':
          quotes[c2]++;
          product += c2;
          continue;
        case "\0":
          if (util.isDigit(value2[i + 1])) {
            product += "\\x00";
            continue;
          }
      }
      if (replacements[c2]) {
        product += replacements[c2];
        continue;
      }
      if (c2 < " ") {
        let hexString = c2.charCodeAt(0).toString(16);
        product += "\\x" + ("00" + hexString).substring(hexString.length);
        continue;
      }
      product += c2;
    }
    const quoteChar = quote || Object.keys(quotes).reduce((a, b) => quotes[a] < quotes[b] ? a : b);
    product = product.replace(new RegExp(quoteChar, "g"), replacements[quoteChar]);
    return quoteChar + product + quoteChar;
  }
  function serializeObject(value2) {
    if (stack2.indexOf(value2) >= 0) {
      throw TypeError("Converting circular structure to JSON5");
    }
    stack2.push(value2);
    let stepback = indent;
    indent = indent + gap;
    let keys = propertyList || Object.keys(value2);
    let partial = [];
    for (const key2 of keys) {
      const propertyString = serializeProperty(key2, value2);
      if (propertyString !== void 0) {
        let member = serializeKey(key2) + ":";
        if (gap !== "") {
          member += " ";
        }
        member += propertyString;
        partial.push(member);
      }
    }
    let final;
    if (partial.length === 0) {
      final = "{}";
    } else {
      let properties;
      if (gap === "") {
        properties = partial.join(",");
        final = "{" + properties + "}";
      } else {
        let separator = ",\n" + indent;
        properties = partial.join(separator);
        final = "{\n" + indent + properties + ",\n" + stepback + "}";
      }
    }
    stack2.pop();
    indent = stepback;
    return final;
  }
  function serializeKey(key2) {
    if (key2.length === 0) {
      return quoteString(key2);
    }
    const firstChar = String.fromCodePoint(key2.codePointAt(0));
    if (!util.isIdStartChar(firstChar)) {
      return quoteString(key2);
    }
    for (let i = firstChar.length; i < key2.length; i++) {
      if (!util.isIdContinueChar(String.fromCodePoint(key2.codePointAt(i)))) {
        return quoteString(key2);
      }
    }
    return key2;
  }
  function serializeArray(value2) {
    if (stack2.indexOf(value2) >= 0) {
      throw TypeError("Converting circular structure to JSON5");
    }
    stack2.push(value2);
    let stepback = indent;
    indent = indent + gap;
    let partial = [];
    for (let i = 0; i < value2.length; i++) {
      const propertyString = serializeProperty(String(i), value2);
      partial.push(propertyString !== void 0 ? propertyString : "null");
    }
    let final;
    if (partial.length === 0) {
      final = "[]";
    } else {
      if (gap === "") {
        let properties = partial.join(",");
        final = "[" + properties + "]";
      } else {
        let separator = ",\n" + indent;
        let properties = partial.join(separator);
        final = "[\n" + indent + properties + ",\n" + stepback + "]";
      }
    }
    stack2.pop();
    indent = stepback;
    return final;
  }
};
const JSON5 = {
  parse,
  stringify
};
var lib = JSON5;
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
          return lib.parse(await file.text());
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
      const key2 = location.shift();
      if (current[key2] === void 0) {
        if (current[Number(key2)] !== void 0) {
          current = current[Number(key2)];
        } else {
          current[key2] = {};
          current = current[key2];
        }
      } else {
        current = current[key2];
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
      for (const key2 in event) {
        if (key2 !== "filters")
          event[key2] = void 0;
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
          return createAdditionalFiles[filePath] ? lib.parse(createAdditionalFiles[filePath].fileContent) : void 0;
        if (isComponent(filePath) && filePath.endsWith(".js")) {
          const file = await fileHandle.getFile();
          return await (file == null ? void 0 : file.text());
        } else if (mayUseComponent(filePath) || isPlayerFile(filePath, getAliases)) {
          const file = await fileHandle.getFile();
          if (!file)
            return;
          try {
            return lib.parse(await file.text());
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
          return lib.parse(await file.text());
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
function getAugmentedNamespace(n) {
  if (n.__esModule)
    return n;
  var a = Object.defineProperty({}, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
}
var wasm = { exports: {} };
var __viteBrowserExternal = {};
var __viteBrowserExternal$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": __viteBrowserExternal
});
var require$$1 = /* @__PURE__ */ getAugmentedNamespace(__viteBrowserExternal$1);
(function(module) {
  let imports = {};
  imports["__wbindgen_placeholder__"] = module.exports;
  let wasm2;
  const { TextDecoder, TextEncoder } = require$$1;
  let cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
  cachedTextDecoder.decode();
  let cachegetUint8Memory0 = null;
  function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm2.memory.buffer) {
      cachegetUint8Memory0 = new Uint8Array(wasm2.memory.buffer);
    }
    return cachegetUint8Memory0;
  }
  function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
  }
  const heap = new Array(32).fill(void 0);
  heap.push(void 0, null, true, false);
  let heap_next = heap.length;
  function addHeapObject(obj) {
    if (heap_next === heap.length)
      heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];
    heap[idx] = obj;
    return idx;
  }
  function getObject(idx) {
    return heap[idx];
  }
  let WASM_VECTOR_LEN = 0;
  let cachedTextEncoder = new TextEncoder("utf-8");
  const encodeString = typeof cachedTextEncoder.encodeInto === "function" ? function(arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
  } : function(arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
      read: arg.length,
      written: buf.length
    };
  };
  function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === void 0) {
      const buf = cachedTextEncoder.encode(arg);
      const ptr2 = malloc(buf.length);
      getUint8Memory0().subarray(ptr2, ptr2 + buf.length).set(buf);
      WASM_VECTOR_LEN = buf.length;
      return ptr2;
    }
    let len = arg.length;
    let ptr = malloc(len);
    const mem = getUint8Memory0();
    let offset = 0;
    for (; offset < len; offset++) {
      const code = arg.charCodeAt(offset);
      if (code > 127)
        break;
      mem[ptr + offset] = code;
    }
    if (offset !== len) {
      if (offset !== 0) {
        arg = arg.slice(offset);
      }
      ptr = realloc(ptr, len, len = offset + arg.length * 3);
      const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
      const ret = encodeString(arg, view);
      offset += ret.written;
    }
    WASM_VECTOR_LEN = offset;
    return ptr;
  }
  let cachegetInt32Memory0 = null;
  function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm2.memory.buffer) {
      cachegetInt32Memory0 = new Int32Array(wasm2.memory.buffer);
    }
    return cachegetInt32Memory0;
  }
  function dropObject(idx) {
    if (idx < 36)
      return;
    heap[idx] = heap_next;
    heap_next = idx;
  }
  function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
  }
  module.exports.minifySync = function(s, opts) {
    try {
      const retptr = wasm2.__wbindgen_add_to_stack_pointer(-16);
      var ptr0 = passStringToWasm0(s, wasm2.__wbindgen_malloc, wasm2.__wbindgen_realloc);
      var len0 = WASM_VECTOR_LEN;
      wasm2.minifySync(retptr, ptr0, len0, addHeapObject(opts));
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) {
        throw takeObject(r1);
      }
      return takeObject(r0);
    } finally {
      wasm2.__wbindgen_add_to_stack_pointer(16);
    }
  };
  module.exports.parseSync = function(s, opts) {
    try {
      const retptr = wasm2.__wbindgen_add_to_stack_pointer(-16);
      var ptr0 = passStringToWasm0(s, wasm2.__wbindgen_malloc, wasm2.__wbindgen_realloc);
      var len0 = WASM_VECTOR_LEN;
      wasm2.parseSync(retptr, ptr0, len0, addHeapObject(opts));
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) {
        throw takeObject(r1);
      }
      return takeObject(r0);
    } finally {
      wasm2.__wbindgen_add_to_stack_pointer(16);
    }
  };
  module.exports.printSync = function(s, opts) {
    try {
      const retptr = wasm2.__wbindgen_add_to_stack_pointer(-16);
      wasm2.printSync(retptr, addHeapObject(s), addHeapObject(opts));
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) {
        throw takeObject(r1);
      }
      return takeObject(r0);
    } finally {
      wasm2.__wbindgen_add_to_stack_pointer(16);
    }
  };
  module.exports.transformSync = function(s, opts, experimental_plugin_bytes_resolver) {
    try {
      const retptr = wasm2.__wbindgen_add_to_stack_pointer(-16);
      var ptr0 = passStringToWasm0(s, wasm2.__wbindgen_malloc, wasm2.__wbindgen_realloc);
      var len0 = WASM_VECTOR_LEN;
      wasm2.transformSync(retptr, ptr0, len0, addHeapObject(opts), addHeapObject(experimental_plugin_bytes_resolver));
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) {
        throw takeObject(r1);
      }
      return takeObject(r0);
    } finally {
      wasm2.__wbindgen_add_to_stack_pointer(16);
    }
  };
  module.exports.__wbindgen_json_parse = function(arg0, arg1) {
    var ret = JSON.parse(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
  };
  module.exports.__wbindgen_json_serialize = function(arg0, arg1) {
    const obj = getObject(arg1);
    var ret = JSON.stringify(obj === void 0 ? null : obj);
    var ptr0 = passStringToWasm0(ret, wasm2.__wbindgen_malloc, wasm2.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  module.exports.__wbindgen_object_drop_ref = function(arg0) {
    takeObject(arg0);
  };
  module.exports.__wbindgen_string_new = function(arg0, arg1) {
    var ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
  };
  module.exports.__wbg_new0_57a6a2c2aaed3fc5 = function() {
    var ret = new Date();
    return addHeapObject(ret);
  };
  module.exports.__wbg_getTime_f8ce0ff902444efb = function(arg0) {
    var ret = getObject(arg0).getTime();
    return ret;
  };
  module.exports.__wbg_getTimezoneOffset_41211a984662508b = function(arg0) {
    var ret = getObject(arg0).getTimezoneOffset();
    return ret;
  };
  module.exports.__wbg_new_693216e109162396 = function() {
    var ret = new Error();
    return addHeapObject(ret);
  };
  module.exports.__wbg_stack_0ddaca5d1abfb52f = function(arg0, arg1) {
    var ret = getObject(arg1).stack;
    var ptr0 = passStringToWasm0(ret, wasm2.__wbindgen_malloc, wasm2.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  module.exports.__wbg_error_09919627ac0992f5 = function(arg0, arg1) {
    try {
      console.error(getStringFromWasm0(arg0, arg1));
    } finally {
      wasm2.__wbindgen_free(arg0, arg1);
    }
  };
  module.exports.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
  };
  const path = require$$1.join(__dirname, "wasm_bg.wasm");
  const bytes = require$$2.readFileSync(path);
  const wasmModule = new WebAssembly.Module(bytes);
  const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
  wasm2 = wasmInstance.exports;
  module.exports.__wasm = wasm2;
})(wasm);
const TypeScriptPlugin = ({ options }) => ({
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
  load(filePath, fileContent) {
    if (!filePath.endsWith(".ts"))
      return;
    return wasm.exports.transformSync(fileContent, {
      filename: basename(filePath),
      sourceMaps: (options == null ? void 0 : options.inlineSourceMap) ? "inline" : void 0,
      jsc: {
        parser: {
          syntax: "typescript"
        },
        target: "es2020"
      }
    }).code;
  },
  finalizeBuild(filePath, fileContent) {
    if (filePath.endsWith(".ts") && typeof fileContent === "string")
      return fileContent;
  }
});
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
          return lib.parse(await file.text());
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
const GeneratorScriptsPlugin = ({
  fileType,
  console: console2,
  jsRuntime
}) => {
  const getFileType = (filePath) => fileType.getId(filePath);
  const getFileContentType = (filePath) => {
    var _a;
    const def = fileType.get(filePath);
    if (!def)
      return "raw";
    return (_a = def.type) != null ? _a : "json";
  };
  const isGeneratorScript = (filePath) => getFileType(filePath) !== "gameTest" && (filePath.endsWith(".js") || filePath.endsWith(".ts"));
  const getScriptExtension = (filePath) => {
    var _a, _b, _c, _d;
    const fileContentType = getFileContentType(filePath);
    if (fileContentType === "json")
      return ".json";
    return (_d = (_c = (_b = (_a = fileType.get(filePath)) == null ? void 0 : _a.detect) == null ? void 0 : _b.fileExtensions) == null ? void 0 : _c[0]) != null ? _d : ".txt";
  };
  return {
    transformPath(filePath) {
      if (filePath && isGeneratorScript(filePath))
        return filePath.replace(/\.(js|ts)$/, `.${getScriptExtension(filePath)}`);
    },
    read(filePath, fileHandle) {
      if (isGeneratorScript(filePath))
        return fileHandle == null ? void 0 : fileHandle.getFile();
    },
    async load(filePath, fileContent) {
      if (isGeneratorScript(filePath)) {
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
        return module.__default__;
      }
    },
    finalizeBuild(filePath, fileContent) {
      if (isGeneratorScript(filePath)) {
        if (fileContent === null)
          return null;
        return typeof fileContent === "object" ? JSON.stringify(fileContent) : fileContent;
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
}
const builtInPlugins = {
  simpleRewrite: SimpleRewrite,
  rewriteForPackaging: RewriteForPackaging,
  moLang: MoLangPlugin,
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
      hasComMojangDirectory: this.dash.fileSystem !== this.dash.outputFileSystem,
      compileFiles: (filePaths) => this.dash.compileVirtualFiles(filePaths)
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
  setUpdateFiles(files) {
    this.updateFiles = new Set(files.map((filePath) => this.dash.includedFiles.get(filePath)).filter((file) => file !== void 0));
  }
  addUpdateFile(file) {
    this.updateFiles.add(file);
  }
  removeUpdateFile(file) {
    this.updateFiles.delete(file);
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
      updateFiles: [...this.updateFiles].map((file) => file.filePath)
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
  async unlinkMultiple(paths) {
    if (!this.isCompilerActivated || paths.length === 0)
      return;
    for (const path of paths) {
      await this.unlink(path, false);
    }
    await this.saveDashFile();
  }
  async unlink(path, updateDashFile = true) {
    if (!this.isCompilerActivated)
      return;
    const outputPath = await this.plugins.runTransformPathHooks(path);
    if (!outputPath || outputPath === path)
      return;
    await this.outputFileSystem.unlink(outputPath);
    this.includedFiles.remove(path);
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
    if (!this.isCompilerActivated)
      return;
    const outputPath = await this.plugins.runTransformPathHooks(filePath);
    if (!outputPath)
      return;
    return outputPath;
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
  async compileVirtualFiles(filePaths) {
    const virtualFiles = this.includedFiles.add(filePaths, true);
    this.progress.addToTotal(3);
    virtualFiles.forEach((virtual) => virtual.reset());
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
      return await JSON.parse(await file.text());
    } catch {
      throw new Error(`Invalid JSON: ${path}`);
    }
  }
  watchDirectory(path, onChange) {
    console.warn("Watching a directory for changes is not supported on this platform!");
  }
}
export { Command, Component, Console, Dash, DefaultConsole, FileSystem };

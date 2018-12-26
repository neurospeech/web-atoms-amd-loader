/// <reference path="./ArrayHelper.ts"/>
/// <reference path="./Module.ts"/>

interface IModuleConfig {
    name: string;
    url: string;
    type: "amd" | "global";
    exportVar?: string;
}

class AmdLoader {


    private mockTypes: MockType[] = [];

    public static globalVar: any = {};

    public static moduleProgress: (name: string, progress: number) => void;

    public static moduleLoader: (packageName: string, url: string, success: (r: any) => void, failed: (error: any) => void) => void;

    public static instance: AmdLoader = new AmdLoader();

    public static current: Module = null;

    public currentStack: Module[] = [];

    public modules: { [key: string]: Module } = {};

    public pathMap: { [key: string]: IModuleConfig } = {};
    enableMock: boolean;

    public replace(type: any, name: string, mock: boolean): void {
        if (mock && !this.enableMock) {
            return;
        }
        const peek: Module = this.currentStack[this.currentStack.length-1];
        this.mockTypes.push(new MockType(peek, type, name, mock));
    }

    public resolveType(type: any): any {
        const t: MockType = this.mockTypes.find((t) => t.type === type);
        return t ? t.replaced : type;
    }

    public packageResolver: (name: string, version: string) => string = (name, version) => `/node_modules/${name}`;

    public map(
        packageName: string,
        packageUrl: string,
        type: ("amd" | "global") = "amd",
        exportVar?: string
    ): void {

        // ignore map if it exists already...
        if (this.pathMap[packageName]) {
            return;
        }

        if (packageName === "reflect-metadata") {
            type = "global";
        }

        this.pathMap[packageName] = {
            name: packageName,
            url: packageUrl,
            type: type,
            exportVar
        };
    }

    public resolveSource(name: string, defExt: string = ".js"): string {
        try {
            if (/^((\/)|((http|https)\:\/\/))/i.test(name)) {
                // console.log(`ResolveSource fail: ${name}`);
                return name;
            }
            let path: string = null;
            for (const key in this.pathMap) {
                if (this.pathMap.hasOwnProperty(key)) {
                    const packageName: string = key;
                    if (name.startsWith(packageName)) {
                        path = this.pathMap[key].url;
                        if (name.length !== packageName.length) {
                            if (name[packageName.length] !== "/") {
                                continue;
                            }
                            name = name.substr(packageName.length + 1);
                        } else {
                            return path;
                        }
                        if (path.endsWith("/")) {
                            path = path.substr(0, path.length-1);
                        }
                        path = path + "/" + name;
                        if (defExt && !path.endsWith(".js")) {
                            path = path + ".js";
                        }
                        return path;
                    }
                }
            }
            return name;
        } catch(e) {
            console.error(`Failed to resolve ${name} with error ${JSON.stringify(e)}`);
            console.error(e);
        }
    }

    public resolveRelativePath(name: string, currentPackage: string): string {

        if (name.charAt(0) !== ".") {
            return name;
        }

        const tokens: string[] = name.split("/");

        const currentTokens: string[] = currentPackage.split("/");

        currentTokens.pop();

        while(tokens.length) {
            const first:string = tokens[0];
            if (first === "..") {
                currentTokens.pop();
                tokens.splice(0, 1);
                continue;
            }
            if (first === ".") {
                tokens.splice(0, 1);
            }
            break;
        }

        return `${currentTokens.join("/")}/${tokens.join("/")}`;
    }

    public get(name: string): Module {
        let module: Module = this.modules[name];
        if (!module) {
            module = new Module(name);
            // module.url = this.resolvePath(name, AmdLoader.current.url);
            module.url = this.resolveSource(name);
            if (!module.url) {
                throw new Error(`No url mapped for ${name}`);
            }
            const def: IModuleConfig = this.pathMap[name];
            if (def) {
                module.type = def.type || "amd";
                module.exportVar = def.exportVar;
            } else {
                module.type = "amd";
            }
            module.require = (n: string) => {
                const an: string = this.resolveRelativePath(n, module.name);
                const resolvedModule: Module = this.get(an);
                return resolvedModule.getExports();
            };
            this.modules[name] = module;
        }
        return module;
    }

    public async import(name: string): Promise<any> {

        let module: Module = this.get(name);

        await this.load(module);

        // tslint:disable-next-line:typedef
        const exports = module.getExports();

        // load requested dependencies for mock or abstract injects
        const pendings: MockType[] = this.mockTypes.filter((t) => !t.loaded );
        if (pendings.length) {
            for (const iterator of pendings) {
                iterator.loaded = true;
            }
            for (const iterator of pendings) {
                const containerModule: Module = iterator.module;
                const resolvedName: string = this.resolveRelativePath(iterator.moduleName, containerModule.name);
                const ex: any = await this.import(resolvedName);
                const type: any = ex[iterator.exportName];
                iterator.replaced = type;
            }
        }

        return exports;
    }

    public async loadPackageManifest(module: Module): Promise<void> {
        if (module.manifestLoaded) {
            return;
        }
    }

    public async load(module: Module): Promise<any> {

        await this.loadPackageManifest(module);

        if (module.loader) {
            return await module.loader;
        }

        module.loader = new Promise((resolve, reject) => {

            AmdLoader.moduleLoader(module.name, module.url, (r) => {

                AmdLoader.current = module;
                r();

                module.ready = true;

                if (module.exportVar) {
                    module.exports = AmdLoader.globalVar[module.exportVar];
                }

                module.onReady(() => {
                    resolve(module.getExports());
                });

                module.finish();

                if (AmdLoader.moduleProgress) {
                    // lets calculate how much...
                    // const total: number = this.modules.length;
                    // const done: number = this.modules.filter( (m) => m.ready ).length;

                    let total: number = 0;
                    let done: number = 0;

                    for (const key in this.modules) {
                        if (this.modules.hasOwnProperty(key)) {
                            const mitem: any = this.modules[key];
                            if (mitem instanceof Module) {
                                if (mitem.ready) {
                                    done ++;
                                }
                                total ++;
                            }
                        }
                    }

                    AmdLoader.moduleProgress(module.name, Math.round( (done * 100)/total ));
                }

            }, (error) => {
                reject(error);
            });

        });

        return await module.loader;
    }

}

AmdLoader.moduleLoader = (name, url, success, error) => {

    AmdLoader.globalVar = window;

    const xhr: XMLHttpRequest = new XMLHttpRequest();
    xhr.onreadystatechange = (e) => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                success(() => {

                    const errorCheck: string = `
} catch(e) { if(e.stack) { alert(e.message + '\\r\\n' + e.stack); } else { alert(e); } }`;

                    // tslint:disable-next-line:no-eval
                    eval(`"use strict"; try { ${xhr.responseText} ${errorCheck}
//# sourceURL=${url}`);
                });
            } else {
                error(xhr.responseText);
            }
        }
    };

    xhr.open("GET", url);
    xhr.send();

};

AmdLoader.moduleProgress = (() => {

    if (!document) {
        return (name, p) => {
            console.log(`${name} ${p}%`);
        };
    }

    const progressDiv: HTMLDivElement = document.createElement("div");
    const style: CSSStyleDeclaration = progressDiv.style;

    style.position = "absolute";
    style.margin = "auto";
    style.width = "200px";
    style.height = "100px";
    style.top = style.left = style.right = style.bottom = "0";

    style.borderStyle = "solid";
    style.borderWidth = "1px";
    style.borderColor = "#A0A0A0";
    style.borderRadius = "5px";
    style.padding = "5px";
    style.textAlign = "center";
    style.verticalAlign = "middle";

    const progressLabel: HTMLDivElement = document.createElement("div");
    progressDiv.appendChild(progressLabel);
    progressLabel.style.color = "#A0A0A0";

    function ready(): void {
        document.body.appendChild(progressDiv);
    }

    function completed(): void {
        document.removeEventListener( "DOMContentLoaded", completed );
        window.removeEventListener( "load", completed );
        ready();
    }

    if ( document.readyState === "complete" ||
        // tslint:disable-next-line:no-string-literal
        ( document.readyState !== "loading" && !document.documentElement["doScroll"] ) ) {

        window.setTimeout( ready );
    } else {
        document.addEventListener( "DOMContentLoaded", completed );
        window.addEventListener( "load", completed );
    }
    return (name, n) => {
        if (n >= 99) {
            progressDiv.style.display = "none";
        } else {
            progressDiv.style.display = "block";
        }
        progressLabel.textContent = `Loading ... (${n}%)`;
    };
})();

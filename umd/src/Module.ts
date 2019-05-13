interface IPackage {
    name: string;
    version: string;
    url: string;
    type: "amd" | "global";
    exportVar?: string;
}

class Module {

    public package: IPackage;

    public emptyExports: any = {};

    public dependencyHooks: [(...a: any) => void, () => void];

    public resolveHooks: [(... a: any) => void, () => void];

    public url: string;

    public exports: any;

    public ignoreModule: Module = null;

    public isLoaded: boolean = false;

    public isResolved: boolean = false;

    public require: (name: string) => any;

    public dependencies: Module[] = [];

    public type: "amd" | "global";

    public exportVar: string;

    public factory: (r: any, e: any) => void;

    public loader: Promise<any>;

    /**
     * This promise can be awaited by dependency resolver
     */
    public resolver: Promise<any>;

    constructor(
        public readonly name: string,
        public readonly folder?: string
    ) {
        const index: number = name.lastIndexOf("/");
        if (index === -1) {
            this.folder = "";
        } else {
            this.folder = name.substr(0, index);
        }
    }

    public async resolveDependencies(tree: Module[]): Promise<void> {
        const i = AmdLoader.instance;
        const loader = this.dependencies.map(async (m) => {
            if (!m.isLoaded) {
                await i.load(m);
            }
        });

        if (loader.length) {
            await Promise.all(loader);
        }

        if (tree.indexOf(this) === -1) {
            await i.resolveModule(this);
        }

        const a = tree.slice();
        a.push(this);

        const resolvers = this.dependencies.map(async (iterator) => {
            if (a.indexOf(iterator) !== -1) {
                return;
            }
            await iterator.resolveDependencies(a);
        });

        if (resolvers.length) {
            await Promise.all(resolvers);
        }

    }

    public resolve(tree?: Module[], resolveChild: boolean = false): boolean {

        if (resolveChild === true) {
            let ad = true;
            for (const iterator of this.dependencies) {
                if (tree && tree.indexOf(iterator) !== -1) {
                    continue;
                }
                if (!iterator.resolve(tree)) {
                    ad = false;
                }
            }
            return ad;
        }

        if (!this.isLoaded) {
            return false;
        }

        if (this.isResolved) {
            return true;
        }
        const a = tree ? tree : [];
        a.push(this);

        let allResolved = true;

        for (const iterator of this.dependencies) {
            if (a.indexOf(iterator) !== -1) {
                if (!iterator.resolve(a, true)) {
                    allResolved = false;
                }
                continue;
            }
            if (!iterator.resolve(a)) {
                allResolved = false;
            }
        }

        if (!allResolved) {
            return false;
        }
        const i = AmdLoader.instance;

        if (this.dependencyHooks) {
            this.dependencyHooks[0]();
            this.dependencyHooks = null;
        }

        if (this.resolveHooks) {
            this.resolveHooks[0](this.getExports());
            this.resolveHooks = null;

            const index = i.pendingModules.indexOf(this);
            if (index !== -1) {
                i.pendingModules.splice(index, 1);
                i.queueResolveModules();
            }
            return true;
        }

        return false;

    }

    // public dependenciesLoaded(list: Module[] = []): boolean {
    //     if(list.indexOf(this) === -1) {
    //         list.push(this);
    //         for (const iterator of this.dependencies) {
    //             if (!iterator.isLoaded) {
    //                 return false;
    //             }
    //             if (iterator.isDependentOn(this, [])) {
    //                 continue;
    //             }
    //             if (!iterator.dependenciesLoaded(list)) {
    //                 return false;
    //             }
    //         }
    //     }
    //     return true;
    // }

    public isDependentOn(d: Module, r: Module[]): boolean {
        for (const iterator of this.dependencies) {
            if (r.find((x) => x === iterator)) {
                return true;
            }
            r.push(iterator);
            if (iterator === d) {
                return true;
            }
            if (iterator.isDependentOn(d, r)) {
                return true;
            }
        }
        return false;
    }

    public addDependency(d: Module): void {
        // ignore module contains dependency resolution module
        if (d === this.ignoreModule) {
            return;
        }
        // if (d.isDependentOn(this)) {
        //     return;
        // }
        this.dependencies.push(d);
    }

    public getExports(): any {
        this.exports = this.emptyExports;
        if (this.factory) {
            const factory = this.factory;
            this.factory = null;
            delete this.factory;
            AmdLoader.instance.currentStack.push(this);
            const result: any = factory(this.require, this.exports);
            if (result) {
                if (typeof result === "object") {
                    for (const key in result) {
                        if (result.hasOwnProperty(key)) {
                            const element: any = result[key];
                            this.exports[key] = element;
                        }
                    }
                } else if (!this.exports.default) {
                    this.exports.default = result;
                }
            }
            AmdLoader.instance.currentStack.pop();
            delete this.factory;
        }
        return this.exports;
    }

}

interface IPackage {
    name: string;
    version: string;
    url: string;
    type: "amd" | "global";
    exportVar?: string;
}

class Module {

    private handlers: Array<() => void> = [];

    public package: IPackage;

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

    public url: string;

    public exports: any;

    public get dependentLoaders(): Promise<any>[] {
        const root: Promise<any>[] = [];
        if (!this.dependencies) {
            return root;
        }
        for (const iterator of this.dependencies) {
            if (!iterator.ready) {
                root.push(AmdLoader.instance.import(iterator.name));
            }
            for (const child of iterator.dependentLoaders) {
                root.push(child);
            }
        }
        return root;
    }

    public resolve(resolve: (r: any) => void, reject: (e: any) => void): void {
        const pendingLoaders: Promise<any>[] = this.dependentLoaders;
        if (pendingLoaders.length) {
            Promise.all(pendingLoaders)
            .then(() => {
                resolve(this.getExports());
            }).catch(reject);
        } else {
            resolve(this.getExports());
        }
    }

    public getExports(): any {
        if (this.exports) {
            return this.exports;
        }
        this.exports = {};
        if (this.factory) {
            AmdLoader.instance.currentStack.push(this);
            const result: any = this.factory(this.require, this.exports);
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
            // we no longer need all these ...
            delete this.factory;
            // delete this.handlers;
            // delete this.dependencies;
        }
        return this.exports;
    }

    public require: (name: string) => any;

    public code: () => Promise<any>;

    public dependencies: Module[] = [];

    public type: "amd" | "global";

    public exportVar: string;

    public factory: (r: any, e: any) => void;

    public loader: Promise<any>;

    public ready: boolean = false;

}
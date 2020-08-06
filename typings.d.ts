import { Compiler, Plugin } from 'webpack';

export = NginxPushWebpackPlugin;

declare class NginxPushWebpackPlugin extends Plugin {
  constructor(options?: NginxPushWebpackPlugin.Options);

  apply(compiler: Compiler): void;
}

declare namespace NginxPushWebpackPlugin {
  interface Options extends Partial<ProcessedOptions> { }

  /**
   * The plugin options after adding default values
   */
  interface ProcessedOptions {
    /**
     * The file to write the nginx conf to.
     * Supports relative/absolute path eg: `conf/nginx.push.conf`, '/etc/conf/nginx/nginx.push.conf'
     * @default 'nginx.push.conf'
     */
    filename: string;

    /**
     * Push static webpack bundle resource under what `location` in nginx
     * @default 'index.html'
     */
    index: string;

    /**
     * Don't generate nginx `location` directive
     * @default 'false'
     */
    omitNginxLocation: string;
  }
}

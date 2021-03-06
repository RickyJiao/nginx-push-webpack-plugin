const path = require('path');
const _ = require('lodash');

class NginxPushWebpackPlugin {
  constructor(options) {
    // Default options
    this.options = {
      filename: 'nginx.push.conf',
      index: 'index.html',
      omitNginxLocation: false,
      ...options,
    };
  }

  // Define `apply` as its prototype method which is supplied with compiler as its argument
  apply(compiler) {
    // convert absolute filename into relative so that webpack can
    // generate it at correct location
    const { filename } = this.options;

    if (path.resolve(filename) === path.normalize(filename)) {
      this.options.filename = path.relative(compiler.options.output.path, filename);
    }

    // Specify the event hook to attach to
    compiler.hooks.emit.tapAsync('NginxPushWebpackPlugin', (compilation, callback) => {
      const allChunks = compilation.getStats().toJson().chunks;

      // Filter out chunks without initialName
      const chunks = this.filterChunks(allChunks);

      // get all assets
      const assets = this.getAssets(compilation, chunks);

      Promise
        .resolve()
        // write assets to nginx
        .then(() => this.writeToNginxConf(assets))
        .then((conf) => {
          // Replace the compilation result with the evaluated conf code
          compilation.assets[this.options.filename] = {
            source: () => conf,
            size: () => conf.length,
          };
        }).catch((err) => {
          console.error(err);
          return null;
        })
        .then(() => {
          callback();
        });
    });
  }

  writeToNginxConf(assets) {
    const { index, omitNginxLocation } = this.options;
    const content = [
      `# Automatically generated by NginxPushWebpackPlugin, don't change it manually
# Please include this file in your nginx web server directive
# \`\`\`
#   include nginx.push.conf;
# \`\`\``];

    if (!omitNginxLocation) {
      content.push(`location = /${index} {`);
    }

    assets.forEach((asset) => {
      content.push(`  http2_push ${asset};`);
    });

    if (!omitNginxLocation) {
      content.push('}');
    }

    return content.join('\n');
  }

  /**
   * get all assets
   */
  getAssets(compilation, chunks) {
    const compilationHash = compilation.hash;

    // Use the configured public path or build a relative path
    let publicPath = typeof compilation.options.output.publicPath !== 'undefined'
      // If a hard coded public path exists use it
      ? compilation.mainTemplate.getPublicPath({ hash: compilationHash })
      // If no public path was set get a relative url path
      : path.relative(path.resolve(compilation.options.output.path, path.dirname(this.options.filename)), compilation.options.output.path)
        .split(path.sep).join('/');

    if (publicPath.length && publicPath.substr(-1, 1) !== '/') {
      publicPath += '/';
    }

    const assets = chunks.reduce((prev, chunk) => {
      const chunkFiles = [].concat(chunk.files).map((chunkFile) => publicPath + chunkFile);
      return prev.concat(chunkFiles);
    }, []);

    // Duplicate assets can occur on occasion if more than one chunk requires the same css.
    return _.uniq(assets);
  }

  /**
   * Return all chunks from the compilation result which match the exclude and include filters
   */
  filterChunks(chunks) {
    return chunks.filter((chunk) => {
      const chunkName = chunk.names[0];
      // This chunk doesn't have a name. This script can't handled it.
      if (chunkName === undefined) {
        return false;
      }

      // Skip if the chunk should be lazy loaded
      if (typeof chunk.isInitial === 'function') {
        if (!chunk.isInitial()) {
          return false;
        }
      } else if (!chunk.initial) {
        return false;
      }

      // Add otherwise
      return true;
    });
  }
}

module.exports = NginxPushWebpackPlugin;

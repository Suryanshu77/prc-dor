import { ReferenceRouteCompilerPlugin } from '../plugins.js';
import { Config, HmrStyle } from '../../config.js';
export declare function getReferenceRouteCompilerPlugins(opts: {
    targetFramework: Config['target'];
    addHmr?: boolean;
    hmrStyle?: HmrStyle;
}): Array<ReferenceRouteCompilerPlugin> | undefined;

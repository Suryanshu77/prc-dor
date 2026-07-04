import { ReferenceRouteCompilerPlugin } from '../plugins.cjs';
import { Config, HmrStyle } from '../../config.cjs';
export declare function getReferenceRouteCompilerPlugins(opts: {
    targetFramework: Config['target'];
    addHmr?: boolean;
    hmrStyle?: HmrStyle;
}): Array<ReferenceRouteCompilerPlugin> | undefined;

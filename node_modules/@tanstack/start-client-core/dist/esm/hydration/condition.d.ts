import { HydrationStrategy } from './types.js';
declare const conditionType = "condition";
export type HydrationCondition = boolean | (() => boolean);
export declare function condition(condition: HydrationCondition): HydrationStrategy<typeof conditionType, false>;
export {};

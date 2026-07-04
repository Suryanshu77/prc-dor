import { SlotImplementations } from './types.js';
export interface SlotContextValue {
    implementations: SlotImplementations;
    strict: boolean;
}
/**
 * Hook to access slot implementations from within ClientSlot.
 */
export declare function useSlotContext(): SlotContextValue | null;
export interface SlotProviderProps {
    implementations: SlotImplementations;
    strict?: boolean;
    children?: React.ReactNode;
}
/**
 * SlotProvider - makes slot implementations available to ClientSlot components.
 *
 * Must wrap the decoded RSC content so that ClientSlot components can
 * access their slot implementations via React Context.
 */
export declare function SlotProvider({ implementations, strict, children, }: SlotProviderProps): import("react/jsx-runtime").JSX.Element;

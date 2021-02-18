import { ChipState } from "./chip-state";

export interface ChipData {
    state: ChipState;
    usernameOrEmailAddress?: string;
    stateMessage?: string;
}

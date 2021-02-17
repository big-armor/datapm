import { UserStatus } from "src/generated/graphql";

export interface UserStatusChangeDialogResponse {
    status: UserStatus;
    message: string;
}

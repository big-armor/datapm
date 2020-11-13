import { Pipe, PipeTransform } from "@angular/core";
import { User } from "src/generated/graphql";

@Pipe({
    name: "username"
})
export class UsernamePipe implements PipeTransform {
    transform(user: User): string {
        if (!user) {
            return "";
        }

        if (user.firstName) {
            return `${this.trim(user.firstName)} ${this.trim(user.lastName)}`.trim();
        }

        return user.username;
    }

    private trim(str: string) {
        return (str || "").trim();
    }
}

import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { UiStyleToggleService } from "./services/ui-style-toggle.service";

export function themeFactory(themeService: UiStyleToggleService) {
    return () => themeService.setThemeOnStart();
}

@NgModule({
    declarations: [],
    imports: [CommonModule],
    providers: [UiStyleToggleService]
})
export class UiModule {}

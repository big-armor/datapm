import { Component, OnInit } from "@angular/core";
import { UiStyleToggleService } from "src/app/services/ui-style-toggle.service";

@Component({
    selector: "sd-footer",
    templateUrl: "./footer.component.html",
    styleUrls: ["./footer.component.scss"]
})
export class FooterComponent implements OnInit {
    constructor(private uiStyleToggleService: UiStyleToggleService) {}

    ngOnInit(): void {}

    toggleTheme() {
        this.uiStyleToggleService.toggle();
    }
}

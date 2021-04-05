import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { UiStyleToggleService } from "src/app/services/ui-style-toggle.service";
import { User } from "src/generated/graphql";

@Component({
    selector: "sd-footer",
    templateUrl: "./footer.component.html",
    styleUrls: ["./footer.component.scss"]
})
export class FooterComponent implements OnInit, OnDestroy {
    public darkModeEnabled = false;
    private readonly destroy = new Subject<void>();

    constructor(private uiStyleToggleService: UiStyleToggleService) {}

    ngOnInit(): void {
        this.uiStyleToggleService.DARK_MODE_ENABLED.pipe(takeUntil(this.destroy)).subscribe(
            (darkModeEnabled) => (this.darkModeEnabled = darkModeEnabled)
        );
    }

    ngOnDestroy(): void {
        this.destroy.next();
        this.destroy.complete();
    }

    toggleTheme() {
        this.uiStyleToggleService.toggle();
    }
}

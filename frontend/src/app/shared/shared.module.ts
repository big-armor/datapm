import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { HeaderComponent } from "./header/header.component";
import { FooterComponent } from "./footer/footer.component";
import { MaterialModule } from "../material.module";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { TimeAgoPipe } from "./pipes/time-ago.pipe";
import { PackageItemComponent } from "./package-item/package-item.component";

@NgModule({
    declarations: [HeaderComponent, FooterComponent, TimeAgoPipe, PackageItemComponent],
    imports: [CommonModule, MaterialModule, BrowserModule, FormsModule, ReactiveFormsModule, RouterModule],
    exports: [HeaderComponent, FooterComponent, TimeAgoPipe, PackageItemComponent],
    providers: [TimeAgoPipe]
})
export class SharedModule {}

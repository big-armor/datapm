import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HeaderComponent } from "./header/header.component";
import { FooterComponent } from "./footer/footer.component";
import { MaterialModule } from "../material.module";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { TimeAgoPipe } from "./pipes/time-ago.pipe";

@NgModule({
	declarations: [HeaderComponent, FooterComponent, TimeAgoPipe],
	imports: [CommonModule, MaterialModule, BrowserModule, FormsModule, ReactiveFormsModule],
	exports: [HeaderComponent, FooterComponent, TimeAgoPipe]
})
export class SharedModule {}

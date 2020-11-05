import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatRadioModule } from "@angular/material/radio";
import { MatListModule } from "@angular/material/list";
import { MatDividerModule } from "@angular/material/divider";

import { SharedModule } from "../shared/shared.module";
import { SearchRoutingModule } from "./search-routing.module";

import { SearchComponent } from "./search.component";

@NgModule({
    declarations: [SearchComponent],
    imports: [
        CommonModule,
        FormsModule,
        MatRadioModule,
        MatListModule,
        MatDividerModule,
        SharedModule,
        SearchRoutingModule
    ]
})
export class SearchModule {}

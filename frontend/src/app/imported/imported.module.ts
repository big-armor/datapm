import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ImportedRoutingModule } from "./imported-routing.module";
import { BuilderIOComponent } from "./builder-io-component/builder-io.component";
import { SafeHtmlPipe } from "./safe-html.pipe";

@NgModule({
    declarations: [BuilderIOComponent, SafeHtmlPipe],
    imports: [CommonModule, ImportedRoutingModule]
})
export class ImportedModule {}

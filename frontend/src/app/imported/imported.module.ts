import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { BuilderIOComponent } from "./builder-io-component/builder-io.component";
import { SafeHtmlPipe } from "./safe-html.pipe";
import { BuilderIoRendererComponent } from "./builder-io-component/builder-io-renderer/builder-io-renderer.component";

@NgModule({
    declarations: [BuilderIOComponent, SafeHtmlPipe, BuilderIoRendererComponent],
    imports: [CommonModule],
    exports: [BuilderIOComponent, BuilderIoRendererComponent]
})
export class ImportedModule {}

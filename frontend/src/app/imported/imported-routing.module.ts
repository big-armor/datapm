import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { BuilderIOComponent } from "./builder-io-component/builder-io.component";

const routes: Routes = [
    {
        path: "website/:page",
        component: BuilderIOComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ImportedRoutingModule {}

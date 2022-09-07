import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { GroupDetailsComponent } from "./group-details/group-details.component";

const routes: Routes = [
    {
        path: "",
        component: GroupDetailsComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class GroupRoutingModule {}

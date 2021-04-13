import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { NotFoundComponent } from "../imported/not-found/not-found.component";
import { ContactComponent } from "../imported/contact/contact.component";
import { PrivacyComponent } from "../imported/privacy/privacy.component";
import { TermsAndConditionsComponent } from "../imported/terms-and-conditions/terms-and-conditions.component";
import { FooterComponent } from "../imported/footer/footer.component";
import { HeaderComponent } from "./header/header.component";

const routes: Routes = [
    {
        path: "footer",
        component: FooterComponent
    },
    {
        path: "header",
        component: HeaderComponent
    },
    {
        path: "404",
        component: NotFoundComponent
    },
    {
        path: "contact",
        component: ContactComponent
    },
    {
        path: "privacy",
        component: PrivacyComponent
    },
    {
        path: "terms",
        component: TermsAndConditionsComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ImportedRoutingModule {}

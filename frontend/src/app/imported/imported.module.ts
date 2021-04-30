import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ImportedRoutingModule } from "./imported-routing.module";
import { PrivacyComponent } from "./privacy/privacy.component";
import { ContactComponent } from "./contact/contact.component";
import { NotFoundComponent } from "./not-found/not-found.component";
import { TermsAndConditionsComponent } from "./terms-and-conditions/terms-and-conditions.component";
import { HeaderComponent } from "./header/header.component";
import { FooterComponent } from "./footer/footer.component";
import { SafeHtmlPipe } from "./safe-html.pipe";

@NgModule({
    declarations: [
        PrivacyComponent,
        ContactComponent,
        NotFoundComponent,
        TermsAndConditionsComponent,
        HeaderComponent,
        FooterComponent,
        SafeHtmlPipe
    ],
    imports: [CommonModule, ImportedRoutingModule]
})
export class ImportedModule {}

import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { MarkdownModule, MarkedOptions, MarkedRenderer } from "ngx-markdown";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { UiModule } from "./ui.module";
import { GraphQLModule } from "./graphql.module";
import { MAT_RIPPLE_GLOBAL_OPTIONS, RippleGlobalOptions } from "@angular/material/core";
import { AngularSimplemdeModule } from "angular-simplemde";
import { buildMarkedOptionsFactory } from "./markdown-options";
import { SharedModule } from "./shared/shared.module";

const globalRippleConfig: RippleGlobalOptions = {
    disabled: true,
    animation: {
        enterDuration: 300,
        exitDuration: 0
    }
};

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        GraphQLModule,
        HttpClientModule,
        ReactiveFormsModule,
        FormsModule,
        SharedModule,
        UiModule,
        MarkdownModule.forRoot({
            markedOptions: {
                provide: MarkedOptions,
                useFactory: buildMarkedOptionsFactory
            }
        }),
        AngularSimplemdeModule
    ],
    providers: [{ provide: MAT_RIPPLE_GLOBAL_OPTIONS, useValue: globalRippleConfig }],
    bootstrap: [AppComponent],
    entryComponents: [],
    schemas: []
})
export class AppModule {}

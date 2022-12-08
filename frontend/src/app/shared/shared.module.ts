import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatStepperModule } from "@angular/material/stepper";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTableModule } from "@angular/material/table";

import { HeaderComponent } from "./header/header.component";
import { FooterComponent } from "./footer/footer.component";
import { TimeAgoPipe } from "./pipes/time-ago.pipe";
import { ImageUploadModalComponent } from "./image-upload-modal/image-upload-modal.component";
import { PackageItemComponent } from "./package-item/package-item.component";
import { CollectionItemComponent } from "./collection-item/collection-item.component";
import { CatalogItemComponent } from "./catalog-item/catalog-item.component";
import { ForgotPasswordDialogComponent } from "./header/forgot-password-dialog/forgot-password-dialog.component";
import { LoginDialogComponent } from "./header/login-dialog/login-dialog.component";
import { SignUpDialogComponent } from "./header/sign-up-dialog/sign-up-dialog.component";
import { AvatarComponent } from "./avatar/avatar.component";
import { UsernamePipe } from "./pipes/username.pipe";
import { CoverComponent } from "./cover/cover.component";
import { PercentPipe } from "./pipes/percent.pipe";
import { SanitizeWithStylePipe } from "./pipes/sanitize-with-style.pipe";
import { ValuesPipe } from "./pipes/values.pipe";
import { KeysPipe } from "./pipes/keys.pipe";
import { EntriesPipe } from "./pipes/entries.pipe";
import { SortByPipe } from "./pipes/sort.pipe";
import { InputComponent } from "./input/input.component";
import { InputErrorPipe } from "./pipes/input-error.pipe";
import { TruncatePipe } from "./pipes/truncate.pipe";
import { EditCollectionComponent } from "./edit-collection/edit-collection.component";
import { ConfirmationDialogComponent } from "./confirmation-dialog/confirmation-dialog.component";
import { EditCatalogComponent } from "./edit-catalog/edit-catalog.component";
import { CreateCollectionComponent } from "./create-collection/create-collection.component";
import { CreateCatalogComponent } from "./create-catalog/create-catalog.component";
import { UserDetailsHeaderComponent } from "./user-details/user-details-header/user-details-header.component";
import { UserCatalogsComponent } from "./user-details/user-catalogs/user-catalogs.component";
import { DeleteCollectionComponent } from "./delete-collection/delete-collection.component";
import { DeleteCatalogComponent } from "./delete-catalog/delete-catalog.component";
import { DeleteGroupComponent } from "./delete-group/delete-group.component";
import { FewPackagesAlertComponent } from "./user-details/few-packages-alert/few-packages-alert.component";
import { UserCollectionsComponent } from "./user-details/user-collections/user-collections.component";
import { UserPackagesComponent } from "./user-details/user-packages/user-packages.component";
import { EditAccountDialogComponent } from "./user-details/edit-account-dialog/edit-account-dialog.component";
import { EditPasswordDialogComponent } from "./user-details/edit-password-dialog/edit-password-dialog.component";
import { UserDetailsComponent } from "./user-details/user-details/user-details.component";
import { SimpleCreateComponent } from "./user-details/simple-create/simple-create.component";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { DeletePackageComponent } from "./delete-package/delete-package.component";
import { MatSelectModule } from "@angular/material/select";
import { FancyConfirmationDialogComponent } from "./dialogs/fancy-confirmation-dialog/fancy-confirmation-dialog.component";
import { UserStatusChangeConfirmationDialogComponent } from "./dialogs/user-status-change-confirmation-dialog/user-status-change-confirmation-dialog.component";
import { UserInviteInputComponent } from "./user-invite-input/user-invite-input.component";
import { MatChipsModule } from "@angular/material/chips";
import { PackageAndCollectionComponent } from "./package-and-collection/package-and-collection.component";
import { CollectionsHorizontalListComponent } from "./package-and-collection/collections-horizontal-list/collections-horizontal-list.component";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MarkdownEditorComponent } from "./markdown-editor/markdown-editor.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ShareDialogComponent } from "./dialogs/share-dialog/share-dialog.component";
import { AngularSimplemdeModule } from "angular-simplemde";
import { FollowDialogComponent } from "./dialogs/follow-dialog/follow-dialog.component";
import { UserFollowingComponent } from "./user-details/user-following/user-following.component";
import { UserTypeFollowingComponent } from "./user-details/user-following/user-type-following/user-type-following.component";
import { IvyCarouselModule } from "angular-responsive-carousel";
import { ImportedModule } from "../imported/imported.module";
import { MovePackageComponent } from "./move-package/move-package.component";
import { HeroComponent } from "./hero/hero.component";
import { SwiperModule } from "swiper/angular";
import { FollowersComponent } from "./followers/followers.component";
import { UpdateMethodPipe } from "../package/pipes/update-method.pipe";
import { UserGroupsComponent } from "../shared/user-details/user-groups/user-groups.component";
import { CreateGroupComponent } from "../shared/create-group/create-group.component";
import { EditGroupComponent } from "../shared/edit-group/edit-group.component";
import { UserItemComponent } from "../shared/user-item/user-item.component";
import { PackageAutocompleteComponent } from "./package-autocomplete/package-autocomplete.component";
import { CatalogAutocompleteComponent } from "./catalog-autocomplete/catalog-autocomplete.component";
import { CollectionAutocompleteComponent } from "./collection-autocomplete/collection-autocomplete.component";
import { UpdateModalComponent } from "./command-modal/update/update-modal.component";
import { PackageModalComponent } from "./command-modal/package/package-modal.component";
import { CommandModalComponent } from "./command-modal/command-modal.component";
import { CreatePackageModalComponent } from "./command-modal/package/create-package-modal.component";
import { FetchModalComponent } from "./command-modal/fetch/fetch-modal.component";

@NgModule({
    declarations: [
        HeaderComponent,
        FooterComponent,
        TimeAgoPipe,
        ImageUploadModalComponent,
        PackageItemComponent,
        UserItemComponent,
        CollectionItemComponent,
        CatalogItemComponent,
        ForgotPasswordDialogComponent,
        LoginDialogComponent,
        SignUpDialogComponent,
        AvatarComponent,
        UsernamePipe,
        CoverComponent,
        PercentPipe,
        SanitizeWithStylePipe,
        ValuesPipe,
        KeysPipe,
        EntriesPipe,
        SortByPipe,
        InputComponent,
        InputErrorPipe,
        TruncatePipe,
        EditCollectionComponent,
        ConfirmationDialogComponent,
        EditCatalogComponent,
        CreateCollectionComponent,
        CreateCatalogComponent,
        CreateGroupComponent,
        UserDetailsHeaderComponent,
        UserCatalogsComponent,
        DeleteCatalogComponent,
        DeleteGroupComponent,
        DeleteCollectionComponent,
        FewPackagesAlertComponent,
        UserCollectionsComponent,
        UserPackagesComponent,
        EditAccountDialogComponent,
        EditPasswordDialogComponent,
        EditGroupComponent,
        UserDetailsComponent,
        SimpleCreateComponent,
        DeletePackageComponent,
        FancyConfirmationDialogComponent,
        UserStatusChangeConfirmationDialogComponent,
        UserInviteInputComponent,
        PackageAndCollectionComponent,
        CollectionsHorizontalListComponent,
        MarkdownEditorComponent,
        ShareDialogComponent,
        FollowDialogComponent,
        UserFollowingComponent,
        UserTypeFollowingComponent,
        MovePackageComponent,
        HeroComponent,
        FollowersComponent,
        UserGroupsComponent,
        UpdateMethodPipe,
        PackageAutocompleteComponent,
        CatalogAutocompleteComponent,
        CollectionAutocompleteComponent,
        UpdateModalComponent,
        PackageModalComponent,
        FetchModalComponent,
        CreatePackageModalComponent,
        CommandModalComponent
    ],
    imports: [
        CommonModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatMenuModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatCheckboxModule,
        MatSnackBarModule,
        MatStepperModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatTableModule,
        MatChipsModule,
        MatTooltipModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        AngularSimplemdeModule,
        IvyCarouselModule,
        ImportedModule,
        SwiperModule
    ],
    exports: [
        HeaderComponent,
        FooterComponent,
        TimeAgoPipe,
        PackageItemComponent,
        UserItemComponent,
        CollectionItemComponent,
        CatalogItemComponent,
        ForgotPasswordDialogComponent,
        LoginDialogComponent,
        SignUpDialogComponent,
        AvatarComponent,
        UsernamePipe,
        CoverComponent,
        PercentPipe,
        ValuesPipe,
        KeysPipe,
        EntriesPipe,
        SortByPipe,
        TruncatePipe,
        InputComponent,
        InputErrorPipe,
        EditCollectionComponent,
        EditGroupComponent,
        ConfirmationDialogComponent,
        EditCatalogComponent,
        CreateCollectionComponent,
        UserDetailsHeaderComponent,
        UserCatalogsComponent,
        DeleteCatalogComponent,
        DeleteGroupComponent,
        DeleteCollectionComponent,
        FewPackagesAlertComponent,
        UserCollectionsComponent,
        UserPackagesComponent,
        EditAccountDialogComponent,
        EditPasswordDialogComponent,
        UserDetailsComponent,
        FancyConfirmationDialogComponent,
        CollectionsHorizontalListComponent,
        UserInviteInputComponent,
        PackageAndCollectionComponent,
        MarkdownEditorComponent,
        FollowDialogComponent,
        UserFollowingComponent,
        UserGroupsComponent,
        HeroComponent,
        FollowersComponent,
        PackageAutocompleteComponent,
        CatalogAutocompleteComponent,
        CollectionAutocompleteComponent
    ],
    providers: [TimeAgoPipe, { provide: MAT_DIALOG_DATA, useValue: {} }]
})
export class SharedModule {}

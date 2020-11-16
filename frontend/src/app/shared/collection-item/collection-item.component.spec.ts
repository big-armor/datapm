import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { CollectionItemComponent } from "./collection-item.component";
import { MatCardModule } from "@angular/material/card";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

const collectionItem: any = {
    description: "test test testing a description",
    name: "test-collections-slug",
    identifier: {
        collectionSlug: "test-item-collectionslug"
    },
    packages: [
        {
            description: "description-of-latest-package",
            displayName: "displayName-of-latest-package",
            identifier: {
                catalogSlug: "gregoryt1",
                packageSlug: "latestpackage22-slug"
            }
        }
    ],
    isPublic: true,
    isRecommended: true,
    updatedAt: new Date(new Date().getTime() - 300000)
};

describe("CollectionItemComponent", () => {
    let component: CollectionItemComponent;
    let fixture: ComponentFixture<CollectionItemComponent>;

    beforeEach(async(() => {
        const routerSpy = jasmine.createSpyObj("Router", ["navigateByUrl"]);
        TestBed.configureTestingModule({
            declarations: [CollectionItemComponent],
            imports: [RouterTestingModule, MatCardModule, MatDialogModule],
            providers: [
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {}
                },
                {
                    provide: MatDialogRef,
                    useValue: {}
                }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CollectionItemComponent);
        component = fixture.componentInstance;
        component.item = collectionItem;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});

import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { FileService } from "src/app/services/file.service";
import { ImageService } from "src/app/services/image.service";
import { Catalog, User } from "src/generated/graphql";

enum State {
    LOADING,
    LOADED
}

@Component({
    selector: "app-avatar",
    templateUrl: "./avatar.component.html",
    styleUrls: ["./avatar.component.scss"]
})
export class AvatarComponent implements OnChanges, OnDestroy {
    @Input()
    public user: User;

    @Input()
    public catalog: Catalog;

    @Input()
    public size: number = 40;

    @Input()
    public editable: boolean = false;

    @Input()
    public circled: boolean = true;

    @Output()
    public upload: EventEmitter<any>;

    public State = State;

    public state = State.LOADING;

    public selectedImageData;
    public letter = "";

    public backgroundColor = "#FFFFFF";

    private inputEventId: string = "";
    private readonly unsubscribe$ = new Subject();

    constructor(private fileService: FileService, private imageService: ImageService) {
        this.upload = new EventEmitter<any>();

        this.fileService.selectedFiles.pipe(takeUntil(this.unsubscribe$)).subscribe(({ id, files }) => {
            if (id === this.inputEventId) {
                const reader = new FileReader();
                reader.onload = () => this.upload.emit(reader.result);
                reader.readAsDataURL(files[0]);
                this.selectedImageData = this.imageService.convertBlobToSafeImageObjectUrl(files[0]);
            }
        });
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.user && changes.user.currentValue) {
            this.user = changes.user.currentValue;
            this.getUserAvatarImage(this.user.username);
        } else if (changes.catalog && changes.catalog.currentValue) {
            this.catalog = changes.catalog.currentValue;
            this.letter = this.catalog.displayName?.substr(0, 1).toUpperCase();
            this.getCatalogAvatarImage(this.catalog.identifier.catalogSlug);
        } else {
            this.state = State.LOADED;
        }
    }

    public ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    public uploadFile(): void {
        this.inputEventId = this.fileService.openFile("image/jpeg");
    }

    private getUserAvatarImage(username?: string): void {
        if (!username) {
            return;
        }

        this.imageService
            .loadUserAvatar(username)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((imgData: any) => {
                if (imgData) {
                    this.loadImageData(imgData);
                    return;
                }
                this.selectedImageData = null;

                if (this.user?.firstName && this.user?.lastName) {
                    this.letter =
                        this.user.firstName.substr(0, 1).toUpperCase() + this.user.lastName.substr(0, 1).toUpperCase();
                } else if (this.user.username != null) {
                    this.letter = this.user.username.substr(0, 1).toUpperCase() || "";
                } else {
                    this.letter = "";
                }
                this.backgroundColor = this.hashStringToColor(username);
                this.state = State.LOADED;
            });
    }

    private getCatalogAvatarImage(catalogSlug?: string): void {
        if (!catalogSlug) {
            return;
        }

        this.imageService
            .loadCatalogAvatar(catalogSlug)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((imgData: any) => {
                if (imgData) {
                    this.loadImageData(imgData);
                } else {
                    this.backgroundColor = this.hashStringToColor(catalogSlug);
                    this.state = State.LOADED;
                }
            });
    }

    private loadImageData(imageData: any): void {
        this.selectedImageData = imageData;
        this.state = State.LOADED;
    }

    private djb2(str): number {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) + hash + str.charCodeAt(i);
        }
        return hash;
    }

    private hashStringToColor(str): string {
        const hash = this.djb2(str);
        const r = (hash & 0x990000) >> 16;
        const g = (hash & 0x009900) >> 8;
        const b = hash & 0x000099;
        return (
            "#" +
            ("0" + r.toString(16)).substr(-2) +
            ("0" + g.toString(16)).substr(-2) +
            ("0" + b.toString(16)).substr(-2)
        );
    }
}

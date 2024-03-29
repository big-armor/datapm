import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { FileService } from "src/app/services/file.service";
import { ImageService } from "src/app/services/image.service";
import { User } from "src/generated/graphql";

@Component({
    selector: "app-cover",
    templateUrl: "./cover.component.html",
    styleUrls: ["./cover.component.scss"]
})
export class CoverComponent implements OnChanges {
    @Input()
    public username: string;

    @Input()
    public catalogSlug: string;

    @Input()
    public collectionSlug: string;

    @Input()
    public packageSlug: string;

    @Input()
    public defaultCover: string;

    @Input()
    public height: number = 40;

    @Input()
    public editable: boolean = false;

    @Output()
    public upload: EventEmitter<any>;

    public selectedImageData;
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
        if (changes.username && changes.username.currentValue) {
            this.fetchImage();
        } else if (changes.packageSlug && changes.packageSlug.currentValue) {
            this.fetchImage();
        } else if (changes.catalogSlug && changes.catalogSlug.currentValue) {
            this.fetchImage();
        } else if (changes.collectionSlug && changes.collectionSlug.currentValue) {
            this.fetchImage();
        }
    }

    public uploadFile(): void {
        this.inputEventId = this.fileService.openFile("image/jpeg");
    }

    private fetchImage(reload?: boolean): void {
        let imageObservable;
        if (this.username) {
            imageObservable = this.imageService.loadUserCover(this.username, reload);
        } else if (this.packageSlug && this.catalogSlug) {
            imageObservable = this.imageService.loadPackageCover(this.catalogSlug, this.packageSlug, reload);
        } else if (this.catalogSlug) {
            imageObservable = this.imageService.loadCatalogCover(this.catalogSlug, reload);
        } else if (this.collectionSlug) {
            imageObservable = this.imageService.loadCollectionCover(this.collectionSlug, reload);
        } else {
            return;
        }

        imageObservable.pipe(takeUntil(this.unsubscribe$)).subscribe((imgData: any) => {
            if (imgData) {
                this.selectedImageData = imgData;
            } else {
                this.selectedImageData = this.defaultCover;
            }
        });
    }
}

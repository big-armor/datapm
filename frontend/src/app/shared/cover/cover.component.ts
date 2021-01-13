import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from "@angular/core";
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
export class CoverComponent implements OnInit {
    @Input() username: string;
    @Input() catalogSlug: string;
    @Input() collectionSlug: string;
    @Input() packageSlug: string;
    @Input() defaultCover: string;
    @Input() height: number = 40;
    @Input() editable: boolean = false;
    @Output() upload: EventEmitter<any>;

    public imgData = "";
    private inputEventId: string = "";
    private unsubscribe$ = new Subject();

    constructor(private fileService: FileService, private imageService: ImageService) {
        this.upload = new EventEmitter<any>();

        this.fileService.selectedFiles.pipe(takeUntil(this.unsubscribe$)).subscribe(({ id, files }) => {
            if (id === this.inputEventId) {
                const reader = new FileReader();
                reader.onload = () => this.upload.emit(reader.result);
                reader.readAsDataURL(files[0]);
            }
        });

        this.imageService.shouldRefresh.pipe(takeUntil(this.unsubscribe$)).subscribe(({ target }) => {
            if (target === "cover") {
                this.fetchImage(true);
            }
        });
    }

    ngOnInit(): void {}

    ngOnChanges(changes: SimpleChanges) {
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

    uploadFile() {
        this.inputEventId = this.fileService.openFile("image/jpeg");
    }

    private fetchImage(reload?: boolean): void {
        let imageObservable;
        if (this.username) {
            imageObservable = this.imageService.getUserCover(this.username, reload);
        } else if (this.packageSlug && this.catalogSlug) {
            imageObservable = this.imageService.getPackageCover(this.catalogSlug, this.packageSlug, reload);
        } else if (this.catalogSlug) {
            imageObservable = this.imageService.getCatalogCover(this.catalogSlug, reload);
        } else if (this.collectionSlug) {
            imageObservable = this.imageService.getCollectionCover(this.collectionSlug, reload);
        } else {
            return;
        }

        imageObservable.subscribe(
            (imgData: any) => (this.imgData = imgData),
            () => (this.imgData = this.defaultCover)
        );
    }
}

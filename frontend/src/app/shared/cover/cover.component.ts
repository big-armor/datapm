import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AuthenticationService } from "src/app/services/authentication.service";
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
                this.getImage();
            }
        });
    }

    ngOnInit(): void {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.username && changes.username.currentValue) {
            this.getImage();
        } else if (changes.packageSlug && changes.packageSlug.currentValue) {
            this.getImage();
        } else if (changes.catalogSlug && changes.catalogSlug.currentValue) {
            this.getImage();
        } else if (changes.collectionSlug && changes.collectionSlug.currentValue) {
            this.getImage();
        }
    }

    uploadFile() {
        this.inputEventId = this.fileService.openFile("image/jpeg");
    }

    private getImage() {
        let url;
        if (this.username) {
            url = `/images/user/${this.username}/cover`;
        } else if (this.packageSlug && this.catalogSlug) {
            url = `/images/package/${this.catalogSlug}/${this.packageSlug}/cover`;
        } else if (this.catalogSlug) {
            url = `/images/catalog/${this.catalogSlug}/cover`;
        } else if (this.collectionSlug) {
            url = `/images/collection/${this.collectionSlug}/cover`;
        } else {
            return;
        }

        this.imageService.getImage(url).subscribe(
            (imgData: any) => {
                this.imgData = imgData;
            },
            () => {
                this.imgData = null;
            }
        );
    }
}

import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { FileService } from "src/app/services/file.service";
import { ImageService } from "src/app/services/image.service";
import { User } from "src/generated/graphql";

@Component({
    selector: "app-avatar",
    templateUrl: "./avatar.component.html",
    styleUrls: ["./avatar.component.scss"]
})
export class AvatarComponent implements OnInit, OnChanges, OnDestroy {
    @Input() user: User;
    @Input() size: number = 40;
    @Input() editable: boolean = false;
    @Output() upload: EventEmitter<any>;

    public imgData = "";
    public letter = "";
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

        this.imageService.shouldRefresh.pipe(takeUntil(this.unsubscribe$)).subscribe(({ target, username }) => {
            if (target === "avatar" && this.user?.username === username) {
                setTimeout(() => {
                    this.getImage(username);
                }, 300);
            }
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.user && changes.user.currentValue) {
            this.user = changes.user.currentValue;
            this.letter = (this.user.firstName || this.user.username || "").substr(0, 1).toUpperCase();
            this.getImage(this.user.username);
        }
    }

    ngOnInit(): void {}

    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    uploadFile() {
        this.inputEventId = this.fileService.openFile("image/*");
    }

    private getImage(username?: string) {
        if (!username) {
            return;
        }

        const url = `/images/user/${username}/avatar`;
        this.imageService.getImage(url).subscribe(
            (imgData: any) => {
                this.imgData = imgData;
                console.log(this.imgData);
            },
            () => {
                this.imgData = null;
            }
        );
    }
}

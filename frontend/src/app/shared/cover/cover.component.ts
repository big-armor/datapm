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
    @Input() user: User;
    @Input() height: number = 40;
    @Input() editable: boolean = false;
    @Output() upload: EventEmitter<any>;

    public imgData = "";
    private inputEventId: string = "";
    private unsubscribe$ = new Subject();

    constructor(
        private fileService: FileService,
        private imageService: ImageService,
        private authService: AuthenticationService
    ) {
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
                setTimeout(() => this.getImage(this.user?.username), 1000); // timeout is required for some weird reason
            }
        });

        this.authService
            .getUserObservable()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((user) => {
                user.then((user) => {
                    if (user) this.getImage(user.username);
                });
            });
    }

    ngOnInit(): void {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.user && changes.user.currentValue) {
            this.user = changes.user.currentValue;
            this.getImage(this.user.username);
        }
    }

    uploadFile() {
        this.inputEventId = this.fileService.openFile("image/jpeg");
    }

    private getImage(username?: string) {
        if (!username) {
            return;
        }

        const url = `/images/user/${username}/cover`;
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

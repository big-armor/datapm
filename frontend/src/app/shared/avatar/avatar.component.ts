import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AuthenticationService } from "src/app/services/authentication.service";

import { FileService } from "src/app/services/file.service";
import { ImageService } from "src/app/services/image.service";
import { User } from "src/generated/graphql";

enum State {
    LOADING,
    LOADED
}

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

    State = State;

    public state = State.LOADING;

    public imgData = "";
    public letter = "";
    private inputEventId: string = "";
    private unsubscribe$ = new Subject();

    public userBackgroundColor = "#FFFFFF";

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

        this.imageService.shouldRefresh.pipe(takeUntil(this.unsubscribe$)).subscribe(({ target, username }) => {
            if (target === "avatar" && this.user?.username === username) {
                setTimeout(() => this.getImage(username), 1000); // timeout is required for some weird reason
            }
        });

        this.authService
            .getUserObservable()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((user) => {
                user.then((user) => {
                    if (user) this.getImage(user.username);
                    else this.userBackgroundColor = "#FFFFFF";
                });
            });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.user && changes.user.currentValue) {
            this.user = changes.user.currentValue;

            if (this.user?.nameIsPublic && this.user?.firstName && this.user?.lastName) {
                this.letter =
                    this.user.firstName.substr(0, 1).toUpperCase() + this.user.lastName.substr(0, 1).toUpperCase();
            } else if (this.user.username != null) {
                this.letter = this.user.username.substr(0, 1).toUpperCase() || "";
            } else {
                this.letter = "";
            }

            this.getImage(this.user.username);
        }
    }

    ngOnInit(): void {}

    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    uploadFile() {
        this.inputEventId = this.fileService.openFile("image/jpeg");
    }

    private getImage(username?: string) {
        if (!username) {
            return;
        }
        this.userBackgroundColor = "#FFFF";

        const url = `/images/user/${username}/avatar`;
        this.imageService.getImage(url).subscribe(
            (imgData: any) => {
                this.userBackgroundColor = this.hashStringToColor(username);
                this.imgData = imgData;
                this.state = State.LOADED;
            },
            (error) => {
                console.log(JSON.stringify(error, null, 1));
                this.imgData = null;
                this.userBackgroundColor = this.hashStringToColor(username);
                this.state = State.LOADED;
            }
        );
    }

    private djb2(str) {
        var hash = 5381;
        for (var i = 0; i < str.length; i++) {
            hash = (hash << 5) + hash + str.charCodeAt(i); /* hash * 33 + c */
        }
        return hash;
    }

    private hashStringToColor(str) {
        var hash = this.djb2(str);
        var r = (hash & 0x990000) >> 16;
        var g = (hash & 0x009900) >> 8;
        var b = hash & 0x000099;
        return (
            "#" +
            ("0" + r.toString(16)).substr(-2) +
            ("0" + g.toString(16)).substr(-2) +
            ("0" + b.toString(16)).substr(-2)
        );
    }
}

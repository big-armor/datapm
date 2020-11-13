import { Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

@Injectable({
    providedIn: "root"
})
export class SnackBarService {
    //create an instance of MatSnackBar

    constructor(private snackBar: MatSnackBar) {}

    /* It takes three parameters 
	1.the message string 
	2.the action 
	3.the duration, alignment, etc. */

    openSnackBar(message: string, action: string) {
        this.snackBar.open(message, action, {
            duration: 2000
        });
    }
}

import { DialogDimensions } from "./dialog-dimensions";
import { DialogSize } from "./dialog-size";

export class DialogDimensionsCalculator {
    // TODO: Take the screen size under consideration
    public static calculate(dialogSize: DialogSize): DialogDimensions {
        let x;
        let y;
        switch (dialogSize) {
            default:
            case DialogSize.SMALL:
                x = 400;
                y = 400;
                break;
            case DialogSize.MEDIUM:
                x = 500;
                y = 500;
                break;
            case DialogSize.LARGE:
                x = 600;
                y = 600;
                break;
            case DialogSize.X_LARGE:
                x = 700;
                y = 700;
                break;
        }

        return { x, y };
    }
}

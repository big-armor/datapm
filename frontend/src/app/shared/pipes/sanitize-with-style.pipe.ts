
import { Pipe, PipeTransform } from "@angular/core";
import { SafeHtml, DomSanitizer } from "@angular/platform-browser";
import DOMPurify from "dompurify";

@Pipe({
    name:
    'sanitizeWithStyle'
})
export class SanitizeWithStylePipe implements PipeTransform
{
constructor (private sanitizer : DomSanitizer) {}
    transform(html: string) : SafeHtml {
        // Allowing CSS is still not recommended
        return this.sanitizer.bypassSecurityTrustHtml(
            DOMPurify.sanitize(html, {ADD_ATTR: ['style']})
        );
    }
}

import { MarkedOptions, MarkedRenderer } from "ngx-markdown";

export function buildMarkedOptionsFactory(): MarkedOptions {
    const renderer = new MarkedRenderer();

    renderer.blockquote = (text: string) => {
        return '<blockquote class="markdown-quote-block"><p>' + text + "</p></blockquote>";
    };

    return {
        renderer: renderer,
        gfm: true,
        breaks: false,
        pedantic: false,
        smartLists: true,
        smartypants: false
    };
}

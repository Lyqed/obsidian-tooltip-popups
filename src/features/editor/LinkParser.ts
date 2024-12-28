import { EditorView } from '@codemirror/view';

export class LinkParser {
    /**
     * Parse an Imgur link from the text at the given position
     */
    static parseImgurLink(view: EditorView, pos: number): string | null {
        // Get the line of text at this position
        const line = view.state.doc.lineAt(pos);
        const lineText = line.text;

        // Parse markdown links in the current line
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/(?:i\.)?imgur\.com\/[^\)]+)\)/g;
        let match: RegExpExecArray | null;
        let foundLink: string | null = null;

        while ((match = linkRegex.exec(lineText)) !== null) {
            const [fullMatch, linkText, url] = match;
            const linkTextStart = match.index + 1; // +1 to skip the opening [
            const linkTextEnd = linkTextStart + linkText.length;

            // Check if the cursor is within the link text only (between [ and ])
            if (pos >= line.from + linkTextStart && pos <= line.from + linkTextEnd) {
                foundLink = url;
                break;
            }
        }

        return foundLink;
    }

    /**
     * Check if the element is a valid link element
     */
    static isLinkElement(element: HTMLElement): boolean {
        return element.matches('.cm-underline, .cm-link:not(.cm-formatting-link)');
    }
}

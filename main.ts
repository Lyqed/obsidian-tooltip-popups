import { Plugin } from 'obsidian';
import { EditorView } from '@codemirror/view';

export default class ImgurPreviewPlugin extends Plugin {
    private tooltip: HTMLElement;
    private currentTooltipLink: string | null = null;
    private hoverTimeout: NodeJS.Timeout | null = null;

    async onload() {
        console.log('Loading Imgur Preview plugin');

        // Create tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.addClass('imgur-preview-tooltip');
        document.body.appendChild(this.tooltip);

        // Register event handler for editor changes
        this.registerEditorExtension([
            EditorView.domEventHandlers({
                mouseover: this.handleMouseOver.bind(this),
                mouseout: this.handleMouseOut.bind(this)
            })
        ]);
    }

    onunload() {
        console.log('Unloading Imgur Preview plugin');
        this.tooltip?.remove();
    }

    private async handleMouseOver(event: MouseEvent, view: EditorView) {
        const target = event.target as HTMLElement;
        
        // Clear any existing hover timeout
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }

        // Get the position in the editor where the mouse is
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos === null) return;

        // Get the line of text at this position
        const line = view.state.doc.lineAt(pos);
        const lineText = line.text;

        console.log('Hover detected at position:', pos);
        console.log('Line text:', lineText);

        // Parse markdown links in the current line
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/(?:i\.)?imgur\.com\/[^\)]+)\)/g;
        let match: RegExpExecArray | null;
        let foundLink: string | null = null;

        while ((match = linkRegex.exec(lineText)) !== null) {
            const [fullMatch, linkText, url] = match;
            const linkStart = match.index;
            const linkEnd = linkStart + fullMatch.length;

            // Check if the cursor is within this link
            if (pos >= line.from + linkStart && pos <= line.from + linkEnd) {
                foundLink = url;
                console.log('Found Imgur link:', url);
                break;
            }
        }

        if (foundLink && foundLink !== this.currentTooltipLink) {
            // Add a small delay before showing the tooltip
            this.hoverTimeout = setTimeout(() => {
                this.showTooltip(foundLink!, event.clientX, event.clientY);
            }, 300);
        }
    }

    private handleMouseOut() {
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
        this.hideTooltip();
    }

    private async showTooltip(url: string, x: number, y: number) {
        console.log('Showing tooltip for URL:', url);
        
        // Convert gallery URLs to direct image URLs if needed
        const imageUrl = this.convertToDirectImageUrl(url);
        console.log('Converted to direct image URL:', imageUrl);

        this.currentTooltipLink = url;
        
        // Show loading state
        this.tooltip.empty();
        this.tooltip.addClass('loading');
        this.tooltip.setText('Loading...');
        
        // Position the tooltip
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = `${x + 10}px`;
        this.tooltip.style.top = `${y + 10}px`;

        try {
            // Create and load the image
            const img = document.createElement('img');
            
            // Create a promise that resolves when the image loads or rejects on error
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = imageUrl;
            });

            // Image loaded successfully
            this.tooltip.removeClass('loading');
            this.tooltip.removeClass('error');
            this.tooltip.empty();
            this.tooltip.appendChild(img);
            
            // Adjust tooltip position if it goes off-screen
            const tooltipRect = this.tooltip.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            if (tooltipRect.right > viewportWidth) {
                this.tooltip.style.left = `${viewportWidth - tooltipRect.width - 10}px`;
            }
            if (tooltipRect.bottom > viewportHeight) {
                this.tooltip.style.top = `${viewportHeight - tooltipRect.height - 10}px`;
            }

        } catch (error) {
            console.error('Error loading image:', error);
            this.tooltip.removeClass('loading');
            this.tooltip.addClass('error');
            this.tooltip.setText('Failed to load image');
        }
    }

    private hideTooltip() {
        console.log('Hiding tooltip');
        this.tooltip.style.display = 'none';
        this.currentTooltipLink = null;
    }

    private convertToDirectImageUrl(url: string): string {
        // Convert various Imgur URL formats to direct image URLs
        const urlObj = new URL(url);
        const path = urlObj.pathname;

        // Remove /gallery/ from the path if present
        const cleanPath = path.replace(/^\/gallery\//, '/');
        
        // If the URL doesn't end in an image extension, append .jpg
        if (!/\.(jpg|jpeg|png|gif)$/i.test(cleanPath)) {
            return `https://i.imgur.com${cleanPath}.jpg`;
        }

        // If it's already a direct image URL, return as is
        if (urlObj.hostname === 'i.imgur.com') {
            return url;
        }

        // Convert to i.imgur.com URL
        return `https://i.imgur.com${cleanPath}`;
    }
}

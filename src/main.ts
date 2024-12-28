import { Plugin, PluginSettingTab, Setting, App } from 'obsidian';
import { EditorView } from '@codemirror/view';

interface ImgurPreviewSettings {
    defaultMaxWidth: number;
    defaultMaxHeight: number;
}

const DEFAULT_SETTINGS: ImgurPreviewSettings = {
    defaultMaxWidth: 300,
    defaultMaxHeight: 300
}

export default class ImgurPreviewPlugin extends Plugin {
    private tooltip: HTMLElement;
    private currentTooltipLink: string | null = null;
    private hoverTimeout: NodeJS.Timeout | null = null;
    settings: ImgurPreviewSettings;
    private currentZoomLevel: number = 1;
    private isMouseOverTooltip: boolean = false;
    private lastLinkRect: DOMRect | null = null;
    private tooltipPosition: 'above' | 'below' | 'left' | 'right' | null = null;
    private hideTimeoutId: NodeJS.Timeout | null = null;

    async onload() {
        console.log('Loading Imgur Preview plugin');
        
        await this.loadSettings();

        // Create tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.addClass('imgur-preview-tooltip');
        
        // Add mouse enter/leave handlers for the tooltip
        this.tooltip.addEventListener('mouseenter', () => {
            console.log('Mouse entered tooltip');
            this.isMouseOverTooltip = true;
        });
        
        this.tooltip.addEventListener('mouseleave', () => {
            console.log('Mouse left tooltip');
            this.isMouseOverTooltip = false;
            this.hideTooltip();
        });
        
        document.body.appendChild(this.tooltip);

        // Add settings tab
        this.addSettingTab(new ImgurPreviewSettingTab(this.app, this));

        // Add wheel event listener for zooming
        this.registerDomEvent(document, 'wheel', (e: WheelEvent) => {
            if (this.currentTooltipLink && e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                this.currentZoomLevel *= delta;
                this.currentZoomLevel = Math.max(0.1, Math.min(5, this.currentZoomLevel));
                
                const img = this.tooltip.querySelector('img');
                if (img) {
                    const newWidth = this.settings.defaultMaxWidth * this.currentZoomLevel;
                    const newHeight = this.settings.defaultMaxHeight * this.currentZoomLevel;
                    img.style.maxWidth = `${newWidth}px`;
                    img.style.maxHeight = `${newHeight}px`;
                    
                    console.log(`Zoom level: ${this.currentZoomLevel}, Size: ${newWidth}x${newHeight}`);
                }
            }
        });

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
        
        // Check if we're hovering over a link element
        // In non-expanded view, links have class 'cm-underline'
        // In expanded view, links have class 'cm-link' but not 'cm-formatting-link'
        if (!target.matches('.cm-underline, .cm-link:not(.cm-formatting-link)')) {
            return;
        }

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
            const linkTextStart = match.index + 1; // +1 to skip the opening [
            const linkTextEnd = linkTextStart + linkText.length;

            // Check if the cursor is within the link text only (between [ and ])
            if (pos >= line.from + linkTextStart && pos <= line.from + linkTextEnd) {
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

    private handleMouseOut(event: MouseEvent) {
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }

        // If we don't have position info, fall back to immediate hide
        if (!this.lastLinkRect || !this.tooltipPosition) {
            this.hideTooltip();
            return;
        }

        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const linkRect = this.lastLinkRect;
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        // Calculate if mouse is moving towards tooltip
        const isMovingTowardsTooltip = this.isMouseMovingTowardsTooltip(
            mouseX, mouseY, linkRect, tooltipRect, this.tooltipPosition
        );

        if (isMovingTowardsTooltip) {
            // Clear any existing hide timeout
            if (this.hideTimeoutId) {
                clearTimeout(this.hideTimeoutId);
            }
            
            // Give user time to reach tooltip
            this.hideTimeoutId = setTimeout(() => {
                if (!this.isMouseOverTooltip) {
                    this.hideTooltip();
                }
            }, 300);
        } else {
            // Hide immediately if moving away from tooltip
            this.hideTooltip();
        }
    }

    private isMouseMovingTowardsTooltip(
        mouseX: number,
        mouseY: number,
        linkRect: DOMRect,
        tooltipRect: DOMRect,
        position: 'above' | 'below' | 'left' | 'right'
    ): boolean {
        const GRACE_AREA = 50; // pixels of grace area

        switch (position) {
            case 'below':
                // If tooltip is below, only give grace when mouse is moving downward
                return mouseY > linkRect.bottom && 
                       mouseY < tooltipRect.top + GRACE_AREA &&
                       mouseX > Math.min(linkRect.left, tooltipRect.left) - GRACE_AREA &&
                       mouseX < Math.max(linkRect.right, tooltipRect.right) + GRACE_AREA;
            
            case 'above':
                // If tooltip is above, only give grace when mouse is moving upward
                return mouseY < linkRect.top &&
                       mouseY > tooltipRect.bottom - GRACE_AREA &&
                       mouseX > Math.min(linkRect.left, tooltipRect.left) - GRACE_AREA &&
                       mouseX < Math.max(linkRect.right, tooltipRect.right) + GRACE_AREA;
            
            case 'right':
                // If tooltip is to the right, only give grace when mouse is moving right
                return mouseX > linkRect.right &&
                       mouseX < tooltipRect.left + GRACE_AREA &&
                       mouseY > Math.min(linkRect.top, tooltipRect.top) - GRACE_AREA &&
                       mouseY < Math.max(linkRect.bottom, tooltipRect.bottom) + GRACE_AREA;
            
            case 'left':
                // If tooltip is to the left, only give grace when mouse is moving left
                return mouseX < linkRect.left &&
                       mouseX > tooltipRect.right - GRACE_AREA &&
                       mouseY > Math.min(linkRect.top, tooltipRect.top) - GRACE_AREA &&
                       mouseY < Math.max(linkRect.bottom, tooltipRect.bottom) + GRACE_AREA;
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private async showTooltip(url: string, x: number, y: number) {
        // Reset zoom level when showing new tooltip
        this.currentZoomLevel = 1;

        // Store the link rectangle for movement calculations
        const linkElements = document.elementsFromPoint(x, y);
        const linkElement = linkElements.find(el => el.matches('.cm-underline, .cm-link:not(.cm-formatting-link)'));
        if (linkElement) {
            this.lastLinkRect = linkElement.getBoundingClientRect();
        }
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
            img.style.maxWidth = `${this.settings.defaultMaxWidth}px`;
            img.style.maxHeight = `${this.settings.defaultMaxHeight}px`;
            
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
            
            // Determine tooltip position relative to link
            if (this.lastLinkRect) {
                const linkCenterX = this.lastLinkRect.left + this.lastLinkRect.width / 2;
                const linkCenterY = this.lastLinkRect.top + this.lastLinkRect.height / 2;
                
                if (tooltipRect.top < this.lastLinkRect.bottom) {
                    this.tooltipPosition = 'below';
                } else if (tooltipRect.bottom > this.lastLinkRect.top) {
                    this.tooltipPosition = 'above';
                } else if (tooltipRect.left < this.lastLinkRect.right) {
                    this.tooltipPosition = 'right';
                } else {
                    this.tooltipPosition = 'left';
                }
            }
            
            if (tooltipRect.right > viewportWidth) {
                this.tooltip.style.left = `${viewportWidth - tooltipRect.width - 10}px`;
            }
            if (tooltipRect.bottom > viewportHeight) {
                this.tooltip.style.top = `${viewportHeight - tooltipRect.height - 10}px`;
            }

            console.log('Tooltip position:', this.tooltipPosition);

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
        this.lastLinkRect = null;
        this.tooltipPosition = null;
        if (this.hideTimeoutId) {
            clearTimeout(this.hideTimeoutId);
            this.hideTimeoutId = null;
        }
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

class ImgurPreviewSettingTab extends PluginSettingTab {
    plugin: ImgurPreviewPlugin;

    constructor(app: App, plugin: ImgurPreviewPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Imgur Preview Settings'});

        new Setting(containerEl)
            .setName('Default Maximum Width')
            .setDesc('Maximum width of the preview image in pixels')
            .addText(text => text
                .setPlaceholder('300')
                .setValue(this.plugin.settings.defaultMaxWidth.toString())
                .onChange(async (value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        this.plugin.settings.defaultMaxWidth = numValue;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Default Maximum Height')
            .setDesc('Maximum height of the preview image in pixels')
            .addText(text => text
                .setPlaceholder('300')
                .setValue(this.plugin.settings.defaultMaxHeight.toString())
                .onChange(async (value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        this.plugin.settings.defaultMaxHeight = numValue;
                        await this.plugin.saveSettings();
                    }
                }));

        containerEl.createEl('p', {
            text: 'Tip: You can also use Ctrl + Mouse Wheel to zoom the preview while hovering over a link.'
        });
    }
}

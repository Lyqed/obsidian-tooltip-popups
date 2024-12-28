import { Plugin } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { ImgurPreviewSettings, DEFAULT_SETTINGS } from './settings/settings';
import { ImgurPreviewSettingTab } from './settings/settingsTab';
import { TooltipManager } from './tooltip/tooltip';
import { isMouseMovingTowardsTooltip } from './tooltip/mouseUtils';

export default class ImgurPreviewPlugin extends Plugin {
    private tooltipManager: TooltipManager;
    private hoverTimeout: NodeJS.Timeout | null = null;
    settings: ImgurPreviewSettings;
    private hideTimeoutId: NodeJS.Timeout | null = null;

    async onload() {
        console.log('Loading Imgur Preview plugin');
        
        await this.loadSettings();

        // Initialize tooltip manager
        this.tooltipManager = new TooltipManager(
            this.settings.defaultMaxWidth,
            this.settings.defaultMaxHeight
        );

        // Add settings tab
        this.addSettingTab(new ImgurPreviewSettingTab(this.app, this));

        // Add wheel event listener for zooming
        this.registerDomEvent(document, 'wheel', (e: WheelEvent) => {
            if (this.tooltipManager.getCurrentTooltipLink() && e.ctrlKey) {
                e.preventDefault();
                this.tooltipManager.handleZoom(e.deltaY);
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
        this.tooltipManager.destroy();
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

        if (foundLink && foundLink !== this.tooltipManager.getCurrentTooltipLink()) {
            // Add a small delay before showing the tooltip
            this.hoverTimeout = setTimeout(() => {
                this.tooltipManager.showTooltip(foundLink!, event.clientX, event.clientY);
            }, 100);
        }
    }

    private handleMouseOut(event: MouseEvent) {
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }

        const lastLinkRect = this.tooltipManager.getLastLinkRect();
        const tooltipPosition = this.tooltipManager.getTooltipPosition();

        // If we don't have position info, fall back to immediate hide
        if (!lastLinkRect || !tooltipPosition) {
            this.tooltipManager.hideTooltip();
            return;
        }

        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const tooltipRect = this.tooltipManager.getTooltipElement().getBoundingClientRect();
        
        // Calculate if mouse is moving towards tooltip
        const isMovingTowards = isMouseMovingTowardsTooltip(
            mouseX, mouseY, lastLinkRect, tooltipRect, tooltipPosition
        );

        if (isMovingTowards) {
            // Clear any existing hide timeout
            if (this.hideTimeoutId) {
                clearTimeout(this.hideTimeoutId);
            }
            
            // Give user time to reach tooltip
            this.hideTimeoutId = setTimeout(() => {
                if (!this.tooltipManager.getIsMouseOverTooltip()) {
                    this.tooltipManager.hideTooltip();
                }
            }, 300);
        } else {
            // Hide immediately if moving away from tooltip
            this.tooltipManager.hideTooltip();
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.tooltipManager.updateSettings(
            this.settings.defaultMaxWidth,
            this.settings.defaultMaxHeight
        );
    }
}

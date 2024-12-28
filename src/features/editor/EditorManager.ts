import { EditorView } from '@codemirror/view';
import { TooltipManager } from '../tooltip/tooltip';
import { PreviewMode } from '../statusbar/types';
import { isMouseMovingTowardsTooltip } from '../tooltip/mouseUtils';

export class EditorManager {
    private tooltipManager: TooltipManager;
    private hoverTimeout: NodeJS.Timeout | null = null;
    private hideTimeoutId: NodeJS.Timeout | null = null;
    private currentMode: PreviewMode = 'default';

    constructor(tooltipManager: TooltipManager) {
        this.tooltipManager = tooltipManager;
    }

    getEditorExtension() {
        return [
            EditorView.domEventHandlers({
                mouseover: this.handleMouseOver.bind(this),
                mouseout: this.handleMouseOut.bind(this)
            })
        ];
    }

    setMode(mode: PreviewMode) {
        this.currentMode = mode;
    }

    handleWheel(e: WheelEvent) {
        if (!this.tooltipManager.getCurrentTooltipLink()) return;
        
        if (e.ctrlKey) {
            // Only prevent default for zooming
            e.preventDefault();
            this.tooltipManager.handleZoom(e.deltaY);
        } else {
            // Allow regular scrolling but hide tooltip
            this.tooltipManager.hideTooltip();
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }
            if (this.hideTimeoutId) {
                clearTimeout(this.hideTimeoutId);
                this.hideTimeoutId = null;
            }
        }
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
        const coords = { x: event.clientX, y: event.clientY };
        const pos = view.posAtCoords(coords);
        if (pos === null) return;

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

        if (foundLink && foundLink !== this.tooltipManager.getCurrentTooltipLink()) {
            // Add a small delay before showing the tooltip
            this.hoverTimeout = setTimeout(() => {
                this.tooltipManager.showTooltip(foundLink!, { x: event.clientX, y: event.clientY });
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

    destroy() {
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
        if (this.hideTimeoutId) {
            clearTimeout(this.hideTimeoutId);
            this.hideTimeoutId = null;
        }
    }
}

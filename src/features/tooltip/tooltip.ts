export class TooltipManager {
    private tooltipElement: HTMLElement;
    private currentTooltipLink: string | null = null;
    private isMouseOverTooltip = false;
    private lastLinkRect: DOMRect | null = null;
    private tooltipPosition: { x: number; y: number } | null = null;
    private currentScale = 1;
    private maxWidth: number;
    private maxHeight: number;
    private wheelListener: (e: WheelEvent) => void;
    private isDragging = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private tooltipStartX = 0;
    private tooltipStartY = 0;
    private isPositionLocked = false;

    constructor(maxWidth: number, maxHeight: number) {
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'imgur-preview-tooltip';
        this.setupTooltipStyles();
        this.setupTooltipEventListeners();
        document.body.appendChild(this.tooltipElement);
    }

    private setupTooltipStyles() {
        this.tooltipElement.style.position = 'fixed';
        this.tooltipElement.style.zIndex = '1000';
        this.tooltipElement.style.display = 'none';
        this.tooltipElement.style.backgroundColor = 'var(--background-primary)';
        this.tooltipElement.style.border = '1px solid var(--background-modifier-border)';
        this.tooltipElement.style.borderRadius = '5px';
        this.tooltipElement.style.padding = '5px';
        this.tooltipElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        this.tooltipElement.style.cursor = 'grab';
    }

    private setupTooltipEventListeners() {
        this.tooltipElement.addEventListener('mouseenter', () => {
            this.isMouseOverTooltip = true;
            if (!this.isPositionLocked) {
                // Add a timeout to hide the tooltip even when hovering
                setTimeout(() => {
                    if (!this.isPositionLocked) {
                        this.hideTooltip();
                    }
                }, 3000); // Hide after 3 seconds
            }
        });

        this.tooltipElement.addEventListener('mouseleave', () => {
            this.isMouseOverTooltip = false;
            if (!this.isPositionLocked) {
                this.hideTooltip();
            }
        });

        // Hide tooltip on scroll unless it's a zoom action
        this.wheelListener = (e: WheelEvent) => {
            if (!e.ctrlKey && !this.isPositionLocked) {
                this.hideTooltip();
            }
        };
        document.addEventListener('wheel', this.wheelListener);

        // Drag functionality
        this.tooltipElement.addEventListener('mousedown', (e: MouseEvent) => {
            e.preventDefault(); // Override default behaviors
            e.stopPropagation(); // Prevent event from bubbling to Obsidian
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            const rect = this.tooltipElement.getBoundingClientRect();
            this.tooltipStartX = rect.left;
            this.tooltipStartY = rect.top;
            this.tooltipElement.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e: MouseEvent) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.dragStartX;
                const deltaY = e.clientY - this.dragStartY;
                this.tooltipElement.style.left = `${this.tooltipStartX + deltaX}px`;
                this.tooltipElement.style.top = `${this.tooltipStartY + deltaY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.isPositionLocked = true;
                this.tooltipElement.style.cursor = 'grab';
            }
        });

        // Double click to reset position lock
        this.tooltipElement.addEventListener('dblclick', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            this.isPositionLocked = false;
            this.hideTooltip();
        });
    }

    showTooltip(imgurLink: string, coords: { x: number; y: number }) {
        if (this.currentTooltipLink === imgurLink) return;

        this.currentTooltipLink = imgurLink;
        this.tooltipPosition = coords;

        // Store the link element's rect for mouse movement calculations
        const linkElement = document.elementFromPoint(coords.x, coords.y) as HTMLElement;
        if (linkElement) {
            this.lastLinkRect = linkElement.getBoundingClientRect();
        }

        // Clear existing content
        this.tooltipElement.innerHTML = '';
        this.currentScale = 1;

        // Create and setup image element
        const img = document.createElement('img');
        img.style.maxWidth = `${this.maxWidth}px`;
        img.style.maxHeight = `${this.maxHeight}px`;
        img.style.transform = `scale(${this.currentScale})`;
        img.style.transformOrigin = 'top left';
        img.style.transition = 'transform 0.1s ease-out';
        img.style.pointerEvents = 'none'; // Prevent image from interfering with drag

        // Modify imgur link to get direct image if needed
        const directImageLink = this.getDirectImageLink(imgurLink);
        img.src = directImageLink;

        this.tooltipElement.appendChild(img);
        this.positionTooltip(coords.x, coords.y);
        this.tooltipElement.style.display = 'block';
    }

    private getDirectImageLink(imgurLink: string): string {
        // If it's already a direct image link, return it
        if (imgurLink.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return imgurLink;
        }

        // Convert imgur.com links to i.imgur.com direct image links
        const imgurId = imgurLink.split('/').pop();
        return `https://i.imgur.com/${imgurId}.jpg`;
    }

    private positionTooltip(x: number, y: number) {
        const padding = 10;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Start with position below the cursor
        let tooltipX = x;
        let tooltipY = y + padding;

        // Ensure the tooltip stays within viewport bounds
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        
        // Adjust horizontal position if needed
        if (tooltipX + tooltipRect.width > viewportWidth - padding) {
            tooltipX = viewportWidth - tooltipRect.width - padding;
        }
        
        // If tooltip would go below viewport, position it above the cursor instead
        if (tooltipY + tooltipRect.height > viewportHeight - padding) {
            tooltipY = y - tooltipRect.height - padding;
        }

        this.tooltipElement.style.left = `${tooltipX}px`;
        this.tooltipElement.style.top = `${tooltipY}px`;
    }

    hideTooltip() {
        if (!this.isPositionLocked) {
            this.tooltipElement.style.display = 'none';
            this.currentTooltipLink = null;
            this.lastLinkRect = null;
            this.tooltipPosition = null;
        }
    }

    handleZoom(deltaY: number) {
        const zoomFactor = 0.1;
        const minScale = 0.5;
        const maxScale = 3.0;

        // Determine zoom direction based on wheel direction
        const zoomDelta = deltaY > 0 ? -zoomFactor : zoomFactor;
        const newScale = Math.max(minScale, Math.min(maxScale, this.currentScale + zoomDelta));

        if (newScale !== this.currentScale) {
            this.currentScale = newScale;
            const img = this.tooltipElement.querySelector('img');
            if (img) {
                img.style.transform = `scale(${this.currentScale})`;
            }
        }
    }

    getCurrentTooltipLink(): string | null {
        return this.currentTooltipLink;
    }

    getIsMouseOverTooltip(): boolean {
        return this.isMouseOverTooltip;
    }

    getLastLinkRect(): DOMRect | null {
        return this.lastLinkRect;
    }

    getTooltipPosition(): { x: number; y: number } | null {
        return this.tooltipPosition;
    }

    getTooltipElement(): HTMLElement {
        return this.tooltipElement;
    }

    updateSettings(maxWidth: number, maxHeight: number) {
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        
        // Update current tooltip if one is displayed
        if (this.currentTooltipLink) {
            const img = this.tooltipElement.querySelector('img');
            if (img) {
                img.style.maxWidth = `${maxWidth}px`;
                img.style.maxHeight = `${maxHeight}px`;
            }
        }
    }

    destroy() {
        document.removeEventListener('wheel', this.wheelListener);
        this.tooltipElement.remove();
    }
}

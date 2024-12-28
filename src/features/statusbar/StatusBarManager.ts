import { setIcon } from 'obsidian';
import { PreviewMode } from './types';

interface StatusBarConfig {
    enableCustomMode: boolean;
}

export class StatusBarManager {
    private statusBarItem: HTMLElement;
    private config: StatusBarConfig;
    private currentMode: PreviewMode = 'default';
    private onModeChange: (mode: PreviewMode) => void;

    constructor(
        statusBarItem: HTMLElement,
        config: StatusBarConfig,
        onModeChange: (mode: PreviewMode) => void
    ) {
        this.statusBarItem = statusBarItem;
        this.config = config;
        this.onModeChange = onModeChange;

        this.setupStatusBar();
        this.updateVisibility();
    }

    private setupStatusBar() {
        this.statusBarItem.addClass('mod-clickable');
        this.updateDisplay();
        this.statusBarItem.onclick = () => {
            this.currentMode = this.currentMode === 'default' ? 'custom' : 'default';
            this.updateDisplay();
            this.onModeChange(this.currentMode);
        };
    }

    private updateDisplay() {
        // Using image/rocket icons to represent different modes
        const icon = this.currentMode === 'default' ? 'image' : 'rocket';
        this.statusBarItem.empty();
        const iconContainer = this.statusBarItem.createSpan({ cls: 'imgur-preview-status-icon' });
        setIcon(iconContainer, icon);
        
        // Add tooltip to explain the modes
        this.statusBarItem.setAttribute('aria-label', 
            this.currentMode === 'default' ? 'Click to enter custom mode (Beta)' : 'Click to return to default mode'
        );
    }

    updateConfig(config: StatusBarConfig) {
        this.config = config;
        this.updateVisibility();
    }

    private updateVisibility() {
        if (this.config.enableCustomMode) {
            this.statusBarItem.style.display = 'flex';
        } else {
            this.statusBarItem.style.display = 'none';
            // Reset to default mode if custom mode is disabled
            if (this.currentMode === 'custom') {
                this.currentMode = 'default';
                this.onModeChange(this.currentMode);
            }
        }
    }
}

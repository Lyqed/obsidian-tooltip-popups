import { App, PluginSettingTab, Setting } from 'obsidian';
import type ImgurPreviewPlugin from '../main';

export class ImgurPreviewSettingTab extends PluginSettingTab {
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

        new Setting(containerEl)
            .setName('Remember Last Size')
            .setDesc('When enabled, new tooltips will open at the same size as the last viewed image. When disabled, tooltips always open at default size.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.rememberLastSize)
                .onChange(async (value) => {
                    this.plugin.settings.rememberLastSize = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', {
            text: 'Beta Features',
            cls: 'imgur-preview-beta-heading'
        });

        containerEl.createEl('p', {
            text: '⚠️ The following features are experimental and may change significantly in future updates.',
            cls: 'imgur-preview-beta-warning'
        });

        new Setting(containerEl)
            .setName('Enable Custom Mode (Beta)')
            .setDesc('Enables the custom mode toggle in the status bar. Custom mode functionality is still in development.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableCustomMode)
                .onChange(async (value) => {
                    this.plugin.settings.enableCustomMode = value;
                    await this.plugin.saveSettings();
                }));
    }
}

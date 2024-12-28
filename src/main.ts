import { Plugin, MarkdownPostProcessorContext, MarkdownRenderer } from 'obsidian';

export default class ImgurPreviewPlugin extends Plugin {
    async onload() {
        // Register the hover preview handler
        this.registerMarkdownPostProcessor((element: HTMLElement, context: MarkdownPostProcessorContext) => {
            // Find all links in the element
            const links = element.querySelectorAll('a');

            links.forEach((link: HTMLElement) => {
                const href = link.getAttribute('href');
                if (!href) return;

                // Check if it's an Imgur link
                if (!href.match(/https?:\/\/(?:i\.)?imgur\.com\/(?:gallery\/)?([a-zA-Z0-9]+)/)) return;

                // Create hover handler
                link.addEventListener('mouseenter', async (event: MouseEvent) => {
                    const tooltip = document.createElement('div');
                    tooltip.classList.add('imgur-preview-tooltip');
                    tooltip.style.position = 'absolute';
                    tooltip.style.zIndex = '1000';
                    tooltip.style.backgroundColor = 'var(--background-primary)';
                    tooltip.style.border = '1px solid var(--background-modifier-border)';
                    tooltip.style.borderRadius = '5px';
                    tooltip.style.padding = '5px';
                    tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

                    // Position the tooltip below the link
                    const rect = link.getBoundingClientRect();
                    tooltip.style.left = `${rect.left}px`;
                    tooltip.style.top = `${rect.bottom + 5}px`;

                    // Add loading indicator
                    tooltip.textContent = 'Loading preview...';
                    document.body.appendChild(tooltip);

                    try {
                        // Extract image ID and create direct image URL
                        const match = href.match(/https?:\/\/(?:i\.)?imgur\.com\/(?:gallery\/)?([a-zA-Z0-9]+)/);
                        if (!match) return;

                        const imageId = match[1];
                        const imageUrl = `https://i.imgur.com/${imageId}.jpg`;

                        // Create and load the image
                        const img = document.createElement('img');
                        img.style.maxWidth = '300px';
                        img.style.maxHeight = '300px';
                        img.style.display = 'block';

                        await new Promise((resolve, reject) => {
                            img.onload = resolve;
                            img.onerror = reject;
                            img.src = imageUrl;
                        });

                        tooltip.innerHTML = '';
                        tooltip.appendChild(img);
                    } catch (error) {
                        tooltip.textContent = 'Failed to load image preview';
                    }
                });

                // Remove tooltip when mouse leaves
                link.addEventListener('mouseleave', () => {
                    const tooltip = document.querySelector('.imgur-preview-tooltip');
                    if (tooltip) tooltip.remove();
                });
            });
        });
    }

    onunload() {
        // Clean up any remaining tooltips
        const tooltips = document.querySelectorAll('.imgur-preview-tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
    }
}

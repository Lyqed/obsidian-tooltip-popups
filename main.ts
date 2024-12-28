import { Plugin } from 'obsidian';

export default class ImgurPreviewPlugin extends Plugin {
	private activeTooltip: HTMLElement | null = null;

	async onload() {
		console.log('Imgur Preview Plugin: Loading plugin');
		
		// Add styles to document
		this.addStyles();
		console.log('Imgur Preview Plugin: Styles registered');

		// Register the hover preview handler for underlined links
		this.registerDomEvent(document, 'mouseover', (evt: MouseEvent) => {
			const target = evt.target as HTMLElement;
			
			// Only proceed if the target has the cm-underline class
			if (!target.classList.contains('cm-underline')) {
				return;
			}
			
			console.log('Imgur Preview Plugin: Hover event detected on underlined link');
			
			try {
				// Create tooltip container
				const tooltip = document.createElement('div');
				tooltip.classList.add('imgur-preview-tooltip');
				tooltip.style.pointerEvents = 'none';
				
				// Create and load the image
				const img = document.createElement('img');
				img.style.maxWidth = '400px';
				img.style.maxHeight = '300px';
				img.style.objectFit = 'contain';
				
				// Handle image load events
				img.onload = () => {
					console.log('Imgur Preview Plugin: Image loaded successfully');
					tooltip.classList.remove('loading');
				};
				
				img.onerror = (e) => {
					console.error('Imgur Preview Plugin: Failed to load image:', e);
					tooltip.classList.add('error');
					img.remove();
					tooltip.textContent = 'Failed to load image';
				};
				
				tooltip.classList.add('loading');
				img.src = 'https://i.imgur.com/EDx8Olk.png';
				tooltip.appendChild(img);
						
				// Position the tooltip
				const rect = target.getBoundingClientRect();
				tooltip.style.position = 'fixed';
				tooltip.style.left = `${rect.left}px`;
				tooltip.style.top = `${rect.bottom + 5}px`;
				tooltip.style.zIndex = '1000';
				
				// Remove any existing tooltip
				if (this.activeTooltip) {
					this.activeTooltip.remove();
				}
				
				document.body.appendChild(tooltip);
				console.log('Imgur Preview Plugin: Tooltip added to document');
				
				this.activeTooltip = tooltip;

				// Remove tooltip when mouse leaves the element
				const removeTooltip = () => {
					console.log('Imgur Preview Plugin: Removing tooltip');
					if (this.activeTooltip === tooltip) {
						this.activeTooltip = null;
					}
					tooltip.remove();
					target.removeEventListener('mouseout', removeTooltip);
				};
				
				target.addEventListener('mouseout', removeTooltip);
			} catch (error) {
				console.error('Imgur Preview Plugin: Error creating tooltip:', error);
			}
		});
	}

	private addStyles(): void {
		// Add the styles to the document
		const css = `
			.imgur-preview-tooltip {
				background-color: var(--background-primary);
				border: 1px solid var(--background-modifier-border);
				border-radius: 6px;
				padding: 8px;
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
				animation: fade-in 0.15s ease-in-out;
			}

			.imgur-preview-tooltip.loading::before {
				content: "Loading...";
				display: block;
				text-align: center;
				padding: 20px;
				color: var(--text-muted);
			}

			.imgur-preview-tooltip.error {
				color: var(--text-error);
				padding: 12px;
			}

			.imgur-preview-tooltip img {
				display: block;
				border-radius: 4px;
				background-color: var(--background-secondary);
			}

			@keyframes fade-in {
				from {
					opacity: 0;
					transform: translateY(4px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}
		`;
		
		const styleEl = document.createElement('style');
		styleEl.innerHTML = css;
		document.head.appendChild(styleEl);
		
		this.register(() => styleEl.remove());
	}

	onunload() {
		// Clean up any remaining tooltips
		if (this.activeTooltip) {
			this.activeTooltip.remove();
			this.activeTooltip = null;
		}
		document.querySelectorAll('.imgur-preview-tooltip').forEach(el => el.remove());
	}
}

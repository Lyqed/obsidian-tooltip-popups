export function convertToDirectImageUrl(url: string): string {
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

export function isMouseMovingTowardsTooltip(
    mouseX: number,
    mouseY: number,
    linkRect: DOMRect,
    tooltipRect: DOMRect,
    tooltipPosition: { x: number; y: number }
): boolean {
    // Calculate the center points of the link and tooltip
    const linkCenterX = linkRect.left + linkRect.width / 2;
    const linkCenterY = linkRect.top + linkRect.height / 2;
    const tooltipCenterX = tooltipRect.left + tooltipRect.width / 2;
    const tooltipCenterY = tooltipRect.top + tooltipRect.height / 2;

    // Calculate vectors
    const linkToTooltipX = tooltipCenterX - linkCenterX;
    const linkToTooltipY = tooltipCenterY - linkCenterY;
    const linkToMouseX = mouseX - linkCenterX;
    const linkToMouseY = mouseY - linkCenterY;

    // Calculate dot product
    const dotProduct = linkToTooltipX * linkToMouseX + linkToTooltipY * linkToMouseY;

    // Calculate magnitudes
    const linkToTooltipMagnitude = Math.sqrt(linkToTooltipX * linkToTooltipX + linkToTooltipY * linkToTooltipY);
    const linkToMouseMagnitude = Math.sqrt(linkToMouseX * linkToMouseX + linkToMouseY * linkToMouseY);

    // Calculate angle between vectors (in radians)
    const angle = Math.acos(dotProduct / (linkToTooltipMagnitude * linkToMouseMagnitude));

    // Convert to degrees for easier threshold comparison
    const angleInDegrees = angle * (180 / Math.PI);

    // Consider mouse moving towards tooltip if angle is less than 90 degrees
    return angleInDegrees < 90;
}
